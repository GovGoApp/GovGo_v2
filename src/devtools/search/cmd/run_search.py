from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from textwrap import shorten


PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.backend.search.core.adapter import SearchAdapter
from src.backend.search.core.contracts import SearchRequest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Executa a Busca do v1 a partir do laboratorio de homologacao do v2."
    )
    parser.add_argument("query", help="Consulta de busca em linguagem natural.")
    parser.add_argument(
        "--search-type",
        default="semantic",
        choices=["semantic", "keyword", "hybrid", "correspondence", "category_filtered"],
    )
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--filter", dest="filters", action="append", default=[])
    parser.add_argument(
        "--category-search-base",
        default="semantic",
        choices=["semantic", "keyword", "hybrid"],
    )
    parser.add_argument("--no-preprocess", action="store_true")
    parser.add_argument("--no-filter-expired", action="store_true")
    parser.add_argument("--no-negation", action="store_true")
    parser.add_argument("--sql-debug", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument(
        "--output",
        help="Arquivo de saida. Em modo --json, grava UTF-8 diretamente sem depender do shell.",
    )
    return parser


def print_human_response(response: dict) -> None:
    print()
    print("GovGo v2 :: Homologacao Search v1")
    print(f"Fonte: {response['source']}")
    print(f"Tempo: {response['elapsed_ms']} ms")
    print(f"Confianca: {response['confidence']:.4f}")
    print(f"Resultados: {response['result_count']}")
    if response.get("error"):
        print(f"Erro: {response['error']}")
        return

    preproc = response.get("preprocessing", {})
    if preproc:
        print(f"Preprocessamento: {'ligado' if preproc.get('enabled') else 'desligado'}")
        if preproc.get("search_terms"):
            print(f"Termos: {preproc.get('search_terms')}")
        if preproc.get("negative_terms"):
            print(f"Negativos: {preproc.get('negative_terms')}")

    print()
    for item in response.get("results", []):
        line = shorten(item.get("title") or "(sem titulo)", width=96, placeholder="...")
        org = shorten(item.get("organization") or "(sem orgao)", width=40, placeholder="...")
        city = "/".join(x for x in [item.get("municipality"), item.get("uf")] if x)
        print(
            f"[{item.get('rank', 0):02d}] "
            f"sim={item.get('similarity', 0.0):.4f} | "
            f"{org} | {city or '-'} | {item.get('closing_date') or '-'}"
        )
        print(f"     {line}")


def _write_output(content: str, output_path: str | None) -> None:
    if output_path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    sys.stdout.write(content)
    if not content.endswith("\n"):
        sys.stdout.write("\n")


def main() -> int:
    args = build_parser().parse_args()
    request = SearchRequest(
        query=args.query,
        search_type=args.search_type,
        limit=args.limit,
        preprocess=not args.no_preprocess,
        filter_expired=not args.no_filter_expired,
        use_negation=not args.no_negation,
        sql_debug=args.sql_debug,
        filters=args.filters,
        category_search_base=args.category_search_base,
    )

    adapter = SearchAdapter()
    response = adapter.run(request).to_dict()

    if args.json:
        _write_output(json.dumps(response, ensure_ascii=False, indent=2), args.output)
        return 0 if not response.get("error") else 1

    if args.output:
        from io import StringIO

        buffer = StringIO()
        stdout = sys.stdout
        try:
            sys.stdout = buffer
            print_human_response(response)
        finally:
            sys.stdout = stdout
        _write_output(buffer.getvalue(), args.output)
    else:
        print_human_response(response)
    return 0 if not response.get("error") else 1


if __name__ == "__main__":
    raise SystemExit(main())