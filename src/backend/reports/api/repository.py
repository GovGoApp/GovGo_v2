from __future__ import annotations

import datetime as _dt
import json
import os
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any, Sequence

import psycopg2

from src.backend.search.core.bootstrap import bootstrap_v1_search_environment


BOOTSTRAP_ENV = bootstrap_v1_search_environment()

REPORT_TABLES = (
    "public.user_report_chats",
    "public.user_report_messages",
    "public.user_reports",
    "public.user_report_workspace",
)

_SCHEMA_READY: bool | None = None


class ReportsRepositoryError(Exception):
    pass


def _looks_like_placeholder(value: str) -> bool:
    normalized = (value or "").strip().strip('"').strip("'").lower()
    return (
        not normalized
        or "sua_chave" in normalized
        or "your_" in normalized
        or normalized.endswith("_aqui")
        or normalized == "placeholder"
    )


def _db_connect_kwargs() -> dict[str, Any]:
    host = os.getenv("SUPABASE_HOST", "").strip()
    user = os.getenv("SUPABASE_USER", "").strip()
    password = os.getenv("SUPABASE_PASSWORD", "").strip()
    dbname = os.getenv("SUPABASE_DBNAME", "postgres").strip() or "postgres"
    port = os.getenv("SUPABASE_PORT", "6543").strip() or "6543"
    missing = [name for name, value in (
        ("SUPABASE_HOST", host),
        ("SUPABASE_USER", user),
        ("SUPABASE_PASSWORD", password),
    ) if not value or _looks_like_placeholder(value)]
    if missing:
        raise ReportsRepositoryError(f"Configuracao de banco ausente: {', '.join(missing)}.")
    return {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
        "connect_timeout": 10,
        "application_name": "govgo-v2-reports-repository",
    }


def _connect():
    return psycopg2.connect(**_db_connect_kwargs())


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, set):
        return [_json_safe(item) for item in value]
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value


def _json_param(value: Any) -> str:
    return json.dumps(_json_safe(value), ensure_ascii=False)


def _rows_to_dicts(cur, rows: Sequence[Sequence[Any]]) -> list[dict[str, Any]]:
    columns = [column[0] for column in (cur.description or [])]
    return [dict(zip(columns, row)) for row in rows]


def _fetch_all(sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            return _rows_to_dicts(cur, cur.fetchall())
    finally:
        conn.close()


def _fetch_one(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            row = cur.fetchone()
            return _rows_to_dicts(cur, [row])[0] if row else None
    finally:
        conn.close()


def _execute(sql: str, params: Sequence[Any] | None = None) -> int:
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            affected = int(cur.rowcount or 0)
        conn.commit()
        return affected
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _execute_returning_one(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            row = cur.fetchone()
            result = _rows_to_dicts(cur, [row])[0] if row else None
        conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def apply_sql_file(path: str | Path) -> None:
    global _SCHEMA_READY
    sql = Path(path).read_text(encoding="utf-8")
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        _SCHEMA_READY = None
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def schema_ready(*, force: bool = False) -> bool:
    global _SCHEMA_READY
    if _SCHEMA_READY is not None and not force:
        return _SCHEMA_READY
    try:
        rows = _fetch_all(
            "SELECT to_regclass(%s) AS table_name",
            ("public.user_report_chats",),
        )
        if not rows or not rows[0].get("table_name"):
            _SCHEMA_READY = False
            return False
        for table in REPORT_TABLES[1:]:
            row = _fetch_one("SELECT to_regclass(%s) AS table_name", (table,))
            if not row or not row.get("table_name"):
                _SCHEMA_READY = False
                return False
        _SCHEMA_READY = True
        return True
    except Exception:
        _SCHEMA_READY = False
        return False


def _iso(value: Any) -> str:
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.isoformat()
    return str(value or "")


def _uuid_or_none(value: Any) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return str(uuid.UUID(text))
    except Exception:
        return None


def _list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return []


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _chat_exists(user_id: str, chat_id: str | None) -> bool:
    if not chat_id:
        return False
    row = _fetch_one(
        """
        SELECT 1
          FROM public.user_report_chats
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
         LIMIT 1
        """,
        (user_id, chat_id),
    )
    return bool(row)


def _report_exists(user_id: str, report_id: str | None) -> bool:
    if not report_id:
        return False
    row = _fetch_one(
        """
        SELECT 1
          FROM public.user_reports
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
         LIMIT 1
        """,
        (user_id, report_id),
    )
    return bool(row)


def report_row_to_item(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id") or ""),
        "userId": str(row.get("user_id") or ""),
        "title": str(row.get("title") or row.get("question") or "Relatorio"),
        "subtitle": str(row.get("subtitle") or ""),
        "question": str(row.get("question") or ""),
        "sql": str(row.get("sql") or ""),
        "executedSql": str(row.get("executed_sql") or ""),
        "columns": _list(row.get("columns")),
        "previewRows": _list(row.get("preview_rows")),
        "rowCount": int(row.get("row_count") or 0),
        "elapsedMs": int(row.get("elapsed_ms") or 0),
        "status": str(row.get("status") or "ok"),
        "error": str(row.get("error") or ""),
        "saved": bool(row.get("is_favorite")),
        "chatId": str(row.get("chat_id") or ""),
        "createdAt": _iso(row.get("created_at")),
    }


def message_row_to_item(row: dict[str, Any]) -> dict[str, Any]:
    metadata = _dict(row.get("metadata"))
    item = {
        "id": str(row.get("id") or ""),
        "role": str(row.get("role") or ""),
        "text": str(row.get("content") or ""),
        "sql": str(row.get("sql") or ""),
        "reportId": str(row.get("report_id") or ""),
        "reportTitle": str(row.get("report_title") or ""),
        "reportSubtitle": str(row.get("report_subtitle") or ""),
        "rowCount": int(row.get("row_count") or 0),
        "status": str(row.get("status") or "ok"),
        "error": str(row.get("error") or ""),
        "messageOrder": int(row.get("message_order") or 0),
        "createdAt": _iso(row.get("created_at")),
    }
    if metadata.get("reportDeleted"):
        item["reportDeleted"] = True
    return item


def chat_row_to_item(row: dict[str, Any], messages: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    message_items = messages or []
    report_ids = [
        str(message.get("reportId") or "")
        for message in message_items
        if message.get("reportId")
    ]
    return {
        "id": str(row.get("id") or ""),
        "userId": str(row.get("user_id") or ""),
        "threadId": str(row.get("openai_thread_id") or ""),
        "title": str(row.get("title") or "Novo chat"),
        "createdAt": _iso(row.get("created_at")),
        "updatedAt": _iso(row.get("updated_at")),
        "messages": message_items,
        "reportIds": list(dict.fromkeys(report_ids)),
    }


def find_report(user_id: str, report_id: str) -> dict[str, Any] | None:
    row = _fetch_one(
        """
        SELECT *
          FROM public.user_reports
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
         LIMIT 1
        """,
        (user_id, report_id),
    )
    return report_row_to_item(row) if row else None


def list_reports(user_id: str, *, limit: int = 50, saved_only: bool = False) -> list[dict[str, Any]]:
    where_saved = "AND is_favorite IS TRUE" if saved_only else ""
    rows = _fetch_all(
        f"""
        SELECT *
          FROM public.user_reports
         WHERE user_id = %s
           AND deleted_at IS NULL
           {where_saved}
         ORDER BY
           CASE WHEN %s THEN COALESCE(favorited_at, created_at) ELSE created_at END DESC,
           created_at DESC
         LIMIT %s
        """,
        (user_id, bool(saved_only), max(1, int(limit or 50))),
    )
    return [report_row_to_item(row) for row in rows]


def create_report(user_id: str, item: dict[str, Any]) -> dict[str, Any]:
    report_id = _uuid_or_none(item.get("id")) or str(uuid.uuid4())
    chat_id = _uuid_or_none(item.get("chatId"))
    if chat_id and not _chat_exists(user_id, chat_id):
        chat_id = None
    row = _execute_returning_one(
        """
        INSERT INTO public.user_reports (
            id, user_id, chat_id, question, sql, executed_sql, title, subtitle,
            columns, preview_rows, row_count, elapsed_ms, status, error,
            is_favorite, favorited_at, metadata
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s,
            %s::jsonb, %s::jsonb, %s, %s, %s, %s,
            %s, CASE WHEN %s THEN now() ELSE NULL END, %s::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
            chat_id = EXCLUDED.chat_id,
            question = EXCLUDED.question,
            sql = EXCLUDED.sql,
            executed_sql = EXCLUDED.executed_sql,
            title = EXCLUDED.title,
            subtitle = EXCLUDED.subtitle,
            columns = EXCLUDED.columns,
            preview_rows = EXCLUDED.preview_rows,
            row_count = EXCLUDED.row_count,
            elapsed_ms = EXCLUDED.elapsed_ms,
            status = EXCLUDED.status,
            error = EXCLUDED.error,
            is_favorite = EXCLUDED.is_favorite,
            favorited_at = EXCLUDED.favorited_at,
            updated_at = now(),
            deleted_at = NULL,
            metadata = EXCLUDED.metadata
        RETURNING *
        """,
        (
            report_id,
            user_id,
            chat_id,
            str(item.get("question") or ""),
            str(item.get("sql") or ""),
            str(item.get("executedSql") or ""),
            str(item.get("title") or item.get("question") or "Relatorio"),
            str(item.get("subtitle") or ""),
            _json_param(item.get("columns") or []),
            _json_param(item.get("previewRows") or []),
            int(item.get("rowCount") or 0),
            int(item.get("elapsedMs") or 0),
            str(item.get("status") or "ok"),
            str(item.get("error") or ""),
            bool(item.get("saved")),
            bool(item.get("saved")),
            _json_param(item.get("metadata") or {}),
        ),
    )
    if not row:
        raise ReportsRepositoryError("Falha ao criar relatorio.")
    return report_row_to_item(row)


def mark_report_saved(user_id: str, report_id: str, saved: bool = True) -> dict[str, Any] | None:
    row = _execute_returning_one(
        """
        UPDATE public.user_reports
           SET is_favorite = %s,
               favorited_at = CASE WHEN %s THEN COALESCE(favorited_at, now()) ELSE NULL END,
               updated_at = now()
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
        RETURNING *
        """,
        (bool(saved), bool(saved), user_id, report_id),
    )
    return report_row_to_item(row) if row else None


def touch_report_opened(user_id: str, report_id: str) -> None:
    _execute(
        """
        UPDATE public.user_reports
           SET last_opened_at = now(), updated_at = now()
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
        """,
        (user_id, report_id),
    )


def delete_report(user_id: str, report_id: str) -> bool:
    affected = _execute(
        """
        UPDATE public.user_reports
           SET deleted_at = now(), updated_at = now()
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
        """,
        (user_id, report_id),
    )
    if affected:
        _execute(
            """
            UPDATE public.user_report_messages
               SET report_id = NULL,
                   status = CASE WHEN role = 'assistant' THEN 'deleted' ELSE status END,
                   metadata = COALESCE(metadata, '{}'::jsonb) || '{"reportDeleted": true}'::jsonb
             WHERE user_id = %s
               AND report_id = %s
            """,
            (user_id, report_id),
        )
    return affected > 0


def _messages_for_chat(user_id: str, chat_id: str) -> list[dict[str, Any]]:
    rows = _fetch_all(
        """
        SELECT *
          FROM public.user_report_messages
         WHERE user_id = %s
           AND chat_id = %s
         ORDER BY message_order ASC, created_at ASC, id ASC
        """,
        (user_id, chat_id),
    )
    return [message_row_to_item(row) for row in rows]


def find_chat(user_id: str, chat_id: str) -> dict[str, Any] | None:
    row = _fetch_one(
        """
        SELECT *
          FROM public.user_report_chats
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
         LIMIT 1
        """,
        (user_id, chat_id),
    )
    if not row:
        return None
    return chat_row_to_item(row, _messages_for_chat(user_id, chat_id))


def list_chats(user_id: str, *, limit: int = 50, include_messages: bool = True) -> list[dict[str, Any]]:
    rows = _fetch_all(
        """
        SELECT *
          FROM public.user_report_chats
         WHERE user_id = %s
           AND deleted_at IS NULL
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT %s
        """,
        (user_id, max(1, int(limit or 50))),
    )
    chats = []
    for row in rows:
        chat_id = str(row.get("id") or "")
        messages = _messages_for_chat(user_id, chat_id) if include_messages else []
        chats.append(chat_row_to_item(row, messages))
    return chats


def save_chat(chat: dict[str, Any]) -> dict[str, Any]:
    user_id = str(chat.get("userId") or "").strip()
    if not user_id:
        raise ReportsRepositoryError("Chat sem usuario.")
    chat_id = _uuid_or_none(chat.get("id")) or str(uuid.uuid4())
    now = _dt.datetime.now(_dt.timezone.utc).isoformat()
    created_at = str(chat.get("createdAt") or now)
    updated_at = str(chat.get("updatedAt") or now)
    row = _execute_returning_one(
        """
        INSERT INTO public.user_report_chats (
            id, user_id, openai_thread_id, title, active, created_at, updated_at, deleted_at, metadata
        )
        VALUES (%s, %s, %s, %s, true, %s, %s, NULL, %s::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            openai_thread_id = EXCLUDED.openai_thread_id,
            title = EXCLUDED.title,
            active = true,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL,
            metadata = EXCLUDED.metadata
        RETURNING *
        """,
        (
            chat_id,
            user_id,
            str(chat.get("threadId") or ""),
            str(chat.get("title") or "Novo chat"),
            created_at,
            updated_at,
            _json_param(chat.get("metadata") or {}),
        ),
    )
    if not row:
        raise ReportsRepositoryError("Falha ao salvar chat.")

    messages = []
    ordered_messages = list(chat.get("messages") or [])[-200:]
    for message_order, message in enumerate(ordered_messages):
        if not isinstance(message, dict):
            continue
        message_id = _uuid_or_none(message.get("id")) or str(uuid.uuid4())
        role = str(message.get("role") or "").strip()
        if role not in {"user", "assistant"}:
            continue
        report_id = _uuid_or_none(message.get("reportId"))
        if report_id and not _report_exists(user_id, report_id):
            report_id = None
        if message.get("reportDeleted"):
            report_id = None
        metadata = {}
        if message.get("reportDeleted"):
            metadata["reportDeleted"] = True
        _execute(
            """
            INSERT INTO public.user_report_messages (
                id, user_id, chat_id, role, content, sql, report_id, report_title,
                report_subtitle, row_count, status, error, message_order, created_at, metadata
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s::jsonb
            )
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                sql = EXCLUDED.sql,
                report_id = EXCLUDED.report_id,
                report_title = EXCLUDED.report_title,
                report_subtitle = EXCLUDED.report_subtitle,
                row_count = EXCLUDED.row_count,
                status = EXCLUDED.status,
                error = EXCLUDED.error,
                message_order = EXCLUDED.message_order,
                metadata = EXCLUDED.metadata
            """,
            (
                message_id,
                user_id,
                chat_id,
                role,
                str(message.get("text") or message.get("content") or ""),
                str(message.get("sql") or ""),
                report_id,
                str(message.get("reportTitle") or ""),
                str(message.get("reportSubtitle") or ""),
                int(message.get("rowCount") or 0),
                str(message.get("status") or "ok"),
                str(message.get("error") or ""),
                int(message.get("messageOrder") if message.get("messageOrder") is not None else message_order),
                str(message.get("createdAt") or now),
                _json_param(metadata),
            ),
        )
        saved_message = dict(message)
        saved_message["id"] = message_id
        messages.append(saved_message)

    return chat_row_to_item(row, _messages_for_chat(user_id, chat_id))


def delete_chat(user_id: str, chat_id: str) -> bool:
    affected = _execute(
        """
        UPDATE public.user_report_chats
           SET deleted_at = now(), active = false, updated_at = now()
         WHERE user_id = %s
           AND id = %s
           AND deleted_at IS NULL
        """,
        (user_id, chat_id),
    )
    return affected > 0


def get_workspace(user_id: str) -> dict[str, Any]:
    row = _fetch_one(
        """
        SELECT *
          FROM public.user_report_workspace
         WHERE user_id = %s
         LIMIT 1
        """,
        (user_id,),
    )
    if not row:
        return {}

    raw_tabs = _list(row.get("tabs"))
    tabs = []
    reports: dict[str, Any] = {}
    for tab in raw_tabs:
        if not isinstance(tab, dict):
            continue
        report_id = _uuid_or_none(tab.get("id"))
        if not report_id:
            continue
        report = find_report(user_id, report_id)
        if report:
            tabs.append(tab)
            reports[report_id] = report

    active_chat_id = str(row.get("active_chat_id") or "")
    active_chat = find_chat(user_id, active_chat_id) if active_chat_id else {}
    active_report_id = str(row.get("active_report_id") or "")
    if active_report_id not in reports:
        active_report_id = "intro"

    return {
        "version": 1,
        "activeId": active_report_id,
        "historyMode": str(row.get("history_mode") or "chats"),
        "chatOpen": bool(row.get("chat_open", True)),
        "activeChat": active_chat or {"id": "", "title": "Novo chat", "messages": []},
        "tabs": tabs,
        "reports": reports,
        "updatedAt": _iso(row.get("updated_at")),
    }


def save_workspace(user_id: str, workspace: dict[str, Any]) -> dict[str, Any]:
    active_chat = workspace.get("activeChat") if isinstance(workspace.get("activeChat"), dict) else {}
    active_chat_id = _uuid_or_none(active_chat.get("id") or workspace.get("activeChatId"))
    active_report_id = _uuid_or_none(workspace.get("activeId") or workspace.get("activeReportId"))
    if active_chat_id and not _chat_exists(user_id, active_chat_id):
        active_chat_id = None
    if active_report_id and not _report_exists(user_id, active_report_id):
        active_report_id = None
    tabs = _list(workspace.get("tabs"))[-20:]
    row = _execute_returning_one(
        """
        INSERT INTO public.user_report_workspace (
            user_id, active_chat_id, active_report_id, history_mode, chat_open, tabs, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s::jsonb, now())
        ON CONFLICT (user_id) DO UPDATE SET
            active_chat_id = EXCLUDED.active_chat_id,
            active_report_id = EXCLUDED.active_report_id,
            history_mode = EXCLUDED.history_mode,
            chat_open = EXCLUDED.chat_open,
            tabs = EXCLUDED.tabs,
            updated_at = now()
        RETURNING *
        """,
        (
            user_id,
            active_chat_id,
            active_report_id,
            str(workspace.get("historyMode") or "chats"),
            bool(workspace.get("chatOpen", True)),
            _json_param(tabs),
        ),
    )
    return get_workspace(user_id) if row else {}


def counts() -> dict[str, int]:
    output: dict[str, int] = {}
    for table in REPORT_TABLES:
        row = _fetch_one(f"SELECT COUNT(*) AS count FROM {table}")
        output[table.rsplit(".", 1)[-1]] = int(row.get("count") or 0) if row else 0
    return output
