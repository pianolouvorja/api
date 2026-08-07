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

  it("deve retornar uma lista de álbuns com paginação para pt", async () => {
    const res = await router.request("/v1/albums?lang=pt&page=1&per_page=5");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("current_page", 1);
    expect(body).toHaveProperty("per_page", 5);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);

    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("id_album");
      expect(body.data[0]).toHaveProperty("name");
    }
  });

  it("deve retornar um álbum específico pelo ID", async () => {
    // Álbum 1 do PT ("Nosso Sol é Jesus")
    const res = await router.request("/v1/albums/1?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_album", 1);
    expect(body).toHaveProperty("name", "Nosso Sol é Jesus");
  });

  it("deve retornar 404 para um álbum inexistente", async () => {
    const res = await router.request("/v1/albums/999999?lang=pt");
    expect(res.status).toBe(404);
  });

  it("deve retornar uma lista de categorias com paginação para pt", async () => {
    const res = await router.request(
      "/v1/categories?lang=pt&page=1&per_page=5",
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("current_page", 1);
    expect(body).toHaveProperty("per_page", 5);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("id_category");
      expect(body.data[0]).toHaveProperty("name");
      expect(body.data[0]).toHaveProperty("albums");
      expect(Array.isArray(body.data[0].albums)).toBe(true);
    }
  });

  it("deve retornar uma categoria específica pelo ID", async () => {
    const res = await router.request("/v1/categories/1?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_category", 1);
    expect(body).toHaveProperty("albums");
  });

  it("deve retornar 404 para uma categoria inexistente", async () => {
    const res = await router.request("/v1/categories/999999?lang=pt");
    expect(res.status).toBe(404);
  });
});
