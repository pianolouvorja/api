import { afterAll, beforeAll, describe, expect, it } from "vitest";
import router from "../../src/app.js";
import { closeDb, getDb, initDb } from "../../src/db/connection.js";

describe("Regressão Endpoints Legados (compat.ts)", () => {
  beforeAll(() => {
    initDb();
    // Fixture mínima e determinística; CI não depende do catálogo externo.
    getDb().exec(`
      INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Português');
      INSERT OR IGNORE INTO files (id_file, name, url, duration) VALUES
        (1, 'capa.jpg', '/file/capa.jpg', '00:00:00'),
        (2, 'musica.mp3', '/file/musica.mp3', '03:00:00');
      INSERT OR IGNORE INTO albums (id_album, name, id_file_image, color, id_language)
        VALUES (1, 'Álbum de teste', 1, '#000000', 'pt');
      INSERT OR IGNORE INTO musics (id_music, name, id_file_image, id_file_music, id_language)
        VALUES (1, 'Música de teste', 1, 2, 'pt');
      INSERT OR IGNORE INTO lyrics (id_music, lyric, id_language, "order")
        VALUES (1, 'Letra de teste', 'pt', 1);
      INSERT OR IGNORE INTO categories (id_category, name, id_language, slug, type, "order")
        VALUES (1, 'Coleção de teste', 'pt', 'collection', 'collection', 1);
      INSERT OR IGNORE INTO albums_musics (id_album, id_music, track, id_language)
        VALUES (1, 1, 1, 'pt');
      INSERT OR IGNORE INTO categories_albums (id_category, id_album, name, "order", id_language)
        VALUES (1, 1, 'Coleção de teste', 1, 'pt');
    `);
  });
  afterAll(() => {
    closeDb();
  });

  it("GET /json_db/pt_musics - deve retornar array de musicas (formato upstream)", async () => {
    const res = await router.request("/json_db/pt_musics");
    expect(res.status).toBe(200);
    const body = await res.json();

    // Formato upstream: array direto na raiz
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty("id_music");
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("lyric");
      expect(body[0]).toHaveProperty("albums");
    }
  });

  it("GET /json_db/pt_categories - deve retornar categorias com albums aninhados", async () => {
    const res = await router.request("/json_db/pt_categories");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty("id_category");
      expect(body[0]).toHaveProperty("albums");
    }
  });

  it("GET /json_db/music_1 - deve retornar detalhe de musica com estrofes", async () => {
    const res = await router.request("/json_db/music_1");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_music");
    expect(body).toHaveProperty("lyric");
    expect(body).toHaveProperty("url_music");
    expect(Array.isArray(body.lyric)).toBe(true);
  });

  it("GET /json_db/album_1 - deve retornar album com musicas", async () => {
    const res = await router.request("/json_db/album_1");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_album");
    expect(body).toHaveProperty("musics");
    expect(Array.isArray(body.musics)).toBe(true);
  });
});
