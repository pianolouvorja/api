import { unlinkSync } from "node:fs";
import { closeDb, getDb, initDb } from "../../src/db/connection.js";

export function openIsolatedDb(name: string): string {
  const dbPath = `./data/test-${name}.db`;
  process.env.DB_PATH = dbPath;
  initDb();
  return dbPath;
}

export function seedMinimalCatalog(): void {
  const db = getDb();
  db.exec(`
    INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Portugues');
    INSERT OR IGNORE INTO albums (id_album, name, color, id_language)
      VALUES (1, 'Nosso Sol e Jesus', '#000000', 'pt');
    INSERT OR IGNORE INTO musics (id_music, name, id_language)
      VALUES (1, 'Musica Teste', 'pt');
    INSERT OR IGNORE INTO lyrics (id_lyric, id_music, lyric, time, show_slide, "order", id_language)
      VALUES (1, 1, 'Estrofe teste', '00:00', 1, 0, 'pt');
    INSERT OR IGNORE INTO albums_musics (id_album, id_music, track, id_language)
      VALUES (1, 1, 1, 'pt');
    INSERT OR IGNORE INTO categories (id_category, name, id_language, slug, type, "order")
      VALUES (1, 'Colecao', 'pt', 'colecao', 'collection', 0);
    INSERT OR IGNORE INTO categories_albums (id_category, id_album, name, "order", id_language)
      VALUES (1, 1, 'Colecao', 0, 'pt');
  `);
}

export function closeIsolatedDb(dbPath: string): void {
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      unlinkSync(`${dbPath}${suffix}`);
    } catch {}
  }
}
