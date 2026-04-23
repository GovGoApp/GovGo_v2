from __future__ import annotations

from typing import Any

from src.backend.search.api.config_store import load_search_config, save_search_config
from src.backend.search.api.filter_store import load_search_filters, save_search_filters
from src.backend.search.core.adapter import SearchAdapter
from src.backend.search.core.contracts import SearchRequest
from src.backend.search.core.ui_filters import has_any_ui_filter


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
    if not request.query and not (request.where_sql or has_any_ui_filter(request.ui_filters)):
        return _error_response(request, "Informe uma consulta para buscar.")
    return ADAPTER.run(request).to_dict()


def get_search_config() -> dict[str, Any]:
    return load_search_config()


def update_search_config(payload: dict[str, Any] | None) -> dict[str, Any]:
    return save_search_config(payload or {})


def get_search_filters() -> dict[str, Any]:
    return load_search_filters()


def update_search_filters(payload: dict[str, Any] | None) -> dict[str, Any]:
    return save_search_filters(payload or {})
