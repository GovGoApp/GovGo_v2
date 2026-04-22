from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.browser.app import RUNS_DIR, create_app
from homologation.documents.tests.sample_factory import COMMON_TOKEN, ensure_sample_documents


DEFAULT_PNCP_ID = "05149117000155-1-000014/2026"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Valida no browser tester a escolha de fonte entre arquivo local real e documento real do PNCP."
    )
    parser.add_argument("--pncp-id", default=DEFAULT_PNCP_ID)
    parser.add_argument(
        "--output",
        default=str(PROJECT_ROOT / "homologation" / "documents" / "artifacts" / "source_selection_test_latest.json"),
    )
    return parser


def _capture_new_run(client: Any, route: str, data: dict[str, Any], *, multipart: bool = False):
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    before = {path.name for path in RUNS_DIR.glob("*.json")}
    kwargs: dict[str, Any] = {"data": data}
    if multipart:
        kwargs["content_type"] = "multipart/form-data"
    response = client.post(route, **kwargs)
    new_paths = [path for path in sorted(RUNS_DIR.glob("*.json")) if path.name not in before]
    latest_run = new_paths[-1] if new_paths else None
    run_payload = {}
    if latest_run is not None:
        run_payload = json.loads(latest_run.read_text(encoding="utf-8"))
    return response, latest_run, run_payload


def _build_case_report(name: str, response: Any, latest_run: Path | None, run_payload: dict[str, Any], passed: bool, notes: list[str]) -> dict[str, Any]:
    response_payload = run_payload.get("response") or {}
    request_payload = run_payload.get("request") or {}
    return {
        "case": name,
        "passed": passed,
        "http_status": int(getattr(response, "status_code", 0) or 0),
        "run_file": latest_run.name if latest_run is not None else None,
        "request": request_payload,
        "response_status": response_payload.get("status"),
        "result_count": response_payload.get("result_count", 0),
        "extracted_text_length": len(str(response_payload.get("extracted_text") or "")),
        "error": response_payload.get("error"),
        "notes": notes,
    }


def _build_extensionless_zip_upload(samples: list[dict[str, Any]]) -> Path:
    txt_case = next(case for case in samples if case["name"] == "txt-local")
    docx_case = next(case for case in samples if case["name"] == "docx-local")

    work_dir = Path(tempfile.mkdtemp(prefix="govgo_docs_upload_zip_"))
    archive_path = work_dir / "1"
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("1001", Path(txt_case["path"]).read_bytes())
        archive.writestr("1002", Path(docx_case["path"]).read_bytes())
    return archive_path


def main() -> int:
    args = build_parser().parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    app = create_app()
    client = app.test_client()

    samples = ensure_sample_documents()
    local_pdf = next(case for case in samples if case["name"] == "pdf-local")

    print()
    print("GovGo v2 :: Teste de Escolha de Fonte")
    print(f"PNCP: {args.pncp_id}")
    print(f"Arquivo local: {local_pdf['path']}")
    print()

    report = []
    failures = 0

    response = client.get("/")
    html = response.get_data(as_text=True)
    ui_passed = (
        response.status_code == 200
        and "Arquivo local" in html
        and "Processar arquivo do PNCP" in html
        and "Rodar este teste com arquivo local" in html
        and "busy-overlay" in html
        and ".zip,.rar,.7z,.tar,.gz,.gzip,.bz2" in html
    )
    ui_notes = [
        "rota / respondeu 200" if response.status_code == 200 else f"HTTP {response.status_code}",
        "card do teste local visivel" if "Arquivo local" in html else "card do teste local ausente",
        "card do teste PNCP visivel" if "Processar arquivo do PNCP" in html else "card do teste PNCP ausente",
        "indicador de execucao presente" if "busy-overlay" in html else "indicador de execucao ausente",
        "input de upload aceita arquivos compactados" if ".zip,.rar,.7z,.tar,.gz,.gzip,.bz2" in html else "input de upload sem extensoes de arquivo compactado",
    ]
    report.append(_build_case_report("browser-explicit-source-tests", response, None, {}, ui_passed, ui_notes))
    print(f"[{'OK' if ui_passed else 'FAIL'}] browser-explicit-source-tests")
    if not ui_passed:
        failures += 1

    response, latest_run, run_payload = _capture_new_run(
        client,
        "/list-documents",
        {"pncp_id": args.pncp_id},
    )
    response_payload = run_payload.get("response") or {}
    html = response.get_data(as_text=True)
    list_passed = (
        response.status_code == 200
        and response_payload.get("status") == "ok"
        and int(response_payload.get("result_count", 0) or 0) >= 1
        and "Rodar Teste 6 com este documento" in html
    )
    list_notes = [
        "rota /list-documents respondeu 200" if response.status_code == 200 else f"HTTP {response.status_code}",
        f"result_count={response_payload.get('result_count', 0)}",
        "botao explicito do Teste 6 visivel" if "Rodar Teste 6 com este documento" in html else "botao explicito do Teste 6 ausente",
    ]
    report.append(_build_case_report("list-pncp-documents", response, latest_run, run_payload, list_passed, list_notes))
    print(f"[{'OK' if list_passed else 'FAIL'}] list-pncp-documents")
    if not list_passed:
        failures += 1

    selected_document = None
    documents = response_payload.get("documents") or []
    if documents:
        selected_document = documents[0]

    with Path(local_pdf["path"]).open("rb") as handle:
        response, latest_run, run_payload = _capture_new_run(
            client,
            "/process-upload",
            {
                "pncp_id": "",
                "user_id": "",
                "local_file": (handle, local_pdf["filename"]),
            },
            multipart=True,
        )
    response_payload = run_payload.get("response") or {}
    request_payload = run_payload.get("request") or {}
    source_kind = ((request_payload.get("extra") or {}).get("source_kind") or "").strip()
    extracted_text = str(response_payload.get("extracted_text") or "")
    upload_passed = (
        response.status_code == 200
        and response_payload.get("status") == "ok"
        and source_kind == "upload-local"
        and bool(extracted_text.strip())
    )
    upload_notes = [
        "rota /process-upload respondeu 200" if response.status_code == 200 else f"HTTP {response.status_code}",
        f"source_kind={source_kind or '-'}",
        f"status={response_payload.get('status')}",
        f"extracted_text_length={len(extracted_text)}",
    ]
    report.append(_build_case_report("process-upload-local", response, latest_run, run_payload, upload_passed, upload_notes))
    print(f"[{'OK' if upload_passed else 'FAIL'}] process-upload-local")
    if not upload_passed:
        failures += 1

    archive_upload_path = _build_extensionless_zip_upload(samples)
    try:
        with archive_upload_path.open("rb") as handle:
            response, latest_run, run_payload = _capture_new_run(
                client,
                "/process-upload",
                {
                    "pncp_id": "",
                    "user_id": "",
                    "local_file": (handle, archive_upload_path.name),
                },
                multipart=True,
            )
        response_payload = run_payload.get("response") or {}
        request_payload = run_payload.get("request") or {}
        source_kind = ((request_payload.get("extra") or {}).get("source_kind") or "").strip()
        extracted_text = str(response_payload.get("extracted_text") or "")
        archive_passed = (
            response.status_code == 200
            and response_payload.get("status") == "ok"
            and source_kind == "upload-local"
            and "ZIP/PKZIP com arquivos extraídos" in extracted_text
            and "Arquivo: 1001" in extracted_text
            and "Arquivo: 1002" in extracted_text
            and COMMON_TOKEN in extracted_text
        )
        archive_notes = [
            "rota /process-upload respondeu 200" if response.status_code == 200 else f"HTTP {response.status_code}",
            f"source_kind={source_kind or '-'}",
            f"status={response_payload.get('status')}",
            f"extracted_text_length={len(extracted_text)}",
            "cabecalho ZIP/PKZIP presente" if "ZIP/PKZIP com arquivos extraídos" in extracted_text else "cabecalho ZIP/PKZIP ausente",
            "dois membros extraidos apareceram no markdown" if "Arquivo: 1001" in extracted_text and "Arquivo: 1002" in extracted_text else "membros esperados ausentes no markdown",
        ]
        report.append(_build_case_report("process-upload-archive-local", response, latest_run, run_payload, archive_passed, archive_notes))
        print(f"[{'OK' if archive_passed else 'FAIL'}] process-upload-archive-local")
        if not archive_passed:
            failures += 1
    finally:
        shutil.rmtree(archive_upload_path.parent, ignore_errors=True)

    if selected_document is None:
        skipped_payload = {
            "case": "process-selected-pncp-document",
            "passed": False,
            "http_status": 0,
            "run_file": None,
            "request": {},
            "response_status": "skipped",
            "result_count": 0,
            "error": "Nenhum documento retornado pela listagem do PNCP.",
            "notes": ["caso nao executado porque a listagem nao retornou documentos"],
        }
        report.append(skipped_payload)
        print("[FAIL] process-selected-pncp-document")
        failures += 1
    else:
        response, latest_run, run_payload = _capture_new_run(
            client,
            "/process-pncp-document",
            {
                "document_url": selected_document.get("url") or "",
                "document_name": selected_document.get("nome") or "",
                "pncp_id": args.pncp_id,
                "user_id": "",
            },
        )
        response_payload = run_payload.get("response") or {}
        request_payload = run_payload.get("request") or {}
        source_kind = ((request_payload.get("extra") or {}).get("source_kind") or "").strip()
        extracted_text = str(response_payload.get("extracted_text") or "")
        pncp_passed = (
            response.status_code == 200
            and response_payload.get("status") == "ok"
            and source_kind == "pncp-selected"
            and bool(extracted_text.strip())
        )
        pncp_notes = [
            "rota /process-pncp-document respondeu 200" if response.status_code == 200 else f"HTTP {response.status_code}",
            f"documento={selected_document.get('nome') or '-'}",
            f"source_kind={source_kind or '-'}",
            f"status={response_payload.get('status')}",
            f"extracted_text_length={len(extracted_text)}",
        ]
        report.append(_build_case_report("process-selected-pncp-document", response, latest_run, run_payload, pncp_passed, pncp_notes))
        print(f"[{'OK' if pncp_passed else 'FAIL'}] process-selected-pncp-document")
        if not pncp_passed:
            failures += 1

    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print(f"Relatorio salvo em: {output_path}")
    print(f"Falhas: {failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())