from __future__ import annotations

from datetime import date, datetime
from dataclasses import asdict, dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional


SEARCH_TYPES = {
    "semantic",
    "keyword",
    "hybrid",
    "correspondence",
    "category_filtered",
}


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, set):
        return [_json_safe(item) for item in value]
    return value


@dataclass
class SearchRequest:
    query: str
    search_type: str = "semantic"
    limit: int = 10
    preprocess: bool = True
    prefer_preproc_v2: bool = True
    intelligent_mode: bool = True
    filter_expired: bool = True
    use_negation: bool = True
    sql_debug: bool = False
    filters: List[str] = field(default_factory=list)
    where_sql: List[str] = field(default_factory=list)
    ui_filters: Dict[str, Any] = field(default_factory=dict)
    top_categories_limit: int = 10
    category_search_base: str = "semantic"
    relevance_level: int = 1
    sort_mode: int = 1
    min_similarity: float = 0.0

    def normalized_search_type(self) -> str:
        value = (self.search_type or "semantic").strip().lower()
        if value not in SEARCH_TYPES:
            raise ValueError(f"search_type invalido: {self.search_type}")
        return value

    def normalized_category_base(self) -> str:
        value = (self.category_search_base or "semantic").strip().lower()
        if value not in {"semantic", "keyword", "hybrid"}:
            raise ValueError(f"category_search_base invalido: {self.category_search_base}")
        return value

    @classmethod
    def from_mapping(cls, data: Dict[str, Any]) -> "SearchRequest":
        return cls(
            query=str(data.get("query", "")).strip(),
            search_type=str(data.get("search_type", "semantic")).strip(),
            limit=int(data.get("limit", 10) or 10),
            preprocess=bool(data.get("preprocess", True)),
            prefer_preproc_v2=bool(data.get("prefer_preproc_v2", True)),
            intelligent_mode=bool(data.get("intelligent_mode", True)),
            filter_expired=bool(data.get("filter_expired", True)),
            use_negation=bool(data.get("use_negation", True)),
            sql_debug=bool(data.get("sql_debug", False)),
            filters=list(data.get("filters", []) or []),
            where_sql=list(data.get("where_sql", []) or []),
            ui_filters=dict(data.get("ui_filters", {}) or {}),
            top_categories_limit=int(data.get("top_categories_limit", 10) or 10),
            category_search_base=str(data.get("category_search_base", "semantic")).strip(),
            relevance_level=int(data.get("relevance_level", 1) or 1),
            sort_mode=int(data.get("sort_mode", 1) or 1),
            min_similarity=float(data.get("min_similarity", 0) or 0),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _json_safe(asdict(self))


@dataclass
class SearchResultItem:
    item_id: Optional[str]
    rank: int
    similarity: float
    title: str
    organization: str
    municipality: str
    uf: str
    modality: str
    closing_date: str
    estimated_value: Any
    municipality_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raw: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return _json_safe(asdict(self))


@dataclass
class SearchResponse:
    request: Dict[str, Any]
    source: str
    elapsed_ms: int
    confidence: float
    result_count: int
    preprocessing: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, Any] = field(default_factory=dict)
    results: List[SearchResultItem] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return _json_safe({
            "request": self.request,
            "source": self.source,
            "elapsed_ms": self.elapsed_ms,
            "confidence": self.confidence,
            "result_count": self.result_count,
            "preprocessing": self.preprocessing,
            "meta": self.meta,
            "results": [item.to_dict() for item in self.results],
            "error": self.error,
        })
