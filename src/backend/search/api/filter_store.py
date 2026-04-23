from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from src.backend.search.core.ui_filters import create_default_ui_filters, normalize_ui_filters


PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "govgo_v2.sqlite3"
FILTERS_KEY = "search.default_filters"


def _ensure_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS app_config (
            config_key TEXT PRIMARY KEY,
            config_value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


def load_search_filters() -> dict[str, Any]:
    with _ensure_db() as connection:
        row = connection.execute(
            "SELECT config_value FROM app_config WHERE config_key = ?",
            (FILTERS_KEY,),
        ).fetchone()

    if not row or not row[0]:
        return create_default_ui_filters()

    try:
        payload = json.loads(row[0])
    except Exception:
        return create_default_ui_filters()

    if not isinstance(payload, dict):
        return create_default_ui_filters()
    return normalize_ui_filters(payload)


def save_search_filters(payload: dict[str, Any] | None) -> dict[str, Any]:
    filters = normalize_ui_filters(payload)
    body = json.dumps(filters, ensure_ascii=False)
    with _ensure_db() as connection:
        connection.execute(
            """
            INSERT INTO app_config (config_key, config_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = excluded.config_value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (FILTERS_KEY, body),
        )
        connection.commit()
    return filters
