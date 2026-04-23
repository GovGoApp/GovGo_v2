from __future__ import annotations

import re
from typing import Any


FILTER_UF_OPTIONS = (
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
)

FILTER_MODALIDADE_VALUES = ("1", "2", "3", "4", "5", "6", "7", "8")
FILTER_MODO_VALUES = ("1", "2", "3", "4")
FILTER_DATE_FIELDS = {
    "encerramento": "data_encerramento_proposta",
    "abertura": "data_abertura_proposta",
    "publicacao": "data_inclusao",
}


def create_default_ui_filters() -> dict[str, Any]:
    return {
        "pncp": "",
        "orgao": "",
        "cnpj": "",
        "uasg": "",
        "uf": [],
        "municipio": "",
        "modalidade_id": list(FILTER_MODALIDADE_VALUES),
        "modo_id": list(FILTER_MODO_VALUES),
        "date_field": "encerramento",
        "date_start": "",
        "date_end": "",
    }


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _normalize_date(value: Any) -> str:
    text = _normalize_text(value)
    if not text:
        return ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text):
        return text
    match = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", text)
    if not match:
        return ""
    return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"


def _normalize_multi(value: Any, valid_values: tuple[str, ...]) -> list[str]:
    if isinstance(value, list):
        items = value
    elif value in (None, ""):
        items = []
    else:
        items = [value]

    valid = set(valid_values)
    seen: set[str] = set()
    normalized: list[str] = []
    for item in items:
        text = _normalize_text(item)
        if not text or text not in valid or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def normalize_ui_filters(payload: dict[str, Any] | None) -> dict[str, Any]:
    defaults = create_default_ui_filters()
    source = payload if isinstance(payload, dict) else {}
    start_date = _normalize_date(source.get("date_start"))
    end_date = _normalize_date(source.get("date_end"))
    if start_date and end_date and end_date < start_date:
        end_date = start_date

    date_field = _normalize_text(source.get("date_field")) or defaults["date_field"]
    if date_field not in FILTER_DATE_FIELDS:
        date_field = defaults["date_field"]

    return {
        **defaults,
        "pncp": _normalize_text(source.get("pncp")),
        "orgao": _normalize_text(source.get("orgao")),
        "cnpj": _normalize_text(source.get("cnpj")),
        "uasg": _normalize_text(source.get("uasg")),
        "uf": _normalize_multi(source.get("uf"), FILTER_UF_OPTIONS),
        "municipio": _normalize_text(source.get("municipio")),
        "modalidade_id": _normalize_multi(
            source.get("modalidade_id", source.get("modalidade")),
            FILTER_MODALIDADE_VALUES,
        ),
        "modo_id": _normalize_multi(
            source.get("modo_id", source.get("modo")),
            FILTER_MODO_VALUES,
        ),
        "date_field": date_field,
        "date_start": start_date,
        "date_end": end_date,
    }


def has_any_ui_filter(payload: dict[str, Any] | None) -> bool:
    filters = normalize_ui_filters(payload)
    if filters["pncp"] or filters["orgao"] or filters["cnpj"] or filters["uasg"]:
        return True
    if filters["uf"] or filters["municipio"]:
        return True
    if 0 < len(filters["modalidade_id"]) < len(FILTER_MODALIDADE_VALUES):
        return True
    if 0 < len(filters["modo_id"]) < len(FILTER_MODO_VALUES):
        return True
    if filters["date_start"] or filters["date_end"]:
        return True
    return False


def _escape_sql_text(value: str) -> str:
    return value.replace("'", "''")


def _escape_sql_like(value: str) -> str:
    return _escape_sql_text(value).replace("%", "%%")


def build_sql_conditions_from_ui_filters(payload: dict[str, Any] | None) -> list[str]:
    filters = normalize_ui_filters(payload)
    conditions: list[str] = []

    if filters["pncp"]:
        conditions.append(f"c.numero_controle_pncp = '{_escape_sql_text(filters['pncp'])}'")

    if filters["orgao"]:
        orgao = _escape_sql_like(filters["orgao"])
        conditions.append(
            "( c.orgao_entidade_razao_social ILIKE "
            f"'%{orgao}%' OR c.unidade_orgao_nome_unidade ILIKE '%{orgao}%' )"
        )

    if filters["cnpj"]:
        conditions.append(f"c.orgao_entidade_cnpj = '{_escape_sql_text(filters['cnpj'])}'")

    if filters["uasg"]:
        conditions.append(f"c.unidade_orgao_codigo_unidade = '{_escape_sql_text(filters['uasg'])}'")

    if 0 < len(filters["uf"]) < len(FILTER_UF_OPTIONS):
        if len(filters["uf"]) == 1:
            conditions.append(f"c.unidade_orgao_uf_sigla = '{_escape_sql_text(filters['uf'][0])}'")
        else:
            values = ", ".join(f"'{_escape_sql_text(item)}'" for item in filters["uf"])
            conditions.append(f"c.unidade_orgao_uf_sigla IN ({values})")

    if filters["municipio"]:
        municipios = [
            _escape_sql_like(part)
            for part in (piece.strip() for piece in filters["municipio"].split(","))
            if part
        ]
        if municipios:
            ors = [f"c.unidade_orgao_municipio_nome ILIKE '%{item}%'" for item in municipios]
            conditions.append("( " + " OR ".join(ors) + " )")

    if 0 < len(filters["modalidade_id"]) < len(FILTER_MODALIDADE_VALUES):
        if len(filters["modalidade_id"]) == 1:
            conditions.append(
                f"c.modalidade_id = '{_escape_sql_text(filters['modalidade_id'][0])}'"
            )
        else:
            values = ", ".join(f"'{_escape_sql_text(item)}'" for item in filters["modalidade_id"])
            conditions.append(f"c.modalidade_id IN ({values})")

    if 0 < len(filters["modo_id"]) < len(FILTER_MODO_VALUES):
        if len(filters["modo_id"]) == 1:
            conditions.append(
                f"c.modo_disputa_id = '{_escape_sql_text(filters['modo_id'][0])}'"
            )
        else:
            values = ", ".join(f"'{_escape_sql_text(item)}'" for item in filters["modo_id"])
            conditions.append(f"c.modo_disputa_id IN ({values})")

    date_column = FILTER_DATE_FIELDS.get(filters["date_field"], FILTER_DATE_FIELDS["encerramento"])
    if filters["date_start"] and filters["date_end"]:
        conditions.append(
            "to_date(NULLIF(c.{col},''),'YYYY-MM-DD') BETWEEN "
            "to_date('{start}','YYYY-MM-DD') AND to_date('{end}','YYYY-MM-DD')".format(
                col=date_column,
                start=filters["date_start"],
                end=filters["date_end"],
            )
        )
    elif filters["date_start"]:
        conditions.append(
            "to_date(NULLIF(c.{col},''),'YYYY-MM-DD') >= to_date('{start}','YYYY-MM-DD')".format(
                col=date_column,
                start=filters["date_start"],
            )
        )
    elif filters["date_end"]:
        conditions.append(
            "to_date(NULLIF(c.{col},''),'YYYY-MM-DD') <= to_date('{end}','YYYY-MM-DD')".format(
                col=date_column,
                end=filters["date_end"],
            )
        )

    return conditions
