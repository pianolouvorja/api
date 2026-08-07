import { afterAll, beforeAll, describe, expect, it } from "vitest";
import router from "../../src/app.js";
import { closeDb, initDb } from "../../src/db/connection.js";

describe("Regressão Endpoints Legados (compat.ts)", () => {
  beforeAll(() => {
    initDb();
  });
  afterAll(() => {
    closeDb();
  });

  it("GET /json_db/musics - deve retornar um array bruto de músicas legadas", async () => {
    const res = await router.request("/json_db/musics?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    // Na API legada, o array está direto na raiz (e sem paginação)
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty("id_music");
      expect(body[0]).toHaveProperty("name");
    }
  });

  it("GET /pt/musics - deve retornar estrutura aninhada antiga", async () => {
    const res = await router.request("/pt/musics");
    expect(res.status).toBe(200);
    const body = await res.json();

    // Rota de app antigo: devolve paginação ou objeto data
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /pt/albums - deve retornar albums na rota legada", async () => {
    const res = await router.request("/pt/albums");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
  });

  it("GET /pt/categories - deve retornar categories na rota legada", async () => {
    const res = await router.request("/pt/categories");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
  });
});
