from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.backend.reports.api import repository

MIGRATIONS = (
    ROOT / "db" / "migrations" / "20260501_user_report_persistence.sql",
    ROOT / "db" / "migrations" / "20260501_user_report_message_order.sql",
)


def main() -> None:
    for migration in MIGRATIONS:
        repository.apply_sql_file(migration)
    if not repository.schema_ready(force=True):
        raise SystemExit("Migration aplicada, mas tabelas de relatorios nao foram encontradas.")
    print("Migrations de persistencia de relatorios aplicadas.")
    print(repository.counts())


if __name__ == "__main__":
    main()
