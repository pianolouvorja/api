import { getDb } from "../../../src/db/connection.js";

/**
 * Insere dados minimos para testes de integracao.
 * O CI cria um DB fresh (so migrations, sem dados).
 * Os testes esperam encontrar music/album/category com ID 1.
 */
export function seedTestData(): void {
  const db = getDb();

  // Limpar dados existentes (ordem reversa por FK)
  db.exec(`
    DELETE FROM lyrics;
    DELETE FROM albums_musics;
    DELETE FROM categories_albums;
    DELETE FROM categories;
    DELETE FROM musics;
    DELETE FROM albums;
    DELETE FROM files;
    DELETE FROM languages;
  `);

  // Reset autoincrement
  db.exec(`
    DELETE FROM sqlite_sequence WHERE name IN ('files', 'albums', 'musics', 'lyrics', 'categories');
  `);

  // Language
  db.prepare(`INSERT INTO languages (id_language, name) VALUES (?, ?)`).run(
    "pt",
    "Portugues",
  );

  // File (imagem do album)
  db.prepare(
    `INSERT INTO files (name, path, type, url, size) VALUES (?, ?, ?, ?, ?)`,
  ).run(
    "capa.jpg",
    "images/capa.jpg",
    "image",
    "https://example.com/capa.jpg",
    12345,
  );

  // Album
  db.prepare(
    `INSERT INTO albums (name, id_file_image, color, id_language) VALUES (?, ?, ?, ?)`,
  ).run("Nosso Sol e Jesus", 1, "#ff0000", "pt");

  // Music
  db.prepare(
    `INSERT INTO musics (name, id_file_image, id_file_music, id_file_instrumental_music, id_language) VALUES (?, ?, ?, ?, ?)`,
  ).run("Musica Teste 1", 1, null, null, "pt");

  // Lyric
  db.prepare(
    `INSERT INTO lyrics (id_music, lyric, aux_lyric, time, show_slide, "order", id_language) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(1, "Linha 1\\nLinha 2", "", "00:30", 1, 0, "pt");

  // Album <-> Music
  db.prepare(
    `INSERT INTO albums_musics (id_album, id_music, track) VALUES (?, ?, ?)`,
  ).run(1, 1, 1);

  // Category
  db.prepare(`INSERT INTO categories (name, id_language) VALUES (?, ?)`).run(
    "Categoria Teste",
    "pt",
  );

  // Category <-> Album
  db.prepare(
    `INSERT INTO categories_albums (id_category, id_album) VALUES (?, ?)`,
  ).run(1, 1);
}
