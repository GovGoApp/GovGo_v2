from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional


DOCUMENT_ACTIONS = {
    "healthcheck",
    "list_documents",
    "process_url",
}


def _as_bool(value: Any, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on", "sim"}:
        return True
    if text in {"0", "false", "no", "off", "nao", "não"}:
        return False
    return default


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
class DocumentRequest:
    action: str = "healthcheck"
    document_url: str = ""
    document_name: str = ""
    pncp_id: str = ""
    user_id: str = ""
    max_tokens: int = 500
    save_artifacts: bool = False
    extra: Dict[str, Any] = field(default_factory=dict)

    def normalized_action(self) -> str:
        value = (self.action or "healthcheck").strip().lower()
        if value not in DOCUMENT_ACTIONS:
            raise ValueError(f"action invalida: {self.action}")
        return value

    @classmethod
    def from_mapping(cls, data: Dict[str, Any]) -> "DocumentRequest":
        known_fields = {
            "action",
            "document_url",
            "document_name",
            "pncp_id",
            "user_id",
            "max_tokens",
            "save_artifacts",
            "use_markdown_summary",
        }
        extra = {key: value for key, value in data.items() if key not in known_fields}
        return cls(
            action=str(data.get("action", "healthcheck")).strip(),
            document_url=str(data.get("document_url", "")).strip(),
            document_name=str(data.get("document_name", "")).strip(),
            pncp_id=str(data.get("pncp_id", "")).strip(),
            user_id=str(data.get("user_id", "")).strip(),
            max_tokens=int(data.get("max_tokens", 500) or 500),
            save_artifacts=_as_bool(data.get("save_artifacts"), False),
            extra=extra,
        )

    def to_dict(self) -> Dict[str, Any]:
        return _json_safe(asdict(self))


@dataclass
class DocumentListItem:
    url: str
    nome: str
    tipo: str
    tamanho: Any
    modificacao: str
    sequencial: Any
    origem: str
    raw: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return _json_safe(asdict(self))


@dataclass
class DocumentResponse:
    request: Dict[str, Any]
    source: str
    action: str
    status: str
    elapsed_ms: int
    result_count: int
    extracted_text: str = ""
    summary: str = ""
    meta: Dict[str, Any] = field(default_factory=dict)
    documents: List[DocumentListItem] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return _json_safe(
            {
                "request": self.request,
                "source": self.source,
                "action": self.action,
                "status": self.status,
                "elapsed_ms": self.elapsed_ms,
                "result_count": self.result_count,
                "extracted_text": self.extracted_text,
                "summary": self.summary,
                "meta": self.meta,
                "documents": [item.to_dict() for item in self.documents],
                "error": self.error,
            }
        )
