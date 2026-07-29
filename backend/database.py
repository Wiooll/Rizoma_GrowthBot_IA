"""
Rizoma — Camada de banco de dados (SQLite)
Gerencia canais, conteúdos gerados e ideias.
"""

import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
from typing import Optional

DB_PATH = Path("data/rizoma.db")


def init_db():
    """Inicializa o banco criando as tabelas se não existirem."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS canais (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nome        TEXT    NOT NULL,
                nicho       TEXT    NOT NULL,
                tom         TEXT    NOT NULL,
                publico     TEXT    NOT NULL,
                plataformas TEXT    NOT NULL DEFAULT '[]',
                youtube_url TEXT    DEFAULT '',
                criado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS conteudos (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                canal_id  INTEGER NOT NULL,
                tema      TEXT    NOT NULL,
                modo      TEXT    NOT NULL,
                dados     TEXT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (canal_id) REFERENCES canais(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ideias (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                canal_id  INTEGER NOT NULL,
                tema      TEXT    NOT NULL,
                potencial INTEGER DEFAULT 3,
                status    TEXT    DEFAULT 'nova',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (canal_id) REFERENCES canais(id) ON DELETE CASCADE
            );
        """)
        try:
            conn.execute("ALTER TABLE canais ADD COLUMN youtube_url TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # Coluna já existe


@contextmanager
def get_db():
    """Context manager para conexão SQLite com auto-commit e rollback."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─── Canais ───────────────────────────────────────────────────────────────────

def criar_canal(nome: str, nicho: str, tom: str, publico: str, plataformas: list, youtube_url: str = "") -> int:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO canais (nome, nicho, tom, publico, plataformas, youtube_url) VALUES (?,?,?,?,?,?)",
            (nome, nicho, tom, publico, json.dumps(plataformas), youtube_url),
        )
        return cur.lastrowid


def listar_canais() -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM canais ORDER BY criado_em DESC"
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["plataformas"] = json.loads(d["plataformas"] or "[]")
        result.append(d)
    return result


def obter_canal(canal_id: int) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM canais WHERE id = ?", (canal_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    d["plataformas"] = json.loads(d["plataformas"] or "[]")
    return d


def atualizar_canal(canal_id: int, nome: str, nicho: str, tom: str,
                    publico: str, plataformas: list, youtube_url: str = ""):
    with get_db() as conn:
        conn.execute(
            "UPDATE canais SET nome=?,nicho=?,tom=?,publico=?,plataformas=?,youtube_url=? WHERE id=?",
            (nome, nicho, tom, publico, json.dumps(plataformas), youtube_url, canal_id),
        )


def deletar_canal(canal_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM canais WHERE id = ?", (canal_id,))


# ─── Conteúdos ────────────────────────────────────────────────────────────────

def salvar_conteudo(canal_id: int, tema: str, modo: str, dados: dict) -> int:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO conteudos (canal_id, tema, modo, dados) VALUES (?,?,?,?)",
            (canal_id, tema, modo, json.dumps(dados, ensure_ascii=False)),
        )
        return cur.lastrowid


def listar_historico(canal_id: Optional[int] = None, limit: int = 20) -> list:
    with get_db() as conn:
        if canal_id:
            rows = conn.execute(
                """SELECT c.id, c.tema, c.modo, c.criado_em, ch.nome as canal_nome
                   FROM conteudos c
                   JOIN canais ch ON c.canal_id = ch.id
                   WHERE c.canal_id = ?
                   ORDER BY c.criado_em DESC LIMIT ?""",
                (canal_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT c.id, c.tema, c.modo, c.criado_em, ch.nome as canal_nome
                   FROM conteudos c
                   JOIN canais ch ON c.canal_id = ch.id
                   ORDER BY c.criado_em DESC LIMIT ?""",
                (limit,),
            ).fetchall()
    return [dict(r) for r in rows]


def obter_conteudo(conteudo_id: int) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM conteudos WHERE id = ?", (conteudo_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    try:
        d["dados"] = json.loads(d["dados"] or "{}")
    except Exception:
        d["dados"] = {}
    return d


# ─── Ideias ───────────────────────────────────────────────────────────────────

def salvar_ideia(canal_id: int, tema: str, potencial: int = 3) -> int:
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO ideias (canal_id, tema, potencial) VALUES (?,?,?)",
            (canal_id, tema, potencial),
        )
        return cur.lastrowid


def listar_ideias(canal_id: int, limit: int = 10) -> list:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM ideias WHERE canal_id = ? ORDER BY criado_em DESC LIMIT ?",
            (canal_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def atualizar_status_ideia(ideia_id: int, status: str):
    with get_db() as conn:
        conn.execute(
            "UPDATE ideias SET status = ? WHERE id = ?", (status, ideia_id)
        )


def deletar_ideia(ideia_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM ideias WHERE id = ?", (ideia_id,))
