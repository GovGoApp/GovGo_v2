from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.core.adapter import DocumentsAdapter
from homologation.documents.core.contracts import DocumentRequest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Executa a bateria basica de homologacao de Documentos do v1 no v2."
    )
    parser.add_argument(
        "--fixtures",
        default=str(PROJECT_ROOT / "homologation" / "documents" / "fixtures" / "document_cases.json"),
    )
    parser.add_argument(
        "--output",
        default=str(PROJECT_ROOT / "homologation" / "documents" / "artifacts" / "smoke_documents_latest.json"),
    )
    return parser


def _case_passed(case: dict, response: dict) -> bool:
    if response.get("error"):
        return False

    action = response.get("action")
    if action == "healthcheck":
        return response.get("status") == "ok"

    expected_min = int(case.get("expected_min_documents", 0) or 0)
    if action == "list_documents":
        return response.get("result_count", 0) >= expected_min

    expected_contains = str(case.get("expected_contains", "")).strip().lower()
    summary_text = str(response.get("summary", "")).lower()
    if expected_contains:
        return expected_contains in summary_text
    return bool(summary_text)


def main() -> int:
    args = build_parser().parse_args()
    fixtures_path = Path(args.fixtures)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with fixtures_path.open("r", encoding="utf-8") as handle:
        cases = json.load(handle)

    adapter = DocumentsAdapter()
    report = []
    failures = 0

    print()
    print("GovGo v2 :: Smoke Documents")
    print(f"Fixtures: {fixtures_path}")
    print()

    enabled_cases = [case for case in cases if bool(case.get("enabled", True))]
    for case in enabled_cases:
        request = DocumentRequest.from_mapping(case)
        response = adapter.run(request).to_dict()
        passed = _case_passed(case, response)
        if not passed:
            failures += 1
        item = {
            "case": case.get("name") or request.action,
            "passed": passed,
            "action": response.get("action"),
            "result_count": response.get("result_count", 0),
            "elapsed_ms": response.get("elapsed_ms", 0),
            "status": response.get("status"),
            "error": response.get("error"),
            "request": response.get("request", {}),
        }
        report.append(item)
        status = "OK" if passed else "FAIL"
        print(
            f"[{status}] {item['case']} | "
            f"acao={item['action']} | "
            f"status={item['status']} | "
            f"resultados={item['result_count']} | "
            f"tempo={item['elapsed_ms']} ms"
        )
        if item["error"]:
            print(f"       erro={item['error']}")

    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print()
    print(f"Relatorio salvo em: {output_path}")
    print(f"Falhas: {failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
