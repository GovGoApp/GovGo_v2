from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.backend.reports.api import repository


CHATS_PATH = ROOT / "data" / "reports_chats.json"


def _valid_uuid(value: object) -> bool:
    try:
        uuid.UUID(str(value or ""))
        return True
    except Exception:
        return False


def _load_chats() -> list[dict]:
    if not CHATS_PATH.exists():
        return []
    try:
        data = json.loads(CHATS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    return data if isinstance(data, list) else []


def backfill() -> dict[str, int]:
    chats = _load_chats()
    rows: list[tuple[int, str, str, str]] = []
    for chat in chats:
        if not isinstance(chat, dict):
            continue
        user_id = str(chat.get("userId") or "")
        chat_id = str(chat.get("id") or "")
        if not _valid_uuid(user_id) or not _valid_uuid(chat_id):
            continue
        messages = chat.get("messages") if isinstance(chat.get("messages"), list) else []
        for message_order, message in enumerate(messages):
            if not isinstance(message, dict):
                continue
            message_id = str(message.get("id") or "")
            if not _valid_uuid(message_id):
                continue
            rows.append((message_order, message_id, user_id, chat_id))

    conn = repository._connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH renumbered AS (
                  SELECT
                    id,
                    row_number() OVER (
                      PARTITION BY chat_id
                      ORDER BY created_at ASC, CASE role WHEN 'user' THEN 0 ELSE 1 END ASC, id ASC
                    ) - 1 AS next_order
                  FROM public.user_report_messages
                )
                UPDATE public.user_report_messages AS message
                   SET message_order = renumbered.next_order
                  FROM renumbered
                 WHERE message.id = renumbered.id
                """
            )
            fallback_updated = int(cur.rowcount or 0)
            cur.executemany(
                """
                UPDATE public.user_report_messages
                   SET message_order = %s
                 WHERE id = %s
                   AND user_id = %s
                   AND chat_id = %s
                """,
                rows,
            )
            updated = int(cur.rowcount or 0)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"fallbackUpdated": fallback_updated, "seen": len(rows), "updated": updated}


def main() -> None:
    print(backfill())


if __name__ == "__main__":
    main()
