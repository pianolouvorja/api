import { getDb } from "../../src/db/connection.js";

/**
 * Popula o DB de teste com o catalogo minimo que os endpoints de detalhe
 * exigem (music_1, album_1, categorias). Idempotente — usa INSERT OR IGNORE.
 */
export function seedTestCatalog(): void {
  const db = getDb();

  db.prepare(
    "INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Português')",
  ).run();

  // files: 1=capa album, 2=mp3, 3=instrumental, 4=capa musica
  const insertFile = db.prepare(
    "INSERT OR IGNORE INTO files (id_file, name, path, type, url, size, dir, file_name, duration, image_position) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
  );
  insertFile.run(
    1,
    "capa_album",
    "covers/album_1.bmp",
    "image",
    "https://up/file/covers/album_1.bmp",
    "covers",
    "album_1.bmp",
    null,
    0,
  );
  insertFile.run(
    2,
    "musica",
    "musics/pt/m1.mp3",
    "audio",
    "https://up/file/musics/pt/m1.mp3",
    "musics/pt",
    "m1.mp3",
    "00:02:17",
    0,
  );
  insertFile.run(
    3,
    "musica_pb",
    "musics/pt/m1-pb.mp3",
    "audio",
    "https://up/file/musics/pt/m1-pb.mp3",
    "musics/pt",
    "m1-pb.mp3",
    "00:02:17",
    0,
  );
  insertFile.run(
    4,
    "capa_musica",
    "covers/m1.bmp",
    "image",
    "https://up/file/covers/m1.bmp",
    "covers",
    "m1.bmp",
    null,
    0,
  );

  db.prepare(
    "INSERT OR IGNORE INTO albums (id_album, name, id_file_image, color, id_language) VALUES (1, 'Coletânea Teste', 1, '#ff0000', 'pt')",
  ).run();

  db.prepare(
    "INSERT OR IGNORE INTO musics (id_music, name, id_file_image, id_file_music, id_file_instrumental_music, id_language) VALUES (1, 'Música Teste', 4, 2, 3, 'pt')",
  ).run();

  const insertLyric = db.prepare(
    'INSERT OR IGNORE INTO lyrics (id_music, lyric, "order", id_language, time, show_slide) VALUES (?, ?, ?, ?, ?, 1)',
  );
  insertLyric.run(1, "Primeira estrofe de teste", 1, "pt", "00:00:08");
  insertLyric.run(1, "Segunda estrofe de teste", 2, "pt", "00:00:45");

  db.prepare(
    "INSERT OR IGNORE INTO albums_musics (id_album, id_music, track, id_language) VALUES (1, 1, 1, 'pt')",
  ).run();

  db.prepare(
    "INSERT OR IGNORE INTO categories (id_category, name, id_language, slug, type, \"order\") VALUES (1, 'Coleções', 'pt', 'colecoes', 'collection', 1)",
  ).run();

  db.prepare(
    "INSERT OR IGNORE INTO categories_albums (id_category, id_album, \"order\", id_language) VALUES (1, 1, 1, 'pt')",
  ).run();
}
