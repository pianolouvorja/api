#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB = Path(__file__).parents[1] / "data" / "database.db"
con = sqlite3.connect(DB)
for (table,) in con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
    cols = [row[1] for row in con.execute(f'PRAGMA table_info("{table}")')]
    count = con.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
    print(f"{table}\t{count}\t{','.join(cols)}")
    if count and table.upper() in {"MUSICAS", "ALBUM_MUSICAS", "ARQUIVOS_SISTEMA", "MUSICAS_SLIDE"}:
        print("  sample:", con.execute(f'SELECT * FROM "{table}" LIMIT 1').fetchone())

print("\nTarget IDs:")
for table in ("MUSICAS", "musics"):
    try:
        print(table, con.execute(f'SELECT * FROM "{table}" WHERE CAST(id AS TEXT)=\'90101\' LIMIT 1').fetchone())
    except sqlite3.Error as exc:
        print(table, exc)

assert con.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
print("integrity_check: ok")
con.close()
