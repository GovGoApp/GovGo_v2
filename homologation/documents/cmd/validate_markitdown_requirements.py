from __future__ import annotations

import argparse
import importlib
import json
import re
import sys
from datetime import datetime
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.core.bootstrap import bootstrap_v1_documents_environment
from homologation.documents.tests.sample_factory import ensure_sample_documents


DEFAULT_PNCP_URL = "https://pncp.gov.br/pncp-api/v1/orgaos/05149117000155/compras/2026/000014/arquivos/1"
DEFAULT_REAL_DOCX = PROJECT_ROOT / "homologation" / "documents" / "artifacts" / "uploads" / "20260421_183706_nada_consta_versao_i8.docx"
DEFAULT_REAL_PPTX = PROJECT_ROOT / "homologation" / "documents" / "artifacts" / "uploads" / "20260421_175745_an_lise_cinematografia_brasileira.pptx"
XML_GARBAGE_PATTERN = re.compile(r"(<\?xml|schemas\.openxmlformats|</?[a-z]+:[^>]+>|_rels/|word/|ppt/)", re.IGNORECASE)
MARKDOWN_TABLE_PATTERN = re.compile(r"(?m)^\|(?:[^\n]*\|)+\s*$")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Valida no v2 se PDF gera Markdown com tabelas e se DOCX/PPTX nao vazam lixo OOXML."
    )
    parser.add_argument(
        "--output",
        default=str(PROJECT_ROOT / "homologation" / "documents" / "artifacts" / "markitdown_requirements_latest.json"),
    )
    parser.add_argument(
        "--pncp-url",
        default=DEFAULT_PNCP_URL,
    )
    parser.add_argument(
        "--skip-remote",
        action="store_true",
        help="Nao valida o PDF remoto do PNCP.",
    )
    parser.add_argument(
        "--real-docx",
        default=str(DEFAULT_REAL_DOCX) if DEFAULT_REAL_DOCX.exists() else "",
    )
    parser.add_argument(
        "--real-pptx",
        default=str(DEFAULT_REAL_PPTX) if DEFAULT_REAL_PPTX.exists() else "",
    )
    return parser


def _markitdown_version() -> str:
    try:
        return version("markitdown")
    except PackageNotFoundError:
        return "not-installed"


def _build_case_result(
    *,
    name: str,
    source: str,
    success: bool,
    markdown_text: str,
    error: str | None,
    expect_table: bool,
    expect_no_xml: bool,
    forbid_markdown_table: bool,
    skipped: bool = False,
) -> dict[str, object]:
    text = str(markdown_text or "")
    has_table_section = "## Tabelas extraidas da pagina" in text
    has_markdown_table = bool(MARKDOWN_TABLE_PATTERN.search(text))
    has_xml_garbage = bool(XML_GARBAGE_PATTERN.search(text))
    passed = not skipped and bool(success)
    if expect_table:
        passed = passed and (has_table_section or has_markdown_table)
    if expect_no_xml:
        passed = passed and not has_xml_garbage
    if forbid_markdown_table:
        passed = passed and not has_markdown_table

    return {
        "name": name,
        "source": source,
        "skipped": skipped,
        "success": bool(success),
        "passed": bool(passed),
        "expect_table": bool(expect_table),
        "expect_no_xml": bool(expect_no_xml),
        "forbid_markdown_table": bool(forbid_markdown_table),
        "has_table_section": has_table_section,
        "has_markdown_table": has_markdown_table,
        "has_xml_garbage": has_xml_garbage,
        "markdown_length": len(text),
        "preview": text[:500],
        "error": str(error or ""),
    }


def _run_local_case(documents_module, name: str, file_path: Path, expect_table: bool) -> dict[str, object]:
    forbid_markdown_table = file_path.suffix.lower() in {".docx", ".pptx"}
    success, markdown_text, error = documents_module.convert_document_to_markdown(str(file_path), file_path.name)
    return _build_case_result(
        name=name,
        source=str(file_path),
        success=bool(success),
        markdown_text=str(markdown_text or ""),
        error=error,
        expect_table=expect_table,
        expect_no_xml=True,
        forbid_markdown_table=forbid_markdown_table,
    )


def _run_optional_local_case(
    documents_module,
    *,
    name: str,
    file_path_value: str,
    expect_table: bool,
) -> dict[str, object]:
    file_path = Path(file_path_value).expanduser() if file_path_value else None
    if file_path is None or not file_path.exists():
        return _build_case_result(
            name=name,
            source=str(file_path or ""),
            success=False,
            markdown_text="",
            error="arquivo nao encontrado",
            expect_table=expect_table,
            expect_no_xml=True,
            forbid_markdown_table=True,
            skipped=True,
        )
    return _run_local_case(documents_module, name, file_path, expect_table=expect_table)


def _run_remote_case(documents_module, url: str) -> dict[str, object]:
    success, temp_path, filename, error = documents_module.download_document(url)
    if not success or not temp_path or not filename:
        return _build_case_result(
            name="pncp_pdf_remote",
            source=url,
            success=False,
            markdown_text="",
            error=error,
            expect_table=True,
            expect_no_xml=True,
            forbid_markdown_table=False,
        )

    try:
        convert_success, markdown_text, convert_error = documents_module.convert_document_to_markdown(temp_path, filename)
        return _build_case_result(
            name="pncp_pdf_remote",
            source=url,
            success=bool(convert_success),
            markdown_text=str(markdown_text or ""),
            error=convert_error,
            expect_table=True,
            expect_no_xml=True,
            forbid_markdown_table=False,
        )
    finally:
        documents_module.cleanup_temp_file(temp_path)


def main() -> int:
    args = build_parser().parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    env_info = bootstrap_v1_documents_environment()
    documents_module = importlib.import_module("gvg_documents")
    sample_cases = {Path(case["path"]).name: Path(case["path"]) for case in ensure_sample_documents()}

    results: list[dict[str, object]] = []
    results.append(_run_local_case(documents_module, "sample_pdf_table", sample_cases["sample_markitdown_table.pdf"], expect_table=True))
    results.append(_run_local_case(documents_module, "sample_docx", sample_cases["sample_markitdown.docx"], expect_table=False))
    results.append(_run_local_case(documents_module, "sample_pptx", sample_cases["sample_markitdown.pptx"], expect_table=False))
    results.append(_run_optional_local_case(documents_module, name="real_docx", file_path_value=args.real_docx, expect_table=False))
    results.append(_run_optional_local_case(documents_module, name="real_pptx", file_path_value=args.real_pptx, expect_table=False))
    if not args.skip_remote:
        results.append(_run_remote_case(documents_module, args.pncp_url))

    failures = [item for item in results if not item["skipped"] and not item["passed"]]
    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "project_root": str(PROJECT_ROOT),
        "env": env_info,
        "markitdown_version": _markitdown_version(),
        "pncp_url": "" if args.skip_remote else args.pncp_url,
        "cases": results,
        "failure_count": len(failures),
        "passed": len(failures) == 0,
    }

    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("GovGo v2 :: Validacao de requisitos MarkItDown")
    for item in results:
        status = "SKIP" if item["skipped"] else ("OK" if item["passed"] else "FAIL")
        print(
            f"[{status}] {item['name']} | table={item['has_table_section'] or item['has_markdown_table']} | xml={item['has_xml_garbage']} | len={item['markdown_length']}"
        )
        if item["error"]:
            print(f"       erro={item['error']}")
    print()
    print(f"Relatorio salvo em: {output_path}")
    print(f"Falhas: {len(failures)}")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())