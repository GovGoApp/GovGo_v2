from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from textwrap import shorten


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.core.adapter import DocumentsAdapter
from homologation.documents.core.contracts import DocumentRequest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Executa o laboratorio de homologacao de Documentos do v1 a partir do v2."
    )
    parser.add_argument(
        "--action",
        default="healthcheck",
        choices=["healthcheck", "list_documents", "process_url"],
    )
    parser.add_argument("--url", dest="document_url", default="", help="URL http/https, file:// ou caminho local do documento")
    parser.add_argument("--name", dest="document_name", default="")
    parser.add_argument("--pncp-id", default="")
    parser.add_argument("--user-id", default="")
    parser.add_argument("--max-tokens", type=int, default=500)
    parser.add_argument("--save-artifacts", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument(
        "--output",
        help="Arquivo de saida. Em modo --json, grava UTF-8 diretamente sem depender do shell.",
    )
    return parser


def print_human_response(response: dict) -> None:
    print()
    print("GovGo v2 :: Homologacao Documents v1")
    print(f"Acao: {response['action']}")
    print(f"Fonte: {response['source']}")
    print(f"Status: {response['status']}")
    print(f"Tempo: {response['elapsed_ms']} ms")

    if response.get("error"):
        print(f"Erro: {response['error']}")
        return

    if response["action"] == "healthcheck":
        for key, value in sorted((response.get("meta") or {}).items()):
            print(f"{key}: {value}")
        return

    if response["action"] == "list_documents":
        print(f"Documentos: {response['result_count']}")
        print()
        for index, item in enumerate(response.get("documents") or [], start=1):
            title = shorten(item.get("nome") or "(sem nome)", width=96, placeholder="...")
            print(
                f"[{index:02d}] {item.get('tipo') or '-'} | seq={item.get('sequencial') or '-'} | origem={item.get('origem') or '-'}"
            )
            print(f"     {title}")
            print(f"     {item.get('url') or '-'}")
        return

    print()
    print(response.get("summary") or "(sem retorno)")


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
    request = DocumentRequest(
        action=args.action,
        document_url=args.document_url,
        document_name=args.document_name,
        pncp_id=args.pncp_id,
        user_id=args.user_id,
        max_tokens=args.max_tokens,
        save_artifacts=args.save_artifacts,
    )

    adapter = DocumentsAdapter()
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
