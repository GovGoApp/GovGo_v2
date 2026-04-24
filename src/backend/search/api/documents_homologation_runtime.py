from __future__ import annotations

import contextlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[4]
RUN_DOCUMENT_PATH = PROJECT_ROOT / "homologation" / "documents" / "cmd" / "run_document.py"


def _sanitize_file_name(name: str, fallback: str) -> str:
    raw = str(name or "").strip()
    safe = "".join(ch if ch not in '<>:"|?*/\\' else "_" for ch in raw)
    safe = " ".join(safe.split()).strip(" .")
    return safe or fallback


def _download_document_file(url: str, destination: Path) -> tuple[bool, str | None]:
    request = urllib.request.Request(
        str(url or "").strip(),
        headers={"User-Agent": "GovGo-v2/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response, destination.open("wb") as handle:
            shutil.copyfileobj(response, handle)
        return True, None
    except urllib.error.HTTPError as exc:
        return False, f"HTTP {exc.code}"
    except urllib.error.URLError as exc:
        return False, str(exc.reason or exc)
    except Exception as exc:
        return False, str(exc)


def run_documents_action(
    *,
    action: str,
    document_url: str = "",
    document_name: str = "",
    pncp_id: str = "",
    user_id: str = "",
    max_tokens: int = 500,
    save_artifacts: bool = False,
    timeout_seconds: int = 900,
) -> dict[str, Any]:
    if not RUN_DOCUMENT_PATH.exists():
        raise FileNotFoundError(f"Runner de documentos nao encontrado: {RUN_DOCUMENT_PATH}")

    output_fd, output_path = tempfile.mkstemp(prefix="govgo_docs_", suffix=".json")
    os.close(output_fd)

    command = [
        sys.executable,
        str(RUN_DOCUMENT_PATH),
        "--action",
        str(action or "healthcheck"),
        "--json",
        "--output",
        output_path,
        "--max-tokens",
        str(int(max_tokens or 500)),
    ]

    if document_url:
        command.extend(["--url", str(document_url)])
    if document_name:
        command.extend(["--name", str(document_name)])
    if pncp_id:
        command.extend(["--pncp-id", str(pncp_id)])
    if user_id:
        command.extend(["--user-id", str(user_id)])
    if save_artifacts:
        command.append("--save-artifacts")

    try:
        completed = subprocess.run(
            command,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=timeout_seconds,
            check=False,
        )
        if not Path(output_path).exists():
            stderr = (completed.stderr or completed.stdout or "").strip()
            raise RuntimeError(stderr or "Runner de documentos nao gerou arquivo de saida.")

        payload = json.loads(Path(output_path).read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise RuntimeError("Resposta JSON invalida do runner de documentos.")
        return payload
    finally:
        with contextlib.suppress(Exception):
            Path(output_path).unlink()


def build_documents_bundle(
    pncp_id: str,
    documents: Iterable[dict[str, Any]],
) -> tuple[str | None, list[dict[str, Any]], list[dict[str, Any]], str | None]:
    work_dir = Path(tempfile.mkdtemp(prefix="govgo_docs_bundle_"))
    zip_path = work_dir / f"documentos_{_sanitize_file_name(str(pncp_id or 'edital'), 'edital')}.zip"
    included: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    used_names: set[str] = set()

    try:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for index, document in enumerate(documents or [], start=1):
                url = str((document or {}).get("url") or "").strip()
                if not url:
                    skipped.append({"name": str((document or {}).get("nome") or f"Documento {index}"), "reason": "sem_url"})
                    continue

                raw_name = str((document or {}).get("nome") or f"documento_{index}")
                safe_name = _sanitize_file_name(raw_name, f"documento_{index}")
                stem = Path(safe_name).stem or f"documento_{index}"
                suffix = Path(safe_name).suffix
                candidate_name = safe_name
                counter = 2
                while candidate_name.lower() in used_names:
                    candidate_name = f"{stem}_{counter}{suffix}"
                    counter += 1
                used_names.add(candidate_name.lower())

                local_path = work_dir / candidate_name
                ok, error = _download_document_file(url, local_path)
                if not ok:
                    skipped.append({"name": raw_name, "reason": error or "falha_download"})
                    continue

                archive.write(local_path, arcname=candidate_name)
                included.append(
                    {
                        "name": raw_name,
                        "bundle_name": candidate_name,
                        "url": url,
                    }
                )

        if not included:
            cleanup_bundle_path(str(zip_path))
            return None, included, skipped, "Nao foi possivel baixar nenhum documento para gerar o resumo."

        return str(zip_path), included, skipped, None
    except Exception as exc:
        cleanup_bundle_path(str(zip_path))
        return None, included, skipped, str(exc)


def cleanup_bundle_path(bundle_path: str | None) -> None:
    path = Path(str(bundle_path or ""))
    if not path:
        return
    with contextlib.suppress(Exception):
        if path.is_file():
            path.unlink()
    with contextlib.suppress(Exception):
        if path.parent.exists():
            shutil.rmtree(path.parent, ignore_errors=True)
