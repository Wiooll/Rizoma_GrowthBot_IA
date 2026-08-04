"""Exporta o SQLite local para um backup importável pela PWA, sem segredos."""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
APP_VERSION = "1.1.0"


def _parse_json(value: Any, fallback: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value or "")
    except (TypeError, json.JSONDecodeError):
        return fallback


def _rows(connection: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    return [dict(row) for row in connection.execute(f"SELECT * FROM {table} ORDER BY id")]


def build_backup_from_connection(connection: sqlite3.Connection) -> dict[str, Any]:
    connection.row_factory = sqlite3.Row
    canais = _rows(connection, "canais")
    conteudos = _rows(connection, "conteudos")
    ideias = _rows(connection, "ideias")
    for canal in canais:
        canal["plataformas"] = _parse_json(canal.get("plataformas"), [])
    for conteudo in conteudos:
        conteudo["dados"] = _parse_json(conteudo.get("dados"), {})

    return {
        "schema_version": SCHEMA_VERSION,
        "app_version": APP_VERSION,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "canais": len(canais),
            "conteudos": len(conteudos),
            "ideias": len(ideias),
        },
        "canais": canais,
        "conteudos": conteudos,
        "ideias": ideias,
        "preferencias": {},
    }


def build_backup(database_path: Path) -> dict[str, Any]:
    if not database_path.is_file():
        raise FileNotFoundError(f"Banco não encontrado: {database_path}")

    connection = sqlite3.connect(database_path)
    try:
        return build_backup_from_connection(connection)
    finally:
        connection.close()


def export_backup(database_path: Path, output_path: Path) -> dict[str, int]:
    backup = build_backup(database_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8")
    return backup["counts"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta dados locais do Rizoma para o iPhone.")
    parser.add_argument("--database", type=Path, default=Path("data/rizoma.db"))
    parser.add_argument("--output", type=Path, default=Path("data/rizoma-mobile-backup.json"))
    args = parser.parse_args()

    counts = export_backup(args.database, args.output)
    print(
        "Backup criado com "
        f"{counts['canais']} canais, {counts['conteudos']} conteúdos e {counts['ideias']} ideias."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
