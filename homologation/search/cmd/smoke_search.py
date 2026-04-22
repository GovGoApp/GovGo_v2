from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.search.core.adapter import SearchAdapter
from homologation.search.core.contracts import SearchRequest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Executa a bateria basica de homologacao da Busca do v1 no v2."
    )
    parser.add_argument(
        "--fixtures",
        default=str(PROJECT_ROOT / "homologation" / "search" / "fixtures" / "search_cases.json"),
    )
    parser.add_argument(
        "--output",
        default=str(PROJECT_ROOT / "homologation" / "search" / "artifacts" / "smoke_search_latest.json"),
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    fixtures_path = Path(args.fixtures)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with fixtures_path.open("r", encoding="utf-8") as handle:
        cases = json.load(handle)

    adapter = SearchAdapter()
    report = []
    failures = 0

    print()
    print("GovGo v2 :: Smoke Search")
    print(f"Fixtures: {fixtures_path}")
    print()

    for case in cases:
        request = SearchRequest.from_mapping(case)
        response = adapter.run(request).to_dict()
        expected_min = int(case.get("expected_min_results", 0) or 0)
        passed = (not response.get("error")) and response.get("result_count", 0) >= expected_min
        if not passed:
            failures += 1
        item = {
            "case": case.get("name") or request.query,
            "passed": passed,
            "expected_min_results": expected_min,
            "result_count": response.get("result_count", 0),
            "elapsed_ms": response.get("elapsed_ms", 0),
            "confidence": response.get("confidence", 0.0),
            "error": response.get("error"),
            "request": response.get("request", {}),
        }
        report.append(item)
        status = "OK" if passed else "FAIL"
        print(
            f"[{status}] {item['case']} | "
            f"resultados={item['result_count']} | "
            f"min={item['expected_min_results']} | "
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