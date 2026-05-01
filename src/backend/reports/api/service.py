from __future__ import annotations

import base64
import csv
import datetime as _dt
import io
import json
import os
import re
import threading
import time
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any

import psycopg2

from src.backend.reports.api import repository as reports_repository
from src.backend.search.core.bootstrap import bootstrap_v1_search_environment


BOOTSTRAP_ENV = bootstrap_v1_search_environment()
DATA_DIR = Path(BOOTSTRAP_ENV["v2_root"]) / "data"
HISTORY_PATH = DATA_DIR / "reports_history.json"
CHATS_PATH = DATA_DIR / "reports_chats.json"
WORKSPACE_PATH = DATA_DIR / "reports_workspace.json"
HISTORY_LOCK = threading.Lock()
CHATS_LOCK = threading.Lock()
WORKSPACE_LOCK = threading.Lock()

DEFAULT_LIMIT = 1000
EXPORT_LIMIT = 10000
STATEMENT_TIMEOUT_MS = 90000
REPORTS_STORAGE = os.getenv("GOVGO_REPORTS_STORAGE", "auto").strip().lower()


class ReportsApiError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _reports_db_ready() -> bool:
    if REPORTS_STORAGE == "json":
        return False
    return reports_repository.schema_ready()


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


def _text(payload: dict[str, Any] | None, *keys: str) -> str:
    source = payload or {}
    for key in keys:
        value = source.get(key)
        if value is not None:
            return str(value).strip()
    return ""


def _looks_like_placeholder(value: str) -> bool:
    normalized = (value or "").strip().strip('"').strip("'").lower()
    return (
        not normalized
        or "sua_chave" in normalized
        or "your_" in normalized
        or normalized.endswith("_aqui")
        or normalized == "placeholder"
    )


def _assistant_id() -> str:
    candidates = (
        "OPENAI_ASSISTANT_SQL_SUPABASE_v1",
        "OPENAI_ASSISTANT_PNCP_SQL_SUPABASE_v1_4",
        "OPENAI_ASSISTANT_PNCP_SQL_SUPABASE_v1_2",
        "OPENAI_ASSISTANT_PNCP_SQL_SUPABASE_v1",
        "OPENAI_ASSISTANT_REPORTS_V4",
        "OPENAI_ASSISTANT_REPORTS_V3",
        "OPENAI_ASSISTANT_REPORTS_V2",
        "OPENAI_ASSISTANT_REPORTS_V1",
        "OPENAI_ASSISTANT_REPORTS_V0",
        "OPENAI_ASSISTANT_SUPABASE_REPORTS",
    )
    for key in candidates:
        value = os.getenv(key, "").strip()
        if value and not _looks_like_placeholder(value):
            return value
    return ""


def _title_assistant_id() -> str:
    value = os.getenv("OPENAI_ASSISTANT_REPORT_TITLE_v0", "").strip()
    return value if value and not _looks_like_placeholder(value) else ""


def _openai_client():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if _looks_like_placeholder(api_key):
        raise ReportsApiError("OPENAI_API_KEY nao esta configurada para o Modo Relatorio.", 500)
    try:
        from openai import OpenAI
    except Exception as exc:  # pragma: no cover
        raise ReportsApiError(f"Pacote openai indisponivel: {exc}", 500) from exc
    return OpenAI(api_key=api_key)


def _message_text(message: Any) -> str:
    blocks = getattr(message, "content", None)
    if blocks is None:
        blocks = message.get("content") if isinstance(message, dict) else message
    if not isinstance(blocks, list):
        blocks = [blocks]

    parts: list[str] = []
    for block in blocks:
        if isinstance(block, dict):
            if isinstance(block.get("text"), dict):
                parts.append(str(block["text"].get("value") or ""))
            elif "text" in block:
                parts.append(str(block.get("text") or ""))
            else:
                parts.append(str(block))
            continue
        text = getattr(block, "text", None)
        if text is not None and hasattr(text, "value"):
            parts.append(str(text.value or ""))
        else:
            parts.append(str(block or ""))
    return "\n".join(part for part in parts if part).strip()


def _extract_sql(raw_text: str) -> str:
    text = str(raw_text or "").strip()
    if not text:
        return ""

    fenced = re.search(r"```(?:sql)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fenced:
        text = fenced.group(1)

    start = re.search(r"\b(with|select)\b", text, flags=re.IGNORECASE)
    if start:
        text = text[start.start():]

    text = text.replace("```sql", "").replace("```", "")
    text = " ".join(text.replace("\r", " ").replace("\n", " ").split())
    return text.strip()


def _extract_json_object(raw_text: str) -> dict[str, Any]:
    text = str(raw_text or "").strip()
    if not text:
        return {}
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start:end + 1]
    try:
        data = json.loads(text)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _fallback_report_title(question: str, sql: str = "") -> dict[str, str]:
    source = " ".join(str(question or "").split()) or " ".join(str(sql or "").split()) or "Relatorio"
    title = source[:70].strip() or "Relatorio"
    return {"title": title, "subtitle": ""}


def generate_report_title(
    *,
    question: str,
    sql: str,
    columns: list[str] | None = None,
    row_count: int | None = None,
    sample_rows: list[dict[str, Any]] | None = None,
) -> dict[str, str]:
    fallback = _fallback_report_title(question, sql)
    assistant_id = _title_assistant_id()
    if not assistant_id:
        return fallback

    prompt = {
        "question": str(question or ""),
        "sql": str(sql or ""),
        "columns": list(columns or [])[:30],
        "rowCount": int(row_count or 0),
        "sampleRows": list(sample_rows or [])[:3],
    }
    client = _openai_client()
    try:
        thread = client.beta.threads.create()
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=[{"type": "text", "text": json.dumps(_json_safe(prompt), ensure_ascii=False)}],
        )
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id,
            assistant_id=assistant_id,
        )
        if getattr(run, "status", "") != "completed":
            return fallback
        messages = list(client.beta.threads.messages.list(thread_id=thread.id))
        assistant_messages = [msg for msg in messages if getattr(msg, "role", "") == "assistant"]
        if not assistant_messages:
            return fallback
        data = _extract_json_object(_message_text(assistant_messages[0]))
        title = " ".join(str(data.get("title") or "").split())[:70].strip()
        subtitle = " ".join(str(data.get("subtitle") or "").split())[:110].strip()
        if not title:
            return fallback
        normalized_title = re.sub(r"\s+", " ", title).strip().lower()
        normalized_subtitle = re.sub(r"\s+", " ", subtitle).strip().lower()
        normalized_question = re.sub(r"\s+", " ", str(question or "")).strip().lower()
        if normalized_subtitle in {normalized_title, normalized_question}:
            subtitle = ""
        return {"title": title, "subtitle": subtitle}
    except Exception:
        return fallback


def generate_sql_with_thread(question: str, thread_id: str = "") -> dict[str, str]:
    question = str(question or "").strip()
    if not question:
        raise ReportsApiError("Informe uma pergunta para gerar o relatorio.", 400)

    assistant_id = _assistant_id()
    if not assistant_id:
        raise ReportsApiError("Assistant de relatorios nao configurado no .env.", 500)

    client = _openai_client()
    try:
        try:
            thread = client.beta.threads.retrieve(thread_id) if thread_id else client.beta.threads.create()
        except Exception:
            thread = client.beta.threads.create()
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=[{"type": "text", "text": question}],
        )
        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id,
            assistant_id=assistant_id,
        )
        if getattr(run, "status", "") != "completed":
            raise ReportsApiError(f"Assistant finalizou com status {getattr(run, 'status', 'desconhecido')}.", 502)
        messages = list(client.beta.threads.messages.list(thread_id=thread.id))
        assistant_messages = [msg for msg in messages if getattr(msg, "role", "") == "assistant"]
        if not assistant_messages:
            raise ReportsApiError("Assistant nao retornou SQL.", 502)
        sql = _extract_sql(_message_text(assistant_messages[0]))
        if not sql:
            raise ReportsApiError("Nao foi possivel extrair SQL da resposta do Assistant.", 502)
        return {"sql": sql, "threadId": str(thread.id)}
    except ReportsApiError:
        raise
    except Exception as exc:
        raise ReportsApiError(f"Falha ao gerar SQL: {exc}", 502) from exc


def generate_sql_from_question(question: str) -> str:
    return generate_sql_with_thread(question).get("sql", "")


def _mask_sql_strings_and_comments(sql: str) -> str:
    chars = list(sql)
    i = 0
    in_single = False
    in_double = False
    in_line_comment = False
    in_block_comment = False
    while i < len(chars):
        ch = chars[i]
        nxt = chars[i + 1] if i + 1 < len(chars) else ""

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            else:
                chars[i] = " "
            i += 1
            continue

        if in_block_comment:
            chars[i] = " "
            if ch == "*" and nxt == "/":
                chars[i + 1] = " "
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue

        if in_single:
            chars[i] = " "
            if ch == "'" and nxt == "'":
                chars[i + 1] = " "
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue

        if in_double:
            chars[i] = " "
            if ch == '"' and nxt == '"':
                chars[i + 1] = " "
                i += 2
                continue
            if ch == '"':
                in_double = False
            i += 1
            continue

        if ch == "-" and nxt == "-":
            chars[i] = chars[i + 1] = " "
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            chars[i] = chars[i + 1] = " "
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            chars[i] = " "
            in_single = True
            i += 1
            continue
        if ch == '"':
            chars[i] = " "
            in_double = True
            i += 1
            continue
        i += 1
    return "".join(chars)


BLOCKED_SQL_KEYWORDS = {
    "alter",
    "call",
    "copy",
    "create",
    "delete",
    "drop",
    "execute",
    "grant",
    "insert",
    "listen",
    "merge",
    "notify",
    "reindex",
    "revoke",
    "truncate",
    "unlisten",
    "update",
    "vacuum",
}


def validate_report_sql(sql: str, *, default_limit: int = DEFAULT_LIMIT) -> dict[str, Any]:
    raw_sql = str(sql or "").strip()
    if not raw_sql:
        raise ReportsApiError("SQL vazio.", 400)

    while raw_sql.endswith(";"):
        raw_sql = raw_sql[:-1].rstrip()

    masked = _mask_sql_strings_and_comments(raw_sql)
    if ";" in masked:
        raise ReportsApiError("Somente uma instrucao SQL pode ser executada.", 400)

    normalized = masked.strip().lower()
    if not re.match(r"^(select|with)\b", normalized):
        raise ReportsApiError("Somente consultas SELECT/WITH sao permitidas no Modo Relatorio.", 400)

    blocked = sorted({kw for kw in BLOCKED_SQL_KEYWORDS if re.search(rf"\b{kw}\b", normalized)})
    if blocked:
        raise ReportsApiError(f"SQL bloqueado por conter comando nao permitido: {', '.join(blocked)}.", 400)

    if re.search(r"\bselect\b[\s\S]*\binto\b", normalized):
        raise ReportsApiError("SELECT INTO nao e permitido no Modo Relatorio.", 400)

    executed_sql = raw_sql
    limit_applied = False
    if default_limit > 0 and not re.search(r"\blimit\s+\d+\b", normalized):
        executed_sql = f"SELECT * FROM ({raw_sql}) AS govgo_report_query LIMIT {int(default_limit)}"
        limit_applied = True

    return {
        "sql": raw_sql,
        "executedSql": executed_sql,
        "limitApplied": limit_applied,
        "defaultLimit": int(default_limit),
    }


def _optimize_generated_sql(sql: str) -> str:
    text = str(sql or "").strip()
    item_count_pattern = re.compile(
        r"""
        ^\s*select\s+count\s*\(\s*\*\s*\)\s+as\s+(?P<alias>"?[A-Za-z_][A-Za-z0-9_]*"?)
        \s+from\s*\(\s*
          select\s+c\.numero_controle_pncp\s+
          from\s+contratacao\s+(?:as\s+)?c\s+
          join\s+item_contratacao\s+(?:as\s+)?ic\s+
            on\s+c\.numero_controle_pncp\s*=\s*ic\.numero_controle_pncp\s+
          group\s+by\s+c\.numero_controle_pncp\s+
          having\s+count\s*\(\s*(?:ic\.)?(?:numero_item|id_item|\*)\s*\)\s*=\s*(?P<count>\d+)
        \s*\)\s+(?:as\s+)?[A-Za-z_][A-Za-z0-9_]*\s*;?\s*$
        """,
        flags=re.IGNORECASE | re.DOTALL | re.VERBOSE,
    )
    match = item_count_pattern.match(text)
    if not match:
        return text
    alias = match.group("alias")
    item_count = int(match.group("count"))
    return (
        f"SELECT COUNT(*) AS {alias} "
        "FROM ("
        " SELECT ic.numero_controle_pncp"
        " FROM item_contratacao AS ic"
        " GROUP BY ic.numero_controle_pncp"
        f" HAVING COUNT(ic.numero_item) = {item_count}"
        ") AS subquery"
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
        raise ReportsApiError(f"Configuracao de banco ausente: {', '.join(missing)}.", 500)

    return {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
        "connect_timeout": 10,
        "application_name": "govgo-v2-reports",
    }


def execute_report_sql(sql: str, *, default_limit: int = DEFAULT_LIMIT, max_rows: int = DEFAULT_LIMIT) -> dict[str, Any]:
    validation = validate_report_sql(_optimize_generated_sql(sql), default_limit=default_limit)
    executed_sql = validation["executedSql"]
    max_rows = max(1, int(max_rows or DEFAULT_LIMIT))
    start = time.perf_counter()
    conn = None
    try:
        conn = psycopg2.connect(**_db_connect_kwargs())
        conn.set_session(readonly=True, autocommit=False)
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout TO %s", (f"{STATEMENT_TIMEOUT_MS}ms",))
            cur.execute(executed_sql)
            if not cur.description:
                raise ReportsApiError("A consulta nao retornou uma tabela.", 400)
            columns = [str(col[0]) for col in cur.description]
            raw_rows = cur.fetchmany(max_rows + 1)
        conn.rollback()
        truncated = len(raw_rows) > max_rows
        rows = [
            {columns[index]: _json_safe(value) for index, value in enumerate(row)}
            for row in raw_rows[:max_rows]
        ]
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "ok": True,
            "sql": validation["sql"],
            "executedSql": executed_sql,
            "limitApplied": validation["limitApplied"],
            "columns": columns,
            "rows": rows,
            "rowCount": len(rows),
            "truncated": truncated,
            "elapsedMs": elapsed_ms,
            "error": "",
        }
    except ReportsApiError:
        raise
    except Exception as exc:
        raise ReportsApiError(f"Erro ao executar SQL: {exc}", 400) from exc
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def _load_history_all() -> list[dict[str, Any]]:
    if not HISTORY_PATH.exists():
        return []
    try:
        data = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    return data if isinstance(data, list) else []


def _save_history_all(items: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(_json_safe(items), ensure_ascii=False, indent=2), encoding="utf-8")


def _load_chats_all() -> list[dict[str, Any]]:
    if not CHATS_PATH.exists():
        return []
    try:
        data = json.loads(CHATS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    return data if isinstance(data, list) else []


def _save_chats_all(items: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CHATS_PATH.write_text(json.dumps(_json_safe(items), ensure_ascii=False, indent=2), encoding="utf-8")


def _load_workspace_all() -> dict[str, Any]:
    if not WORKSPACE_PATH.exists():
        return {}
    try:
        data = json.loads(WORKSPACE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _save_workspace_all(items: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WORKSPACE_PATH.write_text(json.dumps(_json_safe(items), ensure_ascii=False, indent=2), encoding="utf-8")


def _compact_workspace_report(report: dict[str, Any]) -> dict[str, Any]:
    source = report if isinstance(report, dict) else {}
    return {
        "id": str(source.get("id") or ""),
        "title": str(source.get("title") or source.get("question") or "Relatorio")[:160],
        "subtitle": str(source.get("subtitle") or "")[:240],
        "question": str(source.get("question") or "")[:500],
        "sql": str(source.get("sql") or "")[:8000],
        "executedSql": str(source.get("executedSql") or "")[:8000],
        "columns": list(source.get("columns") or [])[:80],
        "rows": list(source.get("rows") or source.get("previewRows") or [])[:40],
        "rowCount": int(source.get("rowCount") or 0),
        "elapsedMs": int(source.get("elapsedMs") or 0),
        "status": str(source.get("status") or "idle")[:32],
        "error": str(source.get("error") or "")[:1000],
        "saved": bool(source.get("saved")),
    }


def _compact_workspace_chat(chat: dict[str, Any]) -> dict[str, Any]:
    source = chat if isinstance(chat, dict) else {}
    messages = list(source.get("messages") or [])[-80:]
    compact_messages = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        compact_messages.append({
            "id": str(message.get("id") or ""),
            "role": str(message.get("role") or "")[:32],
            "text": str(message.get("text") or "")[:8000],
            "sql": str(message.get("sql") or "")[:8000],
            "reportId": str(message.get("reportId") or ""),
            "reportTitle": str(message.get("reportTitle") or "")[:160],
            "reportSubtitle": str(message.get("reportSubtitle") or "")[:240],
            "rowCount": int(message.get("rowCount") or 0),
            "status": str(message.get("status") or "")[:32],
            "error": str(message.get("error") or "")[:1000],
            "createdAt": str(message.get("createdAt") or ""),
        })
    return {
        "id": str(source.get("id") or ""),
        "title": str(source.get("title") or "Novo chat")[:160],
        "messages": compact_messages,
    }


def _compact_workspace_payload(payload: dict[str, Any]) -> dict[str, Any]:
    source = payload if isinstance(payload, dict) else {}
    tabs = []
    for tab in list(source.get("tabs") or [])[-20:]:
        if not isinstance(tab, dict) or not tab.get("id"):
            continue
        tabs.append({
            "id": str(tab.get("id") or ""),
            "title": str(tab.get("title") or "Relatorio")[:160],
            "count": tab.get("count"),
            "status": str(tab.get("status") or "idle")[:32],
            "closable": bool(tab.get("closable", True)),
        })
    reports_source = source.get("reports") if isinstance(source.get("reports"), dict) else {}
    reports = {}
    for tab in tabs:
        report = reports_source.get(tab["id"])
        if isinstance(report, dict):
            reports[tab["id"]] = _compact_workspace_report(report)
    return {
        "version": 1,
        "activeId": str(source.get("activeId") or "intro"),
        "historyMode": str(source.get("historyMode") or "chats"),
        "chatOpen": bool(source.get("chatOpen", True)),
        "activeChat": _compact_workspace_chat(source.get("activeChat") or {}),
        "tabs": tabs,
        "reports": reports,
        "updatedAt": _dt.datetime.now(_dt.timezone.utc).isoformat(),
    }


def get_workspace(user_id: str) -> dict[str, Any]:
    if _reports_db_ready():
        return {"ok": True, "workspace": reports_repository.get_workspace(user_id)}
    with WORKSPACE_LOCK:
        items = _load_workspace_all()
    workspace = items.get(str(user_id)) if isinstance(items, dict) else None
    return {"ok": True, "workspace": workspace if isinstance(workspace, dict) else {}}


def save_workspace(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    workspace = _compact_workspace_payload(payload.get("workspace") if isinstance(payload.get("workspace"), dict) else payload)
    if _reports_db_ready():
        return {"ok": True, "workspace": reports_repository.save_workspace(user_id, workspace)}
    with WORKSPACE_LOCK:
        items = _load_workspace_all()
        items[str(user_id)] = workspace
        _save_workspace_all(items)
    return {"ok": True, "workspace": workspace}


def _chat_title(question: str) -> str:
    text = " ".join(str(question or "").split())
    return text[:96] if text else "Novo chat"


def _public_chat_item(
    chat: dict[str, Any],
    *,
    include_messages: bool = True,
    report_meta: dict[str, dict[str, str]] | None = None,
) -> dict[str, Any]:
    meta = report_meta or {}
    messages = []
    for message in list(chat.get("messages") or []):
        if not isinstance(message, dict):
            continue
        hydrated = dict(message)
        report_id = str(hydrated.get("reportId") or "")
        item_meta = meta.get(report_id) if report_id else None
        if item_meta:
            hydrated["reportTitle"] = hydrated.get("reportTitle") or item_meta.get("title") or ""
            hydrated["reportSubtitle"] = hydrated.get("reportSubtitle") or item_meta.get("subtitle") or ""
        messages.append(hydrated)
    last_message = messages[-1] if messages else {}
    first_report_title = ""
    for message in messages:
        if message.get("reportTitle"):
            first_report_title = str(message.get("reportTitle") or "")
            break
    title = str(chat.get("title") or "").strip()
    if not title or title == "Novo chat":
        title = first_report_title or "Novo chat"
    public = {
        "id": str(chat.get("id") or ""),
        "title": title,
        "createdAt": str(chat.get("createdAt") or ""),
        "updatedAt": str(chat.get("updatedAt") or ""),
        "messageCount": len(messages),
        "reportCount": len(list(chat.get("reportIds") or [])),
        "lastText": str(last_message.get("text") or last_message.get("sql") or ""),
        "lastReportId": str(last_message.get("reportId") or ""),
    }
    if include_messages:
        public["messages"] = [_json_safe(message) for message in messages]
    return public


def _chats_for_user(user_id: str, *, limit: int = 50, include_messages: bool = True) -> list[dict[str, Any]]:
    if _reports_db_ready():
        chats = reports_repository.list_chats(user_id, limit=limit, include_messages=include_messages)
        return [_public_chat_item(chat, include_messages=include_messages) for chat in chats]
    with CHATS_LOCK:
        chats = _load_chats_all()
    with HISTORY_LOCK:
        history_items = _load_history_all()
    report_meta = {
        str(item.get("id") or ""): {
            "title": str(item.get("title") or item.get("question") or ""),
            "subtitle": str(item.get("subtitle") or ""),
        }
        for item in history_items
        if str(item.get("userId") or "") == str(user_id) and str(item.get("id") or "")
    }
    filtered = [
        chat for chat in chats
        if str(chat.get("userId") or "") == str(user_id)
    ]
    filtered.sort(key=lambda chat: str(chat.get("updatedAt") or chat.get("createdAt") or ""), reverse=True)
    return [
        _public_chat_item(chat, include_messages=include_messages, report_meta=report_meta)
        for chat in filtered[:max(1, int(limit or 50))]
    ]


def _find_chat(user_id: str, chat_id: str) -> dict[str, Any] | None:
    if not chat_id:
        return None
    if _reports_db_ready():
        return reports_repository.find_chat(user_id, chat_id)
    with CHATS_LOCK:
        chats = _load_chats_all()
    for chat in chats:
        if str(chat.get("userId") or "") == str(user_id) and str(chat.get("id") or "") == str(chat_id):
            return dict(chat)
    return None


def _delete_chat_item(user_id: str, chat_id: str) -> bool:
    if _reports_db_ready():
        return reports_repository.delete_chat(user_id, chat_id)
    removed = False
    with CHATS_LOCK:
        chats = _load_chats_all()
        kept = []
        for chat in chats:
            if str(chat.get("userId") or "") == str(user_id) and str(chat.get("id") or "") == str(chat_id):
                removed = True
                continue
            kept.append(chat)
        if removed:
            _save_chats_all(kept)
    return removed


def _ensure_chat(user_id: str, chat_id: str, question: str) -> dict[str, Any]:
    existing = _find_chat(user_id, chat_id)
    if existing:
        return existing
    now = _dt.datetime.now(_dt.timezone.utc).isoformat()
    chat = {
        "id": str(uuid.uuid4()),
        "userId": str(user_id),
        "threadId": "",
        "title": _chat_title(question),
        "createdAt": now,
        "updatedAt": now,
        "messages": [],
        "reportIds": [],
    }
    if _reports_db_ready():
        return reports_repository.save_chat(chat)
    return chat


def _save_chat(chat: dict[str, Any]) -> dict[str, Any]:
    chat = dict(chat)
    chat["messages"] = list(chat.get("messages") or [])[-200:]
    chat["reportIds"] = list(dict.fromkeys(str(item) for item in list(chat.get("reportIds") or []) if item))[-200:]
    if _reports_db_ready():
        return _public_chat_item(reports_repository.save_chat(chat))
    with CHATS_LOCK:
        chats = _load_chats_all()
        updated = False
        for index, item in enumerate(chats):
            if str(item.get("userId") or "") == str(chat.get("userId") or "") and str(item.get("id") or "") == str(chat.get("id") or ""):
                chats[index] = chat
                updated = True
                break
        if not updated:
            chats.append(chat)
        _save_chats_all(chats[-1000:])
    return _public_chat_item(chat)


def _append_chat_exchange(
    chat: dict[str, Any],
    *,
    question: str,
    sql: str,
    report_id: str,
    report_title: str = "",
    report_subtitle: str = "",
    row_count: int,
    status: str,
    error: str = "",
    thread_id: str = "",
) -> dict[str, Any]:
    now = _dt.datetime.now(_dt.timezone.utc).isoformat()
    messages = list(chat.get("messages") or [])
    messages.append({
        "id": str(uuid.uuid4()),
        "role": "user",
        "text": question,
        "createdAt": now,
    })
    messages.append({
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "text": sql if not error else error,
        "sql": sql,
        "reportId": report_id,
        "reportTitle": report_title,
        "reportSubtitle": report_subtitle,
        "rowCount": int(row_count or 0),
        "status": status,
        "error": error,
        "createdAt": now,
    })
    chat["messages"] = messages
    chat["threadId"] = thread_id or str(chat.get("threadId") or "")
    chat["updatedAt"] = now
    chat["reportIds"] = [*list(chat.get("reportIds") or []), report_id]
    if len(messages) <= 2 or not str(chat.get("title") or "").strip() or str(chat.get("title")) == "Novo chat":
        chat["title"] = report_title or _chat_title(question)
    if _reports_db_ready():
        return _save_chat(chat)
    with HISTORY_LOCK:
        history_items = _load_history_all()
    report_meta = {
        str(item.get("id") or ""): {
            "title": str(item.get("title") or item.get("question") or ""),
            "subtitle": str(item.get("subtitle") or ""),
        }
        for item in history_items
        if str(item.get("userId") or "") == str(chat.get("userId") or "") and str(item.get("id") or "")
    }
    return _public_chat_item(_save_chat(chat), report_meta=report_meta)


def _history_for_user(user_id: str, *, limit: int = 50, saved_only: bool = False) -> list[dict[str, Any]]:
    if _reports_db_ready():
        items = reports_repository.list_reports(user_id, limit=limit, saved_only=saved_only)
        return [_public_history_item(item) for item in items]
    with HISTORY_LOCK:
        items = _load_history_all()
    filtered = [
        item for item in items
        if str(item.get("userId") or "") == str(user_id)
        and (not saved_only or bool(item.get("saved")))
    ]
    filtered.sort(key=lambda item: str(item.get("createdAt") or ""), reverse=True)
    return [_public_history_item(item) for item in filtered[:max(1, int(limit or 50))]]


def _public_history_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("id") or ""),
        "title": str(item.get("title") or item.get("question") or "Relatorio"),
        "subtitle": str(item.get("subtitle") or ""),
        "question": str(item.get("question") or ""),
        "sql": str(item.get("sql") or ""),
        "rowCount": int(item.get("rowCount") or 0),
        "elapsedMs": int(item.get("elapsedMs") or 0),
        "createdAt": str(item.get("createdAt") or ""),
        "saved": bool(item.get("saved")),
        "status": str(item.get("status") or "ok"),
        "error": str(item.get("error") or ""),
        "chatId": str(item.get("chatId") or ""),
        "columns": list(item.get("columns") or []),
        "previewRows": list(item.get("previewRows") or []),
    }


def _record_report(
    user_id: str,
    *,
    question: str,
    sql: str,
    execution: dict[str, Any],
    saved: bool = False,
    title: str = "",
    subtitle: str = "",
    chat_id: str = "",
) -> dict[str, Any]:
    now = _dt.datetime.now(_dt.timezone.utc).isoformat()
    item = {
        "id": str(uuid.uuid4()),
        "userId": str(user_id),
        "title": title or question[:96] or "Relatorio",
        "subtitle": subtitle,
        "question": question,
        "sql": sql,
        "executedSql": str(execution.get("executedSql") or ""),
        "columns": list(execution.get("columns") or []),
        "previewRows": list(execution.get("rows") or [])[:20],
        "rowCount": int(execution.get("rowCount") or 0),
        "elapsedMs": int(execution.get("elapsedMs") or 0),
        "status": "ok" if not execution.get("error") else "error",
        "error": str(execution.get("error") or ""),
        "saved": bool(saved),
        "chatId": str(chat_id or ""),
        "createdAt": now,
    }
    if _reports_db_ready():
        return _public_history_item(reports_repository.create_report(user_id, item))
    with HISTORY_LOCK:
        items = _load_history_all()
        items.append(item)
        _save_history_all(items[-1000:])
    return _public_history_item(item)


def _find_history_item(user_id: str, report_id: str) -> dict[str, Any] | None:
    if _reports_db_ready():
        return reports_repository.find_report(user_id, report_id)
    with HISTORY_LOCK:
        items = _load_history_all()
    for item in items:
        if str(item.get("userId") or "") == str(user_id) and str(item.get("id") or "") == str(report_id):
            return item
    return None


def _delete_history_item(user_id: str, report_id: str) -> bool:
    if _reports_db_ready():
        return reports_repository.delete_report(user_id, report_id)
    removed = False
    with HISTORY_LOCK:
        items = _load_history_all()
        kept = []
        for item in items:
            if str(item.get("userId") or "") == str(user_id) and str(item.get("id") or "") == str(report_id):
                removed = True
                continue
            kept.append(item)
        if removed:
            _save_history_all(kept)
    return removed


def _remove_report_from_chats(user_id: str, report_id: str) -> None:
    report_id = str(report_id or "")
    if not report_id:
        return
    if _reports_db_ready():
        return
    with CHATS_LOCK:
        chats = _load_chats_all()
        changed = False
        for chat in chats:
            if str(chat.get("userId") or "") != str(user_id):
                continue

            report_ids = [
                item for item in list(chat.get("reportIds") or [])
                if str(item or "") != report_id
            ]
            if report_ids != list(chat.get("reportIds") or []):
                chat["reportIds"] = report_ids
                changed = True

            messages = []
            for message in list(chat.get("messages") or []):
                if str(message.get("reportId") or "") == report_id:
                    next_message = dict(message)
                    next_message["reportId"] = ""
                    next_message["reportDeleted"] = True
                    messages.append(next_message)
                    changed = True
                else:
                    messages.append(message)
            chat["messages"] = messages
            if str(chat.get("lastReportId") or "") == report_id:
                replacement = ""
                for message in reversed(messages):
                    if message.get("reportId"):
                        replacement = str(message.get("reportId") or "")
                        break
                chat["lastReportId"] = replacement
                changed = True
        if changed:
            _save_chats_all(chats)


def _mark_saved(user_id: str, report_id: str, saved: bool = True) -> dict[str, Any]:
    if _reports_db_ready():
        updated = reports_repository.mark_report_saved(user_id, report_id, saved=saved)
        if not updated:
            raise ReportsApiError("Relatorio nao encontrado.", 404)
        return _public_history_item(updated)
    updated: dict[str, Any] | None = None
    with HISTORY_LOCK:
        items = _load_history_all()
        for item in items:
            if str(item.get("userId") or "") == str(user_id) and str(item.get("id") or "") == str(report_id):
                item["saved"] = bool(saved)
                updated = item
                break
        if updated:
            _save_history_all(items)
    if not updated:
        raise ReportsApiError("Relatorio nao encontrado.", 404)
    return _public_history_item(updated)


def run_report(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    question = _text(payload, "question", "query", "q")
    chat = _ensure_chat(user_id, _text(payload, "chatId", "chat_id"), question)
    generated = generate_sql_with_thread(question, str(chat.get("threadId") or ""))
    sql = generated["sql"]
    try:
        execution = execute_report_sql(sql, default_limit=DEFAULT_LIMIT, max_rows=DEFAULT_LIMIT)
    except ReportsApiError as exc:
        execution = {
            "ok": False,
            "sql": sql,
            "executedSql": sql,
            "limitApplied": False,
            "columns": [],
            "rows": [],
            "rowCount": 0,
            "truncated": False,
            "elapsedMs": 0,
            "error": exc.message,
        }
    stored_sql = str(execution.get("sql") or sql)
    title_info = generate_report_title(
        question=question,
        sql=stored_sql,
        columns=list(execution.get("columns") or []),
        row_count=int(execution.get("rowCount") or 0),
        sample_rows=list(execution.get("rows") or [])[:3],
    )
    history_item = _record_report(
        user_id,
        question=question,
        sql=stored_sql,
        execution=execution,
        title=title_info["title"],
        subtitle=title_info.get("subtitle", ""),
        chat_id=str(chat.get("id") or ""),
    )
    chat_item = _append_chat_exchange(
        chat,
        question=question,
        sql=stored_sql,
        report_id=history_item["id"],
        report_title=history_item.get("title", ""),
        report_subtitle=history_item.get("subtitle", ""),
        row_count=int(execution.get("rowCount") or 0),
        status=str(history_item.get("status") or "ok"),
        error=str(execution.get("error") or ""),
        thread_id=generated.get("threadId", ""),
    )
    return {
        "ok": True,
        "report": {
            **history_item,
            "executedSql": execution["executedSql"],
            "limitApplied": execution["limitApplied"],
            "rows": execution["rows"],
            "columns": execution["columns"],
            "truncated": execution["truncated"],
        },
        "chat": chat_item,
        "chats": _chats_for_user(user_id, limit=50),
        "history": _history_for_user(user_id, limit=50),
        "saved": _history_for_user(user_id, limit=50, saved_only=True),
    }


def generate_report_sql(payload: dict[str, Any]) -> dict[str, Any]:
    question = _text(payload, "question", "query", "q")
    sql = generate_sql_from_question(question)
    validation = validate_report_sql(sql, default_limit=DEFAULT_LIMIT)
    return {"ok": True, "question": question, **validation}


def execute_report(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    question = _text(payload, "question", "query", "q")
    sql = _text(payload, "sql")
    if not sql:
        raise ReportsApiError("Informe o SQL para executar.", 400)
    chat_id = _text(payload, "chatId", "chat_id")
    chat = _ensure_chat(user_id, chat_id, question or sql[:96]) if chat_id else None
    execution = execute_report_sql(sql, default_limit=DEFAULT_LIMIT, max_rows=DEFAULT_LIMIT)
    stored_sql = str(execution.get("sql") or sql)
    title_info = generate_report_title(
        question=question or sql[:96],
        sql=stored_sql,
        columns=list(execution.get("columns") or []),
        row_count=int(execution.get("rowCount") or 0),
        sample_rows=list(execution.get("rows") or [])[:3],
    )
    history_item = _record_report(
        user_id,
        question=question or sql[:96],
        sql=stored_sql,
        execution=execution,
        title=title_info["title"],
        subtitle=title_info.get("subtitle", ""),
        chat_id=str(chat.get("id") or "") if chat else "",
    )
    chat_item = None
    if chat:
        chat_item = _append_chat_exchange(
            chat,
            question=question or sql[:96],
            sql=stored_sql,
            report_id=history_item["id"],
            report_title=history_item.get("title", ""),
            report_subtitle=history_item.get("subtitle", ""),
            row_count=int(execution.get("rowCount") or 0),
            status=str(history_item.get("status") or "ok"),
            error=str(execution.get("error") or ""),
            thread_id=str(chat.get("threadId") or ""),
        )
    return {
        "ok": True,
        "report": {
            **history_item,
            "executedSql": execution["executedSql"],
            "limitApplied": execution["limitApplied"],
            "rows": execution["rows"],
            "columns": execution["columns"],
            "truncated": execution["truncated"],
        },
        "chat": chat_item,
    }


def list_reports(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    try:
        limit = int(_text(payload, "limit") or 50)
    except ValueError:
        limit = 50
    return {
        "ok": True,
        "history": _history_for_user(user_id, limit=limit),
        "saved": _history_for_user(user_id, limit=limit, saved_only=True),
        "chats": _chats_for_user(user_id, limit=limit),
    }


def get_report_detail(report_id: str, user_id: str) -> dict[str, Any]:
    if not report_id:
        raise ReportsApiError("Relatorio nao informado.", 400)
    item = _find_history_item(user_id, report_id)
    if not item:
        raise ReportsApiError("Relatorio nao encontrado.", 404)
    if _reports_db_ready():
        reports_repository.touch_report_opened(user_id, report_id)

    public_item = _public_history_item(item)
    sql = str(item.get("sql") or "").strip()
    if not sql:
        return {"ok": True, "report": {**public_item, "rows": list(item.get("previewRows") or [])}}

    try:
        execution = execute_report_sql(sql, default_limit=DEFAULT_LIMIT, max_rows=DEFAULT_LIMIT)
    except ReportsApiError as exc:
        return {
            "ok": True,
            "report": {
                **public_item,
                "rows": list(item.get("previewRows") or []),
                "error": exc.message,
                "status": "error",
            },
        }

    return {
        "ok": True,
        "report": {
            **public_item,
            "executedSql": execution["executedSql"],
            "limitApplied": execution["limitApplied"],
            "rows": execution["rows"],
            "columns": execution["columns"],
            "rowCount": int(execution.get("rowCount") or 0),
            "elapsedMs": int(execution.get("elapsedMs") or public_item.get("elapsedMs") or 0),
            "truncated": execution["truncated"],
            "status": "ok",
            "error": "",
        },
    }


def delete_report(report_id: str, user_id: str) -> dict[str, Any]:
    if not report_id:
        raise ReportsApiError("Relatorio nao informado.", 400)
    if not _delete_history_item(user_id, report_id):
        raise ReportsApiError("Relatorio nao encontrado.", 404)
    _remove_report_from_chats(user_id, report_id)
    return {
        "ok": True,
        "history": _history_for_user(user_id, limit=50),
        "saved": _history_for_user(user_id, limit=50, saved_only=True),
        "chats": _chats_for_user(user_id, limit=50),
    }


def delete_chat(chat_id: str, user_id: str) -> dict[str, Any]:
    if not chat_id:
        raise ReportsApiError("Chat nao informado.", 400)
    if not _delete_chat_item(user_id, chat_id):
        raise ReportsApiError("Chat nao encontrado.", 404)
    return {
        "ok": True,
        "history": _history_for_user(user_id, limit=50),
        "saved": _history_for_user(user_id, limit=50, saved_only=True),
        "chats": _chats_for_user(user_id, limit=50),
    }


def save_report(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    report_id = _text(payload, "id", "report_id", "reportId")
    if report_id:
        return {"ok": True, "report": _mark_saved(user_id, report_id, saved=True)}

    question = _text(payload, "question", "query", "q")
    sql = _text(payload, "sql")
    if not sql:
        raise ReportsApiError("Informe um relatorio existente ou um SQL para salvar.", 400)
    validation = validate_report_sql(sql, default_limit=0)
    title_info = generate_report_title(
        question=question or sql[:96],
        sql=validation["sql"],
        columns=[],
        row_count=0,
        sample_rows=[],
    )
    item = _record_report(
        user_id,
        question=question or sql[:96],
        sql=validation["sql"],
        execution={"columns": [], "rows": [], "rowCount": 0, "elapsedMs": 0, "executedSql": validation["sql"]},
        saved=True,
        title=_text(payload, "title") or title_info["title"],
        subtitle=title_info.get("subtitle", ""),
    )
    return {"ok": True, "report": item}


def _csv_bytes(columns: list[str], rows: list[dict[str, Any]]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: row.get(column, "") for column in columns})
    return output.getvalue().encode("utf-8-sig")


def _xlsx_bytes(columns: list[str], rows: list[dict[str, Any]]) -> bytes:
    import xlsxwriter

    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})
    worksheet = workbook.add_worksheet("Results")
    header_format = workbook.add_format({"bold": True, "bg_color": "#E0EAF9", "font_color": "#003A70"})
    for col_index, column in enumerate(columns):
        worksheet.write(0, col_index, column, header_format)
        worksheet.set_column(col_index, col_index, min(max(len(str(column)) + 2, 12), 42))
    for row_index, row in enumerate(rows, start=1):
        for col_index, column in enumerate(columns):
            value = row.get(column, "")
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False)
            worksheet.write(row_index, col_index, value)
    worksheet.freeze_panes(1, 0)
    workbook.close()
    return output.getvalue()


def export_report(payload: dict[str, Any], user_id: str, report_id: str) -> dict[str, Any]:
    item = _find_history_item(user_id, report_id)
    if not item:
        raise ReportsApiError("Relatorio nao encontrado.", 404)
    fmt = _text(payload, "format").lower() or "xlsx"
    if fmt not in {"csv", "xlsx"}:
        raise ReportsApiError("Formato de exportacao invalido.", 400)

    execution = execute_report_sql(str(item.get("sql") or ""), default_limit=EXPORT_LIMIT, max_rows=EXPORT_LIMIT)
    columns = list(execution.get("columns") or [])
    rows = list(execution.get("rows") or [])
    timestamp = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_id = str(report_id)[:8]
    if fmt == "csv":
        content = _csv_bytes(columns, rows)
        mime = "text/csv; charset=utf-8"
        filename = f"GovGo_Report_{safe_id}_{timestamp}.csv"
    else:
        content = _xlsx_bytes(columns, rows)
        mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"GovGo_Report_{safe_id}_{timestamp}.xlsx"
    return {
        "ok": True,
        "filename": filename,
        "mime": mime,
        "format": fmt,
        "contentBase64": base64.b64encode(content).decode("ascii"),
        "rowCount": len(rows),
    }


def handle_reports_route(
    route: str,
    method: str,
    payload: dict[str, Any] | None = None,
    cookies: dict[str, str] | None = None,
    path_value: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    from src.backend.user.api.service import (  # local import avoids auth circular setup during module import
        ACCESS_COOKIE,
        REFRESH_COOKIE,
        _merge_response_headers,
        _resolve_authenticated_session,
    )

    payload = payload or {}
    cookies = cookies or {}
    access_token = cookies.get(ACCESS_COOKIE, "")
    refresh_token = cookies.get(REFRESH_COOKIE, "")
    access_token, public_user, session_headers = _resolve_authenticated_session(access_token, refresh_token)
    user_id = str(public_user.get("uid") or "").strip()
    if not user_id:
        raise ReportsApiError("Usuario autenticado nao encontrado.", 401)

    try:
        if route == "/api/reports/history" and method == "GET":
            response = list_reports(payload, user_id)
        elif route.startswith("/api/reports/history/") and method == "GET":
            response = get_report_detail(path_value, user_id)
        elif route == "/api/reports/workspace" and method == "GET":
            response = get_workspace(user_id)
        elif route == "/api/reports/run" and method == "POST":
            response = run_report(payload, user_id)
        elif route == "/api/reports/generate-sql" and method == "POST":
            response = generate_report_sql(payload)
        elif route == "/api/reports/execute" and method == "POST":
            response = execute_report(payload, user_id)
        elif route == "/api/reports/save" and method == "POST":
            response = save_report(payload, user_id)
        elif route == "/api/reports/workspace" and method == "POST":
            response = save_workspace(payload, user_id)
        elif route.startswith("/api/reports/history/") and method == "DELETE":
            response = delete_report(path_value, user_id)
        elif route.startswith("/api/reports/chats/") and method == "DELETE":
            response = delete_chat(path_value, user_id)
        elif route.startswith("/api/reports/") and route.endswith("/export") and method == "GET":
            response = export_report(payload, user_id, path_value)
        else:
            raise ReportsApiError("Endpoint de relatorios nao encontrado.", 404)
    except ReportsApiError:
        raise

    return 200, response, _merge_response_headers([], session_headers)
