import { afterAll, beforeAll, describe, expect, it } from "vitest";
import router from "../../src/app.js";
import { closeDb, initDb } from "../../src/db/connection.js";

describe("GET /v1/musics", () => {
  beforeAll(() => {
    initDb();
  });
  afterAll(() => {
    closeDb();
  });

  it("deve retornar uma lista de músicas com paginação para pt", async () => {
    const res = await router.request("/v1/musics?lang=pt&page=1&per_page=5");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("current_page", 1);
    expect(body).toHaveProperty("per_page", 5);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);

    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("id_music");
      expect(body.data[0]).toHaveProperty("name");
    }
  });

  it("deve retornar uma música específica pelo ID", async () => {
    const res = await router.request("/v1/musics/1?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_music", 1);
    expect(body).toHaveProperty("name", "Nosso Sol é Jesus");
  });

  it("deve retornar 404 para uma música inexistente", async () => {
    const res = await router.request("/v1/musics/999999?lang=pt");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Música não encontrada");
  });

  it("deve falhar a validação do schema caso lang não seja provido", async () => {
    const res = await router.request("/v1/musics");
    expect(res.status).toBe(400);
  });
});
