"""
gvg_documents.py
Processamento de documentos PNCP:
- Download, detecção e conversão para Markdown com MarkItDown
- Extração de ZIP e RAR
- Resumo com OpenAI Assistants (ID via .env: GVG_SUMMARY_DOCUMENT_v1) sobre o Markdown convertido

Observações:
- Mantemos MarkItDown em subprocesso para isolar dependências opcionais e reduzir ruído no processo principal.
- Paths de trabalho vêm do .env (FILES_PATH, RESULTS_PATH, TEMP_PATH).
- Logs reduzidos via flag DOCUMENTS_DEBUG/DEBUG.
- No laboratório do v2, o pipeline oficial é sempre Markdown via MarkItDown.
"""

import os
import re
import sys
import json
import subprocess
import requests
import tempfile
import warnings
import zipfile
import gzip
import bz2
import tarfile
import shutil
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse
import unicodedata
import logging
import re
import time
from typing import Any
from dotenv import load_dotenv
from gvg_debug import debug_log as dbg
from gvg_ai_utils import ai_assistant_run_text, ai_assistant_run_with_files
from gvg_database import (
    fetch_documentos,
    storage_put_text,
    storage_get_public_url,
    upsert_user_document,
)

_OPENAI_AVAILABLE = True  # compat

warnings.filterwarnings("ignore", message=".*pin_memory.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*accelerator.*", category=UserWarning)
warnings.filterwarnings("ignore", message="Cannot set gray.*color because.*is an invalid float value", category=UserWarning)
warnings.filterwarnings("ignore", message="Cannot set gray.*", category=UserWarning)
warnings.filterwarnings("ignore", module="pdfminer.pdfinterp")
warnings.filterwarnings("ignore", module="pdfminer")
warnings.filterwarnings("ignore", category=UserWarning, module="pdfminer.*")

logging.getLogger("pdfminer").setLevel(logging.ERROR)
logging.getLogger("pdfminer.pdfinterp").setLevel(logging.ERROR)

# ========= Configuração via .env =========
load_dotenv()  # garante variáveis carregadas

# Logs de depuração (menos ruído por padrão)
_DOC_DEBUG = (os.getenv('DOCUMENTS_DEBUG', os.getenv('DEBUG', 'false')) or 'false').strip().lower() in ('1', 'true', 'yes', 'on')

def _dbg(msg: str):
    """Compat: agora apenas chama dbg diretamente (sem try/except)."""
    dbg('DOCS', msg)

# Debug helper to print Assistant output when app runs with --debug
def _dbg_assistant_output(tag: str, text: str):
    """Imprime saída do Assistant usando categoria ASSISTANT (sem try/except)."""
    dbg('ASSISTANT', f"[RESUMO]{'['+tag+']' if tag else ''}:\n{text}\n")

# Strip unwanted citation markers like 【4:5†source】 or [..source..]
def strip_citations(text: str) -> str:
    if not isinstance(text, str) or not text:
        return text
    # Remove fullwidth-bracket citations
    text = re.sub(r"【[^】]*】", "", text)
    # Remove square-bracket citations that contain the word 'source'
    text = re.sub(r"\[[^\]]*source[^\]]*\]", "", text, flags=re.IGNORECASE)
    # Collapse excessive whitespace created by removals
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

# Inferência robusta de tipo de documento (extensão)
def _infer_doc_type(name: str | None, url: str | None, default: str = 'md') -> str:
    """Inferir extensão do documento a partir do nome e/ou URL.
    Retorna sem ponto, minúsculas. Se não detectável, retorna default.
    """
    try:
        # 1) Nome do arquivo
        n = str(name or '').strip()
        ext = ''
        if n:
            ext = os.path.splitext(n)[1].lstrip('.').lower()
        # 2) URL (path)
        if not ext:
            u = str(url or '').strip()
            if u:
                try:
                    p = urlparse(u)
                    ext = os.path.splitext(os.path.basename(p.path))[1].lstrip('.').lower()
                except Exception:
                    pass
        # Normalizar
        if ext:
            return ext
        return str(default or 'md').lower()
    except Exception:
        return str(default or 'md').lower()


MARKITDOWN_SUPPORTED_EXTENSIONS = (
    ".pdf",
    ".docx",
    ".doc",
    ".pptx",
    ".ppt",
    ".xlsx",
    ".xls",
    ".csv",
    ".tsv",
    ".txt",
    ".md",
    ".markdown",
    ".html",
    ".htm",
    ".xml",
    ".json",
    ".yaml",
    ".yml",
    ".rtf",
)

OOXML_PACKAGE_EXTENSIONS = {
    "word/": ".docx",
    "ppt/": ".pptx",
    "xl/": ".xlsx",
}

DIRECT_MARKITDOWN_ARCHIVE_EXTENSIONS = {".docx", ".pptx", ".xlsx"}

ARCHIVE_CONTAINER_DISPLAY_NAMES = {
    "zip": "ZIP/PKZIP",
    "rar": "RAR",
    "gzip": "GZIP",
    "bzip2": "BZIP2",
    "tar": "TAR",
    "7z": "7Z",
}

ARCHIVE_CONTAINER_EXTENSIONS = {
    ".zip": "zip",
    ".rar": "rar",
    ".gz": "gzip",
    ".gzip": "gzip",
    ".bz2": "bzip2",
    ".tar": "tar",
    ".7z": "7z",
}


def _supported_markitdown_extensions_label() -> str:
    return ", ".join(ext.lstrip(".") for ext in MARKITDOWN_SUPPORTED_EXTENSIONS)


def _content_detected_extension(file_path: str) -> str:
    try:
        detected_name = detect_file_type_by_content_v3(file_path)
        return os.path.splitext(detected_name)[1].lstrip('.').lower()
    except Exception:
        return ""


def _infer_effective_doc_type(name: str | None, source: str | None, default: str = '') -> str:
    ext = _infer_doc_type(name, source, default='')
    if ext:
        normalized_ext = f".{ext.lower()}"
        if normalized_ext in MARKITDOWN_SUPPORTED_EXTENSIONS:
            return ext
        if normalized_ext in DIRECT_MARKITDOWN_ARCHIVE_EXTENSIONS:
            return ext
        if normalized_ext in ARCHIVE_CONTAINER_EXTENSIONS:
            return ext
    if source and os.path.exists(source):
        detected_ext = _content_detected_extension(source)
        if detected_ext:
            return detected_ext
    return ext or str(default or '').lower()


def _is_markitdown_supported(name: str | None, source: str | None = None) -> bool:
    ext = _infer_effective_doc_type(name, source, default="")
    if not ext:
        return False
    return f".{ext.lower()}" in MARKITDOWN_SUPPORTED_EXTENSIONS


def _build_markitdown_input_copy(file_path: str, original_filename: str | None):
    effective_ext = _infer_effective_doc_type(original_filename, file_path, default='')
    if not effective_ext:
        return file_path, (original_filename or os.path.basename(file_path)), None

    current_ext = os.path.splitext(file_path)[1].lstrip('.').lower()
    resolved_name = original_filename or os.path.basename(file_path)
    if current_ext == effective_ext and resolved_name.lower().endswith(f'.{effective_ext}'):
        return file_path, resolved_name, None

    base_name = Path(resolved_name).stem or Path(file_path).stem or 'documento'
    safe_base = create_safe_filename(base_name) or f"documento_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    temp_copy_path = os.path.join(
        tempfile.gettempdir(),
        f"markitdown_input_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{safe_base}.{effective_ext}",
    )
    shutil.copy2(file_path, temp_copy_path)
    return temp_copy_path, f"{base_name}.{effective_ext}", temp_copy_path


def _safe_archive_member_parts(member_name: str) -> tuple[str, ...] | None:
    cleaned_name = str(member_name or '').replace('\\', '/').strip()
    if not cleaned_name or cleaned_name.endswith('/'):
        return None
    member_path = Path(cleaned_name)
    if member_path.is_absolute():
        return None
    parts = tuple(part for part in member_path.parts if part not in ('', '.'))
    if not parts or any(part == '..' for part in parts):
        return None
    return parts


def _create_archive_extract_dir(prefix: str) -> str:
    extract_dir = os.path.join(
        tempfile.gettempdir(),
        f"{prefix}_extract_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
    )
    os.makedirs(extract_dir, exist_ok=True)
    return extract_dir


def _collect_supported_files_from_directory(extract_dir: str):
    extracted_files = []
    for root, dirs, files in os.walk(extract_dir):
        dirs[:] = [directory for directory in dirs if directory != '__MACOSX']
        for file_name in files:
            file_path = os.path.join(root, file_name)
            if not _is_markitdown_supported(file_name, file_path):
                continue
            try:
                file_size = os.path.getsize(file_path) / (1024 * 1024)
            except Exception:
                file_size = 0.0
            dbg('DOCS', f"   📄 Extraído: {file_name} ({file_size:.2f} MB)")
            extracted_files.append((file_path, file_name))
    return extracted_files


def detect_archive_container_type(file_path: str, original_filename: str | None = None) -> str | None:
    try:
        inferred_extension = f".{_infer_doc_type(original_filename, file_path, default='')}".lower()
        if inferred_extension in DIRECT_MARKITDOWN_ARCHIVE_EXTENSIONS:
            return None

        detected_package_extension = _detect_ooxml_package_extension(file_path)
        if detected_package_extension in DIRECT_MARKITDOWN_ARCHIVE_EXTENSIONS:
            return None

        archive_type = ARCHIVE_CONTAINER_EXTENSIONS.get(inferred_extension)
        if archive_type:
            return archive_type

        with open(file_path, 'rb') as handle:
            header = handle.read(560)

        if header.startswith((b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08')):
            return 'zip'
        if header.startswith(b'Rar!'):
            return 'rar'
        if header.startswith(b'\x1f\x8b'):
            return 'gzip'
        if header.startswith(b'BZh'):
            return 'bzip2'
        if header.startswith(b'\x37\x7a\xbc\xaf\x27\x1c'):
            return '7z'
        if len(header) > 262 and header[257:262] == b'ustar':
            return 'tar'
        try:
            if tarfile.is_tarfile(file_path):
                return 'tar'
        except Exception:
            pass
    except Exception:
        return None
    return None


def _extract_zip_archive(zip_path: str, extract_dir: str):
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        file_list = zip_ref.namelist()
        dbg('DOCS', f"   📦 Arquivos no ZIP/PKZIP: {len(file_list)}")
        for member_name in file_list:
            if member_name.startswith('__MACOSX/'):
                continue
            safe_parts = _safe_archive_member_parts(member_name)
            if not safe_parts:
                continue
            destination_path = os.path.join(extract_dir, *safe_parts)
            os.makedirs(os.path.dirname(destination_path), exist_ok=True)
            with zip_ref.open(member_name, 'r') as source_handle, open(destination_path, 'wb') as target_handle:
                shutil.copyfileobj(source_handle, target_handle)


def _extract_tar_archive(tar_path: str, extract_dir: str):
    with tarfile.open(tar_path, 'r:*') as tar_ref:
        members = tar_ref.getmembers()
        dbg('DOCS', f"   📦 Arquivos no TAR: {len(members)}")
        for member in members:
            if not member.isfile():
                continue
            safe_parts = _safe_archive_member_parts(member.name)
            if not safe_parts:
                continue
            destination_path = os.path.join(extract_dir, *safe_parts)
            os.makedirs(os.path.dirname(destination_path), exist_ok=True)
            source_handle = tar_ref.extractfile(member)
            if source_handle is None:
                continue
            with source_handle, open(destination_path, 'wb') as target_handle:
                shutil.copyfileobj(source_handle, target_handle)


def _extract_gzip_payload(gzip_path: str, extract_dir: str) -> str:
    source_name = Path(gzip_path).name
    if source_name.lower().endswith('.gz'):
        output_name = Path(source_name).stem or 'arquivo_descompactado'
    else:
        output_name = f"{source_name}.out" if source_name else 'arquivo_descompactado.out'
    output_path = os.path.join(extract_dir, output_name)
    with gzip.open(gzip_path, 'rb') as source_handle, open(output_path, 'wb') as target_handle:
        shutil.copyfileobj(source_handle, target_handle)
    return output_path


def _extract_bzip2_payload(bz2_path: str, extract_dir: str) -> str:
    source_name = Path(bz2_path).name
    if source_name.lower().endswith('.bz2'):
        output_name = Path(source_name).stem or 'arquivo_descompactado'
    else:
        output_name = f"{source_name}.out" if source_name else 'arquivo_descompactado.out'
    output_path = os.path.join(extract_dir, output_name)
    with bz2.open(bz2_path, 'rb') as source_handle, open(output_path, 'wb') as target_handle:
        shutil.copyfileobj(source_handle, target_handle)
    return output_path


def _extract_7z_with_binary(archive_path: str, extract_dir: str):
    seven = _discover_7z_exe()
    if not seven:
        raise RuntimeError("7-Zip não encontrado no ambiente atual.")
    proc = subprocess.run(
        [seven, 'x', '-y', f"-o{extract_dir}", archive_path],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if proc.returncode != 0:
        err = proc.stderr.strip() or proc.stdout.strip()
        raise RuntimeError(err[:400] or 'Falha ao extrair com 7-Zip.')


def extract_all_supported_files_from_archive(archive_path: str, original_filename: str | None = None):
    archive_type = detect_archive_container_type(archive_path, original_filename)
    if not archive_type:
        return False, [], None, "Arquivo compactado não reconhecido"

    extract_dir = _create_archive_extract_dir(archive_type)
    try:
        if archive_type == 'zip':
            _extract_zip_archive(archive_path, extract_dir)
        elif archive_type == 'rar':
            try:
                import rarfile  # type: ignore

                with rarfile.RarFile(archive_path) as rar_ref:
                    names = rar_ref.namelist()
                    dbg('DOCS', f"   📦 Arquivos no RAR: {len(names)}")
                    for member_name in names:
                        safe_parts = _safe_archive_member_parts(member_name)
                        if not safe_parts:
                            continue
                        destination_path = os.path.join(extract_dir, *safe_parts)
                        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
                        with rar_ref.open(member_name) as source_handle, open(destination_path, 'wb') as target_handle:
                            shutil.copyfileobj(source_handle, target_handle)
            except Exception as rar_error:
                dbg('DOCS', f"[RAR] rarfile indisponível/erro: {rar_error}")
                _extract_7z_with_binary(archive_path, extract_dir)
        elif archive_type == 'gzip':
            decompressed_path = _extract_gzip_payload(archive_path, extract_dir)
            if detect_archive_container_type(decompressed_path, os.path.basename(decompressed_path)) == 'tar':
                nested_extract_dir = os.path.join(extract_dir, 'tar_payload')
                os.makedirs(nested_extract_dir, exist_ok=True)
                _extract_tar_archive(decompressed_path, nested_extract_dir)
        elif archive_type == 'bzip2':
            decompressed_path = _extract_bzip2_payload(archive_path, extract_dir)
            if detect_archive_container_type(decompressed_path, os.path.basename(decompressed_path)) == 'tar':
                nested_extract_dir = os.path.join(extract_dir, 'tar_payload')
                os.makedirs(nested_extract_dir, exist_ok=True)
                _extract_tar_archive(decompressed_path, nested_extract_dir)
        elif archive_type == 'tar':
            _extract_tar_archive(archive_path, extract_dir)
        elif archive_type == '7z':
            dbg('DOCS', '   📦 Arquivo 7Z detectado. Extraindo com 7-Zip...')
            _extract_7z_with_binary(archive_path, extract_dir)
        else:
            return False, [], archive_type, f"Tipo de arquivo compactado não suportado: {archive_type}"

        extracted_files = _collect_supported_files_from_directory(extract_dir)
        if not extracted_files:
            display_name = ARCHIVE_CONTAINER_DISPLAY_NAMES.get(archive_type, archive_type.upper())
            return False, [], archive_type, f"Nenhum arquivo suportado encontrado no {display_name}"

        dbg('DOCS', f"   ✅ Total extraído: {len(extracted_files)} arquivo(s)")
        return True, extracted_files, archive_type, None
    except Exception as exc:
        return False, [], archive_type, f"Erro ao extrair {ARCHIVE_CONTAINER_DISPLAY_NAMES.get(archive_type, archive_type.upper())}: {exc}"


def _process_archive_contents_to_markdown(extracted_files_list, archive_type, final_filename, doc_url, pncp_data):
    display_name = ARCHIVE_CONTAINER_DISPLAY_NAMES.get(archive_type, archive_type.upper())
    all_markdown_content = f"# Documento PNCP: {final_filename} ({display_name} com arquivos extraídos)\n\n"
    all_markdown_content += f"**Arquivo original:** `{final_filename}`  \n"
    all_markdown_content += f"**Processado em:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n"
    all_markdown_content += f"**Ferramenta:** MarkItDown + OpenAI GPT-4o  \n"
    all_markdown_content += f"**Arquivos extraídos:** {len(extracted_files_list)}  \n\n"
    all_markdown_content += "---\n\n"

    processed_files = []
    doc_counter = 0
    for extracted_path, original_name in extracted_files_list:
        dbg('DOCS', f"📄 Processando arquivo extraído: {original_name}")
        if not os.path.exists(extracted_path):
            dbg('DOCS', f"❌ Arquivo extraído não encontrado: {original_name}")
            continue

        try:
            file_size_extracted = os.path.getsize(extracted_path) / (1024 * 1024)
        except Exception:
            file_size_extracted = 0.0
        dbg('DOCS', f"MarkItDown: arquivo extraído size={file_size_extracted:.2f}MB name='{original_name}'")
        file_success, file_markdown, file_error = convert_document_to_markdown(extracted_path, original_name)
        if file_success:
            doc_counter += 1
            all_markdown_content += f"## 📄 Arquivo: {original_name}\n\n"
            all_markdown_content += f"**Tamanho:** {file_size_extracted:.2f} MB  \n"
            all_markdown_content += f"**Status:** ✅ Processado com sucesso  \n\n"
            all_markdown_content += "### Conteúdo:\n\n"
            all_markdown_content += file_markdown
            all_markdown_content += "\n\n---\n\n"
            if GVG_SAVE_DOCUMENTS:
                try:
                    pncp_raw = (pncp_data or {}).get('numero_controle_pncp') or (pncp_data or {}).get('id')
                    pncp_raw = str(pncp_raw) if pncp_raw else None
                    pncp_key = _sanitize_pncp_id(pncp_raw)
                    if pncp_key:
                        key = f"DOCUMENTS/PNCP_{pncp_key}_DOC{doc_counter}.md"
                        ok, public_url, size_bytes = storage_put_text('govgo', key, file_markdown)
                        dbg('DOCS', f"upload file ok={ok} key='{key}' size={size_bytes} url='{public_url}' pncp_raw='{pncp_raw}' pncp_key='{pncp_key}'")
                        if ok and public_url:
                            uid_local = (pncp_data or {}).get('uid') or (pncp_data or {}).get('user_id')
                            if uid_local and pncp_raw:
                                doc_type = _infer_effective_doc_type(original_name, extracted_path, default=None)
                                ok_db = upsert_user_document(str(uid_local), str(pncp_raw), original_name, doc_type, public_url, size_bytes)
                                dbg('DOCS', f"db insert user_documents ok={ok_db} uid={uid_local} pncp_raw='{pncp_raw}' name='{original_name}'")
                except Exception as upload_error:
                    dbg('DOCS', f"upload/db erro arquivo='{original_name}' err={upload_error}")
            processed_files.append({'name': original_name, 'success': True})
            dbg('DOCS', f"✅ {original_name} processado com sucesso")
        else:
            all_markdown_content += f"## ❌ Arquivo: {original_name}\n\n"
            all_markdown_content += f"**Tamanho:** {file_size_extracted:.2f} MB  \n"
            all_markdown_content += f"**Status:** ❌ Erro no processamento  \n"
            all_markdown_content += f"**Erro:** {file_error}  \n\n"
            all_markdown_content += "---\n\n"
            processed_files.append({'name': original_name, 'success': False})
            dbg('DOCS', f"❌ Erro em {original_name}: {file_error}")

    try:
        if extracted_files_list:
            extract_dir = os.path.dirname(extracted_files_list[0][0])
            if os.path.exists(extract_dir):
                shutil.rmtree(extract_dir)
    except Exception as cleanup_error:
        dbg('DOCS', f"cleanup archive erro: {cleanup_error}")

    successful_files = [processed_file for processed_file in processed_files if processed_file['success']]
    if not successful_files:
        return False, None, None, f"Erro: Nenhum arquivo do {display_name} foi processado com sucesso"

    updated_filename = f"{final_filename} ({len(successful_files)}-{len(processed_files)} arquivos)"
    dbg('DOCS', f"✅ {display_name} processado: {len(successful_files)}/{len(processed_files)} arquivos com sucesso")
    return True, all_markdown_content, updated_filename, None


def _detect_ooxml_package_extension(file_path: str) -> str | None:
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            names = [name.lower() for name in zip_ref.namelist()]
    except Exception:
        return None

    for prefix, extension in OOXML_PACKAGE_EXTENSIONS.items():
        if any(name.startswith(prefix) for name in names):
            return extension
    return None


def _markdown_already_has_table(markdown_content: str) -> bool:
    text = str(markdown_content or "")
    return bool(re.search(r"(?m)^\|(?:[^\n]*\|)+\s*$", text))


def _normalize_table_cell(value: Any) -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return text.replace("|", r"\|")


def _render_table_as_markdown(table_rows: list[list[Any]]) -> str:
    normalized_rows = []
    for row in table_rows or []:
        normalized = [_normalize_table_cell(cell) for cell in row or []]
        if any(cell for cell in normalized):
            normalized_rows.append(normalized)

    if len(normalized_rows) < 2:
        return ""

    column_count = max(len(row) for row in normalized_rows)
    if column_count < 2:
        return ""

    padded_rows = [row + [""] * (column_count - len(row)) for row in normalized_rows]
    header = padded_rows[0]
    body = padded_rows[1:]
    separator = ["---"] * column_count

    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(separator) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def _extract_pdf_tables_markdown(file_path: str) -> str:
    try:
        import pdfplumber
    except ImportError:
        dbg('DOCS', 'PDF tables: pdfplumber nao instalado; mantendo apenas o texto do MarkItDown.')
        return ""

    page_sections = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                page_tables = []
                for table in page.extract_tables() or []:
                    rendered = _render_table_as_markdown(table)
                    if rendered:
                        page_tables.append(rendered)
                if page_tables:
                    page_sections.append(
                        f"## Tabelas extraidas da pagina {page_number}\n\n" + "\n\n".join(page_tables)
                    )
    except Exception as exc:
        dbg('DOCS', f'PDF tables: erro ao extrair tabelas com pdfplumber: {exc}')
        return ""

    return "\n\n".join(page_sections).strip()


def _augment_markdown_with_pdf_tables(file_path: str, original_filename: str | None, markdown_content: str) -> str:
    if _infer_doc_type(original_filename, file_path, default="") != "pdf":
        return str(markdown_content or "")
    if _markdown_already_has_table(markdown_content):
        return str(markdown_content or "")

    tables_markdown = _extract_pdf_tables_markdown(file_path)
    if not tables_markdown:
        return str(markdown_content or "")

    base_markdown = str(markdown_content or "").strip()
    if not base_markdown:
        return tables_markdown
    return base_markdown + "\n\n---\n\n" + tables_markdown


def _strip_basic_markdown_formatting(text: str) -> str:
    cleaned = str(text or "")
    cleaned = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", r"\1", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", cleaned)
    cleaned = cleaned.replace("**", "").replace("__", "").replace("`", "")
    return cleaned.strip()


def _flatten_markdown_table_block(table_lines: list[str]) -> list[str]:
    rows: list[list[str]] = []
    for line in table_lines:
        stripped = line.strip()
        if re.match(r"^\|[\s:\-]+\|$", stripped):
            continue
        cells = [_strip_basic_markdown_formatting(cell.strip()) for cell in stripped.strip("|").split("|")]
        if any(cells):
            rows.append(cells)

    if not rows:
        return []
    if len(rows) == 1:
        return ["; ".join(cell for cell in rows[0] if cell)]

    header = rows[0]
    flattened_rows = []
    for row in rows[1:]:
        pairs = []
        for index, cell in enumerate(row):
            if not cell:
                continue
            label = header[index] if index < len(header) else ""
            if label and cell != label:
                pairs.append(f"{label}: {cell}")
            else:
                pairs.append(cell)
        if pairs:
            flattened_rows.append("; ".join(pairs))

    if flattened_rows:
        return flattened_rows
    return ["; ".join(cell for cell in header if cell)]


def _flatten_markdown_tables(markdown_content: str) -> str:
    output_lines = []
    table_block = []

    for raw_line in str(markdown_content or "").splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            table_block.append(raw_line)
            continue

        if table_block:
            output_lines.extend(_flatten_markdown_table_block(table_block))
            table_block = []
        output_lines.append(raw_line)

    if table_block:
        output_lines.extend(_flatten_markdown_table_block(table_block))

    return "\n".join(output_lines)


def _normalize_office_markdown(file_path: str, original_filename: str | None, markdown_content: str) -> str:
    extension = _infer_doc_type(original_filename, file_path, default="")
    if extension not in {"docx", "pptx"}:
        return str(markdown_content or "")

    normalized = str(markdown_content or "")
    normalized = re.sub(r"(?m)^<!--.*?-->\s*$\n?", "", normalized)
    normalized = re.sub(r"(?m)^!\[[^\]]*\]\([^\)]+\)\s*$\n?", "", normalized)
    normalized = _flatten_markdown_tables(normalized)
    normalized = re.sub(r"(?m)^---\s*$\n?", "", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _resolve_local_source_path(doc_source: str) -> Path | None:
    text = str(doc_source or "").strip()
    if not text:
        return None
    if text.startswith("file://"):
        parsed = urlparse(text)
        raw_path = unquote(parsed.path or "")
        if raw_path.startswith("/") and len(raw_path) > 2 and raw_path[2] == ":":
            raw_path = raw_path[1:]
        candidate = Path(raw_path)
        return candidate if candidate.exists() else None
    if text.startswith(("http://", "https://")):
        return None
    candidate = Path(text)
    return candidate if candidate.exists() else None

# Diretórios de trabalho
def _get_base_path() -> str:
    return os.getenv('BASE_PATH') or str(Path(__file__).resolve().parents[2] / 'data')


def _get_files_path() -> str:
    return os.getenv('FILES_PATH') or str(Path(_get_base_path()) / 'files')


def _get_summary_path() -> str:
    return os.getenv('RESULTS_PATH') or str(Path(_get_base_path()) / 'reports')


def _get_temp_path() -> str:
    return os.getenv('TEMP_PATH') or tempfile.gettempdir()

# Flags de controle (ambas lidas do .env com padrão true)
def _truthy(v: str | None, default=True) -> bool:
    if v is None:
        return bool(default)
    return str(v).strip().lower() in ("1","true","yes","on")

# No laboratorio do v2 o fluxo oficial e sempre Markdown via MarkItDown.
GVG_USE_MARKDOWN_SUMMARY = True

def set_markdown_enabled(enabled: bool):
    global GVG_USE_MARKDOWN_SUMMARY
    if not enabled:
        dbg('DOCS', 'Pipeline MarkItDown-only ativo; pedido para desabilitar Markdown foi ignorado.')
    GVG_USE_MARKDOWN_SUMMARY = True

# Se true: salva documentos .md no bucket e registra em BD
GVG_SAVE_DOCUMENTS = _truthy(os.getenv('GVG_SAVE_DOCUMENTS', 'true'), default=True)

_ASSISTANT_SUMMARY_ID = os.getenv('GVG_SUMMARY_DOCUMENT_v1')

def create_files_directory():
    Path(_get_files_path()).mkdir(parents=True, exist_ok=True)
    Path(_get_summary_path()).mkdir(parents=True, exist_ok=True)

def _sanitize_pncp_id(p: str | None) -> str | None:
    """Sanitiza PNCP preservando hífens e trocando '/' por '-'. Remove demais caracteres.
    Ex.: '07954480000179-1-019938/2025' -> '07954480000179-1-019938-2025'."""
    if not p:
        return None
    s = str(p).strip()
    # Troca '/' por '-'
    s = s.replace('/', '-')
    # Mantém apenas dígitos e '-'
    s = re.sub(r"[^0-9\-]+", "", s)
    # Normaliza múltiplos hífens consecutivos
    s = re.sub(r"-{2,}", "-", s).strip('-')
    return s if s else None

def download_document(doc_url, timeout=30):
    try:
        if not doc_url or not doc_url.strip():
            return False, None, None, "URL não fornecida"
        local_source = _resolve_local_source_path(doc_url)
        if local_source is not None:
            filename = local_source.name
            temp_dir = _get_temp_path() or tempfile.gettempdir()
            try:
                os.makedirs(temp_dir, exist_ok=True)
            except Exception as e:
                _dbg(f"[DOCS] TEMP_PATH inválido ('{temp_dir}'): {e}; usando temp padrão do sistema.")
                temp_dir = tempfile.gettempdir()
                os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, f"pncp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}")
            shutil.copy2(str(local_source), temp_path)
            return True, temp_path, filename, None
        if not doc_url.startswith(('http://', 'https://')):
            return False, None, None, "Fonte inválida. Use URL http/https, file:// ou caminho local existente."
        response = requests.get(doc_url, timeout=timeout, stream=True)
        response.raise_for_status()
        parsed_url = urlparse(doc_url)
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            content_type = response.headers.get('content-type', '').lower()
            content_disposition = response.headers.get('content-disposition', '').lower()
            if 'filename=' in content_disposition:
                try:
                    cd_filename = content_disposition.split('filename=')[1].strip('"\'')
                    if '.' in cd_filename:
                        filename = cd_filename
                except:
                    pass
            if not filename or '.' not in filename:
                if 'pdf' in content_type:
                    filename = "documento.pdf"
                elif 'zip' in content_type or 'compressed' in content_type:
                    filename = "documento.zip"
                elif 'word' in content_type or 'msword' in content_type:
                    filename = "documento.docx"
                elif 'excel' in content_type or 'spreadsheet' in content_type:
                    filename = "documento.xlsx"
                elif 'text' in content_type:
                    filename = "documento.txt"
                elif 'xml' in content_type:
                    filename = "documento.xml"
                elif 'json' in content_type:
                    filename = "documento.json"
                else:
                    filename = "documento_temporario"
        temp_dir = _get_temp_path() or tempfile.gettempdir()
        try:
            # Garantir diretório temporário existente; se falhar, usar temp do sistema
            os.makedirs(temp_dir, exist_ok=True)
        except Exception as e:
            _dbg(f"[GSB][RESUMO] TEMP_PATH inválido ('{temp_dir}'): {e}; usando temp padrão do sistema.")
            temp_dir = tempfile.gettempdir()
            os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"pncp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}")
        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        if filename == "documento_temporario":
            filename = detect_file_type_by_content_v3(temp_path)
            if filename != "documento_temporario":
                new_temp_path = os.path.join(temp_dir, f"pncp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}")
                os.rename(temp_path, new_temp_path)
                temp_path = new_temp_path
        return True, temp_path, filename, None
    except requests.exceptions.RequestException as e:
        return False, None, None, f"Erro de conexão: {str(e)}"
    except Exception as e:
        return False, None, None, f"Erro inesperado: {str(e)}"

def convert_document_to_markdown(file_path, original_filename):
    """Converte documentos suportados para Markdown usando a API documentada do MarkItDown."""
    temp_copy_path = None
    try:
        resolved_name = original_filename or os.path.basename(file_path)
        if not _is_markitdown_supported(resolved_name, file_path):
            return False, None, (
                "Tipo de arquivo não suportado pelo pipeline MarkItDown-only. "
                f"Suportados: {_supported_markitdown_extensions_label()}"
            )
        processing_path, resolved_name, temp_copy_path = _build_markitdown_input_copy(file_path, resolved_name)
        dbg('DOCS', f"MarkItDown: start original='{resolved_name}' path='{processing_path}'")
        code = (
            "import json, sys\n"
            "sys.stdout.reconfigure(encoding='utf-8')\n"
            "from markitdown import MarkItDown\n"
            "fp = sys.argv[1]\n"
            "md = MarkItDown(enable_plugins=False)\n"
            "convert_local = getattr(md, 'convert_local', None)\n"
            "result = convert_local(fp) if callable(convert_local) else md.convert(fp)\n"
            "markdown = getattr(result, 'markdown', None) or getattr(result, 'text_content', None) or ''\n"
            "title = getattr(result, 'title', None)\n"
            "print(json.dumps({'ok': True, 'markdown': markdown, 'title': title}, ensure_ascii=False))\n"
        )
        try:
            subprocess_env = dict(os.environ)
            subprocess_env["PYTHONIOENCODING"] = "utf-8"
            subprocess_env["PYTHONUTF8"] = "1"
            proc = subprocess.run(
                [sys.executable, "-c", code, processing_path],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=subprocess_env,
                timeout=180,
            )
        except Exception as e:
            return False, None, f"Falha ao executar subprocesso MarkItDown: {e}"
        if proc.returncode != 0:
            err = proc.stderr.strip() or proc.stdout.strip()
            dbg('DOCS', f"Subprocesso MarkItDown falhou rc={proc.returncode}: {err[:300]}")
            return False, None, f"MarkItDown falhou no subprocesso: {err}" if err else "MarkItDown falhou no subprocesso"
        try:
            payload = json.loads(proc.stdout.strip())
            if payload.get('ok') and 'markdown' in payload:
                md = str(payload['markdown'] or '')
                dbg('DOCS', f"MarkItDown: ok original='{resolved_name}' md_len={len(md) if isinstance(md,str) else 'N/A'}")
                return True, md, None
        except Exception as e:
            return False, None, f"Saída inválida do subprocesso MarkItDown: {e}"
        dbg('DOCS', f"MarkItDown: saída inesperada original='{resolved_name}'")
        return False, None, "Saída inesperada do subprocesso MarkItDown"
    except ImportError:
        dbg('DOCS', "ImportError em MarkItDown - pacote não instalado")
        return False, None, "MarkItDown não está instalado. Execute: pip install markitdown"
    except Exception as e:
        dbg('DOCS', f"MarkItDown: exceção original='{resolved_name if 'resolved_name' in locals() else original_filename}' err={e}")
        return False, None, f"Erro na conversão: {str(e)}"
    finally:
        try:
            if temp_copy_path and os.path.exists(temp_copy_path):
                os.remove(temp_copy_path)
        except Exception:
            pass

def save_markdown_file(content, original_filename, doc_url, timestamp=None):
    try:
        create_files_directory()
        files_path = _get_files_path()
        if not timestamp:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_name = os.path.splitext(original_filename)[0]
        safe_name = create_safe_filename(base_name)
        if not safe_name:
            safe_name = f"documento_{timestamp}"
        markdown_filename = f"MARKITDOWN_{safe_name}_{timestamp}.md"
        markdown_path = os.path.join(files_path, markdown_filename)
        if os.path.exists(markdown_path):
            base, ext = os.path.splitext(markdown_filename)
            markdown_filename = f"{base}_{datetime.now().strftime('%H%M%S')}{ext}"
            markdown_path = os.path.join(files_path, markdown_filename)
        content_with_url = f"""<!-- URL Original: {doc_url} -->

{content}
"""
        # utf-8-sig para compatibilidade com Notepad/Windows (acento correto)
        with open(markdown_path, 'w', encoding='utf-8-sig') as f:
            f.write(content_with_url)
        return True, markdown_path, None
    except Exception as e:
        return False, None, f"Erro ao salvar arquivo: {str(e)}"

def save_summary_file(summary_content, original_filename, doc_url, timestamp=None, pncp_data=None, method_label: str = "MarkItDown + Assistant", markdown_filename: str | None = None):
    """Save ONLY the assistant's output to the summary file (no headers or extras)."""
    try:
        create_files_directory()
        summary_path_root = _get_summary_path()
        if not timestamp:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_name = Path(original_filename).stem
        safe_name = create_safe_filename(base_name)
        if not safe_name:
            safe_name = f"documento_{timestamp}"
        summary_filename = f"SUMMARY_{safe_name}_{timestamp}.md"
        summary_full_path = os.path.join(summary_path_root, summary_filename)
        content = summary_content or ""
        with open(summary_full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, summary_full_path, None
    except Exception as e:
        return False, None, str(e)


def _build_process_output(
    *,
    summary: str = "",
    extracted_text: str = "",
    markdown_path: str | None = None,
    summary_path: str | None = None,
    error: str | None = None,
):
    return {
        "summary": str(summary or ""),
        "extracted_text": str(extracted_text or ""),
        "markdown_path": str(markdown_path or ""),
        "summary_path": str(summary_path or ""),
        "conversion_engine": "markitdown",
        "pipeline_mode": "markitdown_only",
        "error": str(error or ""),
    }

def generate_document_summary(markdown_content, max_tokens=None, pncp_data=None):
    """Resumo via OpenAI Assistants (ID do .env: GVG_SUMMARY_DOCUMENT_v1) usando wrappers centrais."""
    try:
        _dbg("[GSB][RESUMO] generate_document_summary() via Assistants...")
        if not _ASSISTANT_SUMMARY_ID:
            return "OpenAI/Assistant não configurado (verifique GVG_SUMMARY_DOCUMENT_v1 no .env)."
        # Truncagem conservadora
        content = markdown_content or ""
        if len(content) > 100_000:
            content = content[:100_000] + "\n\n...(documento truncado)"
        # Contexto compacto
        ctx_lines = []
        if isinstance(pncp_data, dict) and pncp_data:
            try:
                ctx_lines.append(f"ID: {pncp_data.get('id')}")
                ctx_lines.append(f"Órgão: {pncp_data.get('orgao')} | Local: {pncp_data.get('municipio')}/{pncp_data.get('uf')}")
                ctx_lines.append(f"Datas: Inc {pncp_data.get('data_inclusao')} | Ab {pncp_data.get('data_abertura')} | Enc {pncp_data.get('data_encerramento')}")
                ctx_lines.append(f"Modal/Disp: {pncp_data.get('modalidade_id')} - {pncp_data.get('modalidade_nome')} | {pncp_data.get('disputa_id')} - {pncp_data.get('disputa_nome')}")
            except Exception:
                pass
        ctx_block = ("\n".join([l for l in ctx_lines if l])) if ctx_lines else ""
        anti_citation = (
            "INSTRUÇÕES ADICIONAIS IMPORTANTES:\n"
            "- NUNCA inclua citações, referências ou marcas de fonte.\n"
            "- Remova padrões como 【4:5†source】, [1], [1:2], [qualquer-coisa†source] ou links.\n"
            "- Gere apenas o resumo no formato especificado, sem referências.\n\n"
        )
        user_message = (
            (("Contexto PNCP:\n" + ctx_block + "\n\n") if ctx_block else "")
            + anti_citation
            + "Documento (Markdown):\n\n" + content
        )
        out = ai_assistant_run_text(_ASSISTANT_SUMMARY_ID, user_message, context_key='doc_summary', timeout=180)
        out = strip_citations(out or "")
        return out

    except Exception as e:
        return f"Erro ao gerar resumo (Assistants): {str(e)}"

def generate_document_summary_from_files(file_paths: list[str], max_tokens=None, pncp_data=None):
    """Helper legado para envio direto de arquivos ao Assistant. Nao usado no laboratorio v2."""
    try:
        if not _ASSISTANT_SUMMARY_ID:
            return "OpenAI/Assistant não configurado (verifique GVG_SUMMARY_DOCUMENT_v1 no .env)."
        # Context block (compact)
        ctx_lines = []
        if isinstance(pncp_data, dict) and pncp_data:
            try:
                ctx_lines.append(f"ID: {pncp_data.get('id')}")
                ctx_lines.append(f"Órgão: {pncp_data.get('orgao')} | Local: {pncp_data.get('municipio')}/{pncp_data.get('uf')}")
                ctx_lines.append(f"Datas: Inc {pncp_data.get('data_inclusao')} | Ab {pncp_data.get('data_abertura')} | Enc {pncp_data.get('data_encerramento')}")
                ctx_lines.append(f"Modal/Disp: {pncp_data.get('modalidade_id')} - {pncp_data.get('modalidade_nome')} | {pncp_data.get('disputa_id')} - {pncp_data.get('disputa_nome')}")
            except Exception:
                pass
        ctx_block = ("\n".join([l for l in ctx_lines if l])) if ctx_lines else ""
        anti_citation = (
            "INSTRUÇÕES ADICIONAIS IMPORTANTES:\n"
            "- NUNCA inclua citações, referências ou marcas de fonte.\n"
            "- Remova padrões como 【4:5†source】, [1], [1:2], [qualquer-coisa†source] ou links.\n"
            "- Gere apenas o resumo no formato especificado, sem referências.\n\n"
        )
        user_message = (
            (("Contexto PNCP:\n" + ctx_block + "\n\n") if ctx_block else "")
            + anti_citation
            + "Documentos anexados. Gerar um resumo executivo com itens de atenção."
        )
        out = ai_assistant_run_with_files(_ASSISTANT_SUMMARY_ID, list(file_paths or []), user_message, timeout=180)
        out = strip_citations(out or "")
        return out

    except Exception as e:
        return f"Erro ao gerar resumo (Assistants arquivos): {str(e)}"

def cleanup_temp_file(temp_path):
    try:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
    except:
        pass

def detect_file_type_by_content_v3(filepath: str) -> str:
    try:
        with open(filepath, 'rb') as f:
            header = f.read(512)
        if header.startswith(b'%PDF'):
            return "documento.pdf"
        elif header.startswith(b'PK\x03\x04') or header.startswith(b'PK\x05\x06') or header.startswith(b'PK\x07\x08'):
            ooxml_extension = _detect_ooxml_package_extension(filepath)
            if ooxml_extension is not None:
                return f"documento{ooxml_extension}"
            return "documento.zip"
        elif header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
            return "documento.doc"
        elif header.startswith(b'<?xml'):
            return "documento.xml"
        elif header.startswith(b'{') or header.startswith(b'['):
            return "documento.json"
        elif header.startswith(b'\xff\xd8\xff'):
            return "documento.jpg"
        elif header.startswith(b'\x89PNG'):
            return "documento.png"
        elif header.startswith(b'GIF8'):
            return "documento.gif"
        elif header.startswith(b'RIFF') and b'WEBP' in header:
            return "documento.webp"
        elif header.startswith(b'\x00\x00\x00\x20ftyp'):
            return "documento.mp4"
        elif header.startswith(b'Rar!'):
            return "documento.rar"
        elif header.startswith(b'\x1f\x8b'):
            return "documento.gz"
        elif header.startswith(b'BZh'):
            return "documento.bz2"
        elif header.startswith(b'\x37\x7a\xbc\xaf\x27\x1c'):
            return "documento.7z"
        else:
            try:
                header.decode('utf-8')
                return "documento.txt"
            except UnicodeDecodeError:
                try:
                    header.decode('latin-1')
                    return "documento.txt"
                except UnicodeDecodeError:
                    return "documento.dat"
    except Exception as e:
        
        dbg('DOCS', f"⚠️ Erro ao detectar tipo de arquivo: {e}")
        return "documento.dat"

def is_zip_file(file_path, original_filename: str | None = None):
    return detect_archive_container_type(file_path, original_filename) == 'zip'

def is_rar_file(file_path: str) -> bool:
    return detect_archive_container_type(file_path) == 'rar'

def extract_all_supported_files_from_zip(zip_path):
    success, extracted_files, _archive_type, error = extract_all_supported_files_from_archive(zip_path, os.path.basename(zip_path))
    return success, extracted_files, error

def extract_first_pdf_from_zip(zip_path):
    try:
        success, extracted_files, error = extract_all_supported_files_from_zip(zip_path)
        if not success:
            return False, None, None, error
        for file_path, file_name in extracted_files:
            if file_name.lower().endswith('.pdf'):
                return True, file_path, file_name, None
        if extracted_files:
            file_path, file_name = extracted_files[0]
            return True, file_path, file_name, None
        return False, None, None, "Nenhum arquivo encontrado no ZIP"
    except Exception as e:
        return False, None, None, f"Erro ao extrair ZIP: {str(e)}"

def _discover_7z_exe():
    candidates = [
        r"C:\\Program Files\\7-Zip\\7z.exe",
        r"C:\\Program Files (x86)\\7-Zip\\7z.exe",
        "7z",
    ]
    for c in candidates:
        try:
            if os.path.sep in c:
                if os.path.exists(c):
                    return c
            else:
                return c
        except Exception:
            continue
    return None

def extract_all_supported_files_from_rar(rar_path: str):
    success, extracted_files, _archive_type, error = extract_all_supported_files_from_archive(rar_path, os.path.basename(rar_path))
    return success, extracted_files, error

def process_pncp_document(doc_url, max_tokens=500, document_name=None, pncp_data=None, return_details=False):
    temp_path = None
    try:
        def _final_error(message: str):
            if return_details:
                return _build_process_output(error=message)
            return message

        def _final_success(summary_text: str, markdown_text: str, markdown_path: str | None, summary_path: str | None):
            if return_details:
                return _build_process_output(
                    summary=summary_text,
                    extracted_text=markdown_text,
                    markdown_path=markdown_path,
                    summary_path=summary_path,
                )
            return summary_text

        # Timestamp do lote (compartilhado entre todos os docs deste processamento)
        batch_ts = None
        try:
            if isinstance(pncp_data, dict):
                batch_ts = pncp_data.get('batch_ts')
        except Exception:
            batch_ts = None
        processing_timestamp = (str(batch_ts) if batch_ts else datetime.now().strftime('%Y%m%d_%H%M'))
        # Número sequencial do documento (para listas externas): opcional
        try:
            doc_seq = None
            if isinstance(pncp_data, dict):
                ds = pncp_data.get('doc_seq')
                if ds is not None:
                    doc_seq = int(ds)
        except Exception:
            doc_seq = None
        uid = (pncp_data or {}).get('uid') or (pncp_data or {}).get('user_id') or os.getenv('PASS_USER_UID')
        pncp = (pncp_data or {}).get('numero_controle_pncp') or (pncp_data or {}).get('id')
        dbg('DOCS', f"process start uid={uid} pncp={pncp} url='{str(doc_url)[:80]}{'...' if doc_url and len(str(doc_url))>80 else ''}' nome='{document_name}' flags: SAVE={GVG_SAVE_DOCUMENTS} MD_SUMMARY={GVG_USE_MARKDOWN_SUMMARY}")
        success, temp_path, filename, error = download_document(doc_url)
        dbg('DOCS', f"download done ok={success} temp='{temp_path}' file='{filename}' err='{error}'")

        if not success:
            return _final_error(f"Erro no download: {error}")
        final_filename = document_name if document_name else filename
        archive_type = detect_archive_container_type(temp_path, final_filename)
        if archive_type:
            archive_display_name = ARCHIVE_CONTAINER_DISPLAY_NAMES.get(archive_type, archive_type.upper())
            try:
                size_mb = (os.path.getsize(temp_path) / (1024*1024)) if os.path.exists(temp_path) else 0.0
            except Exception:
                size_mb = 0.0
            dbg('DOCS', f"detect: {archive_display_name} size={size_mb:.2f}MB path='{temp_path}'")
            dbg('DOCS', f"📦 Arquivo {archive_display_name} detectado. Extraindo TODOS os arquivos suportados...")
            success, extracted_files_list, _detected_archive_type, error = extract_all_supported_files_from_archive(temp_path, final_filename)
            if not success:
                return _final_error(f"Erro ao extrair arquivos do {archive_display_name}: {error}")
            if not extracted_files_list:
                return _final_error(f"Erro: Nenhum arquivo suportado encontrado no {archive_display_name}")
            dbg('DOCS', f"extract {archive_display_name}: total={len(extracted_files_list)}")
            if GVG_USE_MARKDOWN_SUMMARY:
                success, markdown_content, updated_filename, error = _process_archive_contents_to_markdown(
                    extracted_files_list,
                    archive_type,
                    final_filename,
                    doc_url,
                    pncp_data,
                )
                if not success:
                    return _final_error(error)
                final_filename = updated_filename
            else:
                return _final_error("Erro interno: o laboratorio de Documentos do v2 usa somente MarkItDown.")
        else:
            dbg('DOCS', f"detect: arquivo único nome='{final_filename}'")
            file_to_process = temp_path
            dbg('DOCS', f"Converter -> path='{file_to_process}' nome='{final_filename}'")

            if GVG_USE_MARKDOWN_SUMMARY:
                success, markdown_content, error = convert_document_to_markdown(file_to_process, final_filename)
                if not success:
                    return _final_error(f"Erro na conversão: {error}")
                
                dbg('DOCS', "Salvar MD local...")
                save_success, saved_path, save_error = save_markdown_file(markdown_content, final_filename, doc_url, processing_timestamp)
                if not save_success:
                    dbg('DOCS', f"Falha ao salvar Markdown: {save_error}")
                    return _final_error(f"Erro ao salvar: {save_error}")
                # Upload do MD único
                if GVG_SAVE_DOCUMENTS:
                    try:
                        pncp_raw = (pncp_data or {}).get('numero_controle_pncp') or (pncp_data or {}).get('id')
                        pncp_raw = str(pncp_raw) if pncp_raw else None
                        pncp_key = _sanitize_pncp_id(pncp_raw)
                        uid_local = (pncp_data or {}).get('uid') or (pncp_data or {}).get('user_id') or os.getenv('PASS_USER_UID')
                        if pncp_key:
                            seq = doc_seq if (doc_seq and doc_seq > 0) else 1
                            key = f"DOCUMENTS/PNCP_{pncp_key}_DOC{seq}.md"
                            ok, public_url, size_bytes = storage_put_text('govgo', key, markdown_content)
                            dbg('DOCS', f"upload single ok={ok} key='{key}' size={size_bytes} url='{public_url}' pncp_raw='{pncp_raw}' pncp_key='{pncp_key}'")
                            if ok and public_url and uid_local and pncp_raw:
                                doc_type = _infer_doc_type(final_filename, doc_url, default=None)
                                ok_db = upsert_user_document(str(uid_local), str(pncp_raw), final_filename, doc_type, public_url, size_bytes)
                                dbg('DOCS', f"db insert user_documents ok={ok_db} uid={uid_local} pncp_raw='{pncp_raw}' name='{final_filename}'")
                            elif ok and public_url and not uid_local:
                                dbg('DOCS', 'db insert skipped: uid ausente')
                    except Exception:
                        dbg('DOCS', 'upload single erro')
                summary = generate_document_summary(markdown_content, max_tokens, pncp_data)
                
                dbg('DOCS', f"resumo gerado len={len(summary) if isinstance(summary,str) else 'N/A'}")
                summary_success, summary_path, summary_error = save_summary_file(summary, final_filename, doc_url, processing_timestamp, pncp_data, method_label="MarkItDown + Assistant", markdown_filename=os.path.basename(saved_path) if save_success else None)
                if not summary_success:
                    dbg('DOCS', f"summary save erro: {summary_error}")
                return _final_success(summary, markdown_content, saved_path, summary_path if summary_success else None)
            else:
                return _final_error("Erro interno: o laboratorio de Documentos do v2 usa somente MarkItDown.")
        # Caminho comum (Markdown consolidado) segue abaixo para salvar markdown + resumo
        dbg('DOCS', "Salvar MD consolidado...")
        save_success, saved_path, save_error = save_markdown_file(markdown_content, final_filename, doc_url, processing_timestamp)
        if not save_success:
            dbg('DOCS', f"salvar MD consolidado erro: {save_error}")
            return _final_error(f"Erro ao salvar: {save_error}")
        # Upload consolidado (ZIP/RAR)
        if GVG_SAVE_DOCUMENTS:
            try:
                pncp_raw = (pncp_data or {}).get('numero_controle_pncp') or (pncp_data or {}).get('id')
                pncp_raw = str(pncp_raw) if pncp_raw else None
                pncp_key = _sanitize_pncp_id(pncp_raw)
                uid = (pncp_data or {}).get('uid') or (pncp_data or {}).get('user_id')
                if pncp_key and uid:
                    key = f"DOCUMENTS/PNCP_{pncp_key}_DOC1.md"
                    ok, public_url, size_bytes = storage_put_text('govgo', key, markdown_content)
                    dbg('DOCS', f"upload consolidado ok={ok} key='{key}' size={size_bytes} url='{public_url}' pncp_raw='{pncp_raw}' pncp_key='{pncp_key}'")
                    if ok and public_url and pncp_raw:
                        # Consolidado: usar o tipo do pacote original, se possível
                        doc_type = _infer_doc_type(filename, doc_url, default=None)
                        ok_db = upsert_user_document(str(uid), str(pncp_raw), final_filename, doc_type, public_url, size_bytes)
                        dbg('DOCS', f"db insert user_documents ok={ok_db} uid={uid} pncp_raw='{pncp_raw}' name='{final_filename}'")
            except Exception:
                dbg('DOCS', 'upload consolidado erro')
        summary = generate_document_summary(markdown_content, max_tokens, pncp_data)
        dbg('DOCS', f"resumo gerado (consolidado) len={len(summary) if isinstance(summary,str) else 'N/A'}")
        summary_success, summary_path, summary_error = save_summary_file(summary, final_filename, doc_url, processing_timestamp, pncp_data, method_label="MarkItDown + Assistant", markdown_filename=os.path.basename(saved_path) if save_success else None)
        if not summary_success:
            dbg('DOCS', f"summary save (consolidado) erro: {summary_error}")
        return _final_success(summary, markdown_content, saved_path, summary_path if summary_success else None)
    except Exception as e:
        return _final_error(f"Erro inesperado no processamento: {str(e)}")
    finally:
        cleanup_temp_file(temp_path)

def summarize_document(doc_url, max_tokens=500, document_name=None, pncp_data=None, return_details=False):
    dbg('DOCS', f"summarize_document() url='{str(doc_url)[:80]}{'...' if doc_url and len(str(doc_url))>80 else ''}' nome='{document_name}' tokens={max_tokens}")
    return process_pncp_document(doc_url, max_tokens, document_name, pncp_data, return_details=return_details)

def create_safe_filename(filename, max_length=100):
    unsafe_chars = ['<', '>', ':', '"', '|', '?', '*', '/', '\\']
    safe_filename = filename
    for char in unsafe_chars:
        safe_filename = safe_filename.replace(char, '_')
    safe_filename = ''.join(c for c in safe_filename if unicodedata.category(c) != 'Cc')
    if len(safe_filename) > max_length:
        safe_filename = safe_filename[:max_length]
    safe_filename = safe_filename.strip()
    return safe_filename if safe_filename else "documento"

__all__ = [
    'summarize_document',
    'process_pncp_document',
    'download_document',
    'convert_document_to_markdown',
    'save_markdown_file',
    'save_summary_file',
    'generate_document_summary',
    'generate_document_summary_from_files',
    'set_markdown_enabled',
    'fetch_documentos'
]


## Listagem de documentos centralizada em gvg_database.fetch_documentos