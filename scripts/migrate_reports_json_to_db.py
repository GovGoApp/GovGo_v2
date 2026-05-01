from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.backend.reports.api import repository

DATA_DIR = ROOT / "data"
HISTORY_PATH = DATA_DIR / "reports_history.json"
CHATS_PATH = DATA_DIR / "reports_chats.json"
WORKSPACE_PATH = DATA_DIR / "reports_workspace.json"


def _load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback
    return data if isinstance(data, type(fallback)) else fallback


def _valid_uuid(value: object) -> bool:
    try:
        uuid.UUID(str(value or ""))
        return True
    except Exception:
        return False


def migrate() -> dict[str, int]:
    if not repository.schema_ready(force=True):
        raise SystemExit("Tabelas de relatorios nao encontradas. Rode a migration antes.")

    history = _load_json(HISTORY_PATH, [])
    chats = _load_json(CHATS_PATH, [])
    workspace = _load_json(WORKSPACE_PATH, {})

    stats = {"reports": 0, "chats": 0, "workspace": 0, "errors": 0}

    # Chats primeiro: user_reports possui FK opcional para chat_id.
    for chat in chats:
        if not isinstance(chat, dict):
            continue
        if not _valid_uuid(chat.get("userId")):
            continue
        try:
            repository.save_chat(chat)
            stats["chats"] += 1
        except Exception as exc:
            stats["errors"] += 1
            print(f"Falha ao migrar chat {chat.get('id')}: {exc}")

    for item in history:
        if not isinstance(item, dict):
            continue
        user_id = str(item.get("userId") or "").strip()
        if not user_id or not _valid_uuid(user_id):
            continue
        try:
            repository.create_report(user_id, item)
            stats["reports"] += 1
        except Exception as exc:
            # Reexecutar a migracao pode gerar conflito de PK; nesse caso apenas registra.
            stats["errors"] += 1
            print(f"Falha ao migrar relatorio {item.get('id')}: {exc}")

    # Salvar chats de novo hidrata mensagens com report_id agora existente.
    for chat in chats:
        if not isinstance(chat, dict):
            continue
        if not _valid_uuid(chat.get("userId")):
            continue
        try:
            repository.save_chat(chat)
        except Exception:
            pass

    for user_id, payload in workspace.items():
        if not isinstance(payload, dict):
            continue
        if not _valid_uuid(user_id):
            continue
        try:
            repository.save_workspace(str(user_id), payload)
            stats["workspace"] += 1
        except Exception as exc:
            stats["errors"] += 1
            print(f"Falha ao migrar workspace {user_id}: {exc}")

    return stats


def main() -> None:
    print(migrate())
    print(repository.counts())


if __name__ == "__main__":
    main()
