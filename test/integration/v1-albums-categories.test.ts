import { afterAll, beforeAll, describe, expect, it } from "vitest";
import router from "../../src/app.js";
import { closeDb, initDb } from "../../src/db/connection.js";

describe("GET /v1/albums e /v1/categories", () => {
  beforeAll(() => {
    initDb();
  });
  afterAll(() => {
    closeDb();
  });

  // === ALBUMS ===

  it("deve retornar uma lista de álbuns com paginação para pt", async () => {
    const res = await router.request("/v1/albums?lang=pt&page=1&per_page=5");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("meta");
    expect(body.meta).toHaveProperty("current_page", 1);
    expect(body.meta).toHaveProperty("per_page", 5);
    expect(body.meta).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);

    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("id_album");
      expect(body.data[0]).toHaveProperty("name");
      expect(body.data[0]).toHaveProperty("color");
      expect(body.data[0]).toHaveProperty("url_image");
    }
  });

  it("deve retornar um álbum específico pelo ID com músicas", async () => {
    // Álbum 1 do PT ("Nosso Sol é Jesus")
    const res = await router.request("/v1/albums/1?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_album");
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("categories");
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body).toHaveProperty("musics");
    expect(Array.isArray(body.musics)).toBe(true);

    if (body.musics.length > 0) {
      expect(body.musics[0]).toHaveProperty("id_music");
      expect(body.musics[0]).toHaveProperty("name");
      expect(body.musics[0]).toHaveProperty("has_instrumental_music");
      expect(body.musics[0]).toHaveProperty("duration");
      expect(body.musics[0]).toHaveProperty("track");
    }
  });

  // === CATEGORIES ===

  it("deve retornar uma lista de categorias para pt (array direto, sem wrapper)", async () => {
    const res = await router.request("/v1/categories?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    // Categories retorna array direto (paridade com /json_db/pt_categories)
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      expect(body[0]).toHaveProperty("id_category");
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("albums");
      expect(Array.isArray(body[0].albums)).toBe(true);

      if (body[0].albums.length > 0) {
        expect(body[0].albums[0]).toHaveProperty("id_album");
        expect(body[0].albums[0]).toHaveProperty("name");
        expect(body[0].albums[0]).toHaveProperty("color");
        expect(body[0].albums[0]).toHaveProperty("url_image");
      }
    }
  });

  it("deve retornar uma categoria específica pelo ID", async () => {
    const res = await router.request("/v1/categories/1?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_category");
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("albums");
    expect(Array.isArray(body.albums)).toBe(true);
  });

  it("deve retornar 404 para uma categoria inexistente", async () => {
    const res = await router.request("/v1/categories/999999?lang=pt");
    expect(res.status).toBe(404);
  });
});
