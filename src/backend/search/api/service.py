from __future__ import annotations

from typing import Any

from src.backend.search.core.adapter import SearchAdapter
from src.backend.search.core.contracts import SearchRequest


ADAPTER = SearchAdapter()


def _error_response(request: SearchRequest, message: str) -> dict[str, Any]:
    return {
        "request": request.to_dict(),
        "source": "v2.search_api",
        "elapsed_ms": 0,
        "confidence": 0.0,
        "result_count": 0,
        "preprocessing": {},
        "meta": {},
        "results": [],
        "error": message,
    }


def run_search(payload: dict[str, Any] | None) -> dict[str, Any]:
    request = SearchRequest.from_mapping(payload or {})
    if not request.query:
        return _error_response(request, "Informe uma consulta para buscar.")
    return ADAPTER.run(request).to_dict()