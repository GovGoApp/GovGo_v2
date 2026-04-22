from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.core.bootstrap import bootstrap_v1_documents_environment
from homologation.documents.tests.sample_factory import ensure_sample_documents


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Executa uma matriz local de conversao MarkItDown com varios tipos de documento."
    )
    parser.add_argument(
        "--output",
        default=str(PROJECT_ROOT / "homologation" / "documents" / "artifacts" / "markitdown_matrix_latest.json"),
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    bootstrap_v1_documents_environment()
    documents_module = importlib.import_module("gvg_documents")
    cases = ensure_sample_documents()

    print()
    print("GovGo v2 :: MarkItDown Matrix")
    print(f"Amostras: {len(cases)}")
    print()

    report = []
    failures = 0
    for case in cases:
      success, markdown, error = documents_module.convert_document_to_markdown(case["path"], case["filename"])
      markdown_text = str(markdown or "")
      expected = str(case.get("expected_contains") or "")
      expected_all = [str(item).strip() for item in case.get("expected_contains_all", []) if str(item).strip()]
      expected_absent = [str(item).strip() for item in case.get("expected_absent", []) if str(item).strip()]

      passed = bool(success)
      if expected:
          passed = passed and expected.lower() in markdown_text.lower()
      if expected_all:
          passed = passed and all(item.lower() in markdown_text.lower() for item in expected_all)
      if expected_absent:
          passed = passed and all(item.lower() not in markdown_text.lower() for item in expected_absent)
      if not passed:
          failures += 1
      report_item = {
          "case": case["name"],
          "source": case["path"],
          "expected_contains": expected,
          "expected_contains_all": expected_all,
          "expected_absent": expected_absent,
          "passed": passed,
          "success": bool(success),
          "markdown_length": len(markdown_text),
          "markdown_preview": markdown_text[:400],
          "error": error,
      }
      report.append(report_item)
      status = "OK" if passed else "FAIL"
      print(
          f"[{status}] {case['name']} | arquivo={case['filename']} | md_len={report_item['markdown_length']}"
      )
      if error:
          print(f"       erro={error}")

    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print(f"Relatorio salvo em: {output_path}")
    print(f"Falhas: {failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())