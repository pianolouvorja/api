import { afterAll, beforeAll, describe, expect, it } from "vitest";
import router from "../../src/app.js";
import { closeDb, initDb } from "../../src/db/connection.js";
import { seedTestData } from "./helpers/seed.js";

describe("Regressão Endpoints Legados (compat.ts)", () => {
  beforeAll(() => {
    initDb();
    seedTestData();
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
