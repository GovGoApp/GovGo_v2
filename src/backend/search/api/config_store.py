from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "govgo_v2.sqlite3"
CONFIG_KEY = "search.default_config"

DEFAULT_SEARCH_CONFIG: dict[str, Any] = {
    "searchType": "semantic",
    "searchApproach": "direct",
    "relevanceLevel": 1,
    "sortMode": 1,
    "limit": 10,
    "categorySearchBase": "semantic",
    "topCategoriesLimit": 10,
    "preprocess": True,
    "filterExpired": True,
    "useNegation": True,
    "minSimilarity": 0,
}


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


def _normalize_search_config(payload: dict[str, Any] | None) -> dict[str, Any]:
    config = dict(DEFAULT_SEARCH_CONFIG)
    for key in DEFAULT_SEARCH_CONFIG:
        if payload and key in payload:
            config[key] = payload[key]
    return config


def load_search_config() -> dict[str, Any]:
    with _ensure_db() as connection:
        row = connection.execute(
            "SELECT config_value FROM app_config WHERE config_key = ?",
            (CONFIG_KEY,),
        ).fetchone()

    if not row or not row[0]:
        return dict(DEFAULT_SEARCH_CONFIG)

    try:
        payload = json.loads(row[0])
    except Exception:
        return dict(DEFAULT_SEARCH_CONFIG)

    if not isinstance(payload, dict):
        return dict(DEFAULT_SEARCH_CONFIG)
    return _normalize_search_config(payload)


def save_search_config(payload: dict[str, Any] | None) -> dict[str, Any]:
    config = _normalize_search_config(payload)
    body = json.dumps(config, ensure_ascii=False)
    with _ensure_db() as connection:
        connection.execute(
            """
            INSERT INTO app_config (config_key, config_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = excluded.config_value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (CONFIG_KEY, body),
        )
        connection.commit()
    return config
