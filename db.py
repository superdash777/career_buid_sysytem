"""SQLite-хранилище для auth и пользовательских данных (MVP)."""

from __future__ import annotations

import sqlite3
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
DB_PATH = PROJECT_DIR / "career_copilot.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    columns = conn.execute(f"PRAGMA table_info({table})").fetchall()
    names = {row["name"] for row in columns}
    if column not in names:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def init_db() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        _ensure_column(conn, "users", "experience_level", "experience_level TEXT")
        _ensure_column(conn, "users", "pain_point", "pain_point TEXT")
        _ensure_column(conn, "users", "development_hours_per_week", "development_hours_per_week INTEGER")
        conn.commit()
