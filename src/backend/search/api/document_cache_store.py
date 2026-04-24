from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "govgo_v2.sqlite3"


def _ensure_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS edital_document_artifacts (
            artifact_key TEXT PRIMARY KEY,
            pncp_id TEXT NOT NULL,
            document_name TEXT NOT NULL DEFAULT '',
            document_url TEXT NOT NULL DEFAULT '',
            artifact_value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_edital_document_artifacts_pncp
        ON edital_document_artifacts (pncp_id)
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS edital_document_summaries (
            pncp_id TEXT PRIMARY KEY,
            summary_value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


def build_document_artifact_key(
    pncp_id: str,
    document_url: str,
    document_name: str,
) -> str:
    digest = hashlib.sha1(
        "|".join(
            [
                str(pncp_id or "").strip(),
                str(document_url or "").strip(),
                str(document_name or "").strip(),
            ]
        ).encode("utf-8")
    ).hexdigest()
    return digest


def load_document_artifact(
    pncp_id: str,
    document_url: str,
    document_name: str,
) -> dict[str, Any] | None:
    artifact_key = build_document_artifact_key(pncp_id, document_url, document_name)
    with _ensure_db() as connection:
        row = connection.execute(
            """
            SELECT artifact_value, updated_at
              FROM edital_document_artifacts
             WHERE artifact_key = ?
             LIMIT 1
            """,
            (artifact_key,),
        ).fetchone()

    if not row or not row[0]:
        return None

    try:
        payload = json.loads(row[0])
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None

    payload.setdefault("cache_key", artifact_key)
    payload.setdefault("updated_at", row[1] or "")
    return payload


def save_document_artifact(
    pncp_id: str,
    document_url: str,
    document_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    artifact_key = build_document_artifact_key(pncp_id, document_url, document_name)
    artifact = dict(payload or {})
    artifact["cache_key"] = artifact_key
    artifact["pncp_id"] = str(pncp_id or "").strip()
    artifact["document_url"] = str(document_url or "").strip()
    artifact["document_name"] = str(document_name or "").strip()
    body = json.dumps(artifact, ensure_ascii=False)

    with _ensure_db() as connection:
        connection.execute(
            """
            INSERT INTO edital_document_artifacts (
                artifact_key,
                pncp_id,
                document_name,
                document_url,
                artifact_value,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(artifact_key) DO UPDATE SET
                pncp_id = excluded.pncp_id,
                document_name = excluded.document_name,
                document_url = excluded.document_url,
                artifact_value = excluded.artifact_value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                artifact_key,
                artifact["pncp_id"],
                artifact["document_name"],
                artifact["document_url"],
                body,
            ),
        )
        row = connection.execute(
            """
            SELECT updated_at
              FROM edital_document_artifacts
             WHERE artifact_key = ?
             LIMIT 1
            """,
            (artifact_key,),
        ).fetchone()
        connection.commit()

    artifact["updated_at"] = (row[0] if row else "") or ""
    return artifact


def load_document_artifact_status_map(pncp_id: str) -> dict[str, dict[str, Any]]:
    with _ensure_db() as connection:
        rows = connection.execute(
            """
            SELECT artifact_key, artifact_value, updated_at
              FROM edital_document_artifacts
             WHERE pncp_id = ?
            """,
            (str(pncp_id or "").strip(),),
        ).fetchall()

    status_map: dict[str, dict[str, Any]] = {}
    for artifact_key, raw_payload, updated_at in rows:
        try:
            payload = json.loads(raw_payload)
        except Exception:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}
        summary_text = str(payload.get("summary") or "").strip()
        markdown_text = str(payload.get("markdown") or "").strip()
        markdown_path = str(payload.get("markdown_path") or "").strip()
        status_map[str(artifact_key)] = {
            "has_summary": bool(summary_text),
            "has_markdown": bool(markdown_text or markdown_path),
            "updated_at": str(updated_at or ""),
        }
    return status_map


def load_edital_documents_summary(pncp_id: str) -> dict[str, Any] | None:
    with _ensure_db() as connection:
        row = connection.execute(
            """
            SELECT summary_value, updated_at
              FROM edital_document_summaries
             WHERE pncp_id = ?
             LIMIT 1
            """,
            (str(pncp_id or "").strip(),),
        ).fetchone()

    if not row or not row[0]:
        return None

    try:
        payload = json.loads(row[0])
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None

    payload.setdefault("pncp_id", str(pncp_id or "").strip())
    payload.setdefault("updated_at", row[1] or "")
    return payload


def save_edital_documents_summary(pncp_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    summary_payload = dict(payload or {})
    summary_payload["pncp_id"] = str(pncp_id or "").strip()
    body = json.dumps(summary_payload, ensure_ascii=False)

    with _ensure_db() as connection:
        connection.execute(
            """
            INSERT INTO edital_document_summaries (pncp_id, summary_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(pncp_id) DO UPDATE SET
                summary_value = excluded.summary_value,
                updated_at = CURRENT_TIMESTAMP
            """,
            (summary_payload["pncp_id"], body),
        )
        row = connection.execute(
            """
            SELECT updated_at
              FROM edital_document_summaries
             WHERE pncp_id = ?
             LIMIT 1
            """,
            (summary_payload["pncp_id"],),
        ).fetchone()
        connection.commit()

    summary_payload["updated_at"] = (row[0] if row else "") or ""
    return summary_payload
