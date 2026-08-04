import json
import sqlite3
import unittest

from scripts.export_mobile_backup import build_backup_from_connection


class MobileExportTest(unittest.TestCase):
    def test_exporta_relacoes_sem_chaves(self):
        connection = sqlite3.connect(":memory:")
        connection.executescript(
            """
            CREATE TABLE canais (id INTEGER PRIMARY KEY, nome TEXT, nicho TEXT, tom TEXT, publico TEXT, plataformas TEXT, youtube_url TEXT, criado_em TEXT);
            CREATE TABLE conteudos (id INTEGER PRIMARY KEY, canal_id INTEGER, tema TEXT, modo TEXT, dados TEXT, criado_em TEXT);
            CREATE TABLE ideias (id INTEGER PRIMARY KEY, canal_id INTEGER, tema TEXT, potencial INTEGER, status TEXT, criado_em TEXT);
            INSERT INTO canais VALUES (1, 'Canal', 'Tech', 'Direto', 'Criadores', '["YouTube"]', '', '2026-08-04T00:00:00Z');
            INSERT INTO conteudos VALUES (2, 1, 'Tema', 'pos', '{"youtube":{"titulo":"Teste"}}', '2026-08-04T00:00:00Z');
            INSERT INTO ideias VALUES (3, 1, 'Ideia', 4, 'nova', '2026-08-04T00:00:00Z');
            """
        )
        backup = build_backup_from_connection(connection)
        connection.close()
        self.assertEqual(backup["counts"], {"canais": 1, "conteudos": 1, "ideias": 1})
        self.assertEqual(backup["canais"][0]["plataformas"], ["YouTube"])
        self.assertEqual(backup["conteudos"][0]["dados"]["youtube"]["titulo"], "Teste")
        self.assertNotIn("api_key", json.dumps(backup).lower())


if __name__ == "__main__":
    unittest.main()
