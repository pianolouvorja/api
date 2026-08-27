import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupSeededDb } from "../helpers/seeded-db.js";

describe("GET /v1/musics", () => {
  let router: any;
  let cleanup: () => void;

  beforeAll(async () => {
    ({ router, cleanup } = await setupSeededDb());
  });
  afterAll(() => cleanup());

  it("deve retornar uma lista de músicas com paginação para pt", async () => {
    const res = await router.request("/v1/musics?lang=pt&page=1&per_page=5");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("meta");
    expect(body.meta).toHaveProperty("current_page", 1);
    expect(body.meta).toHaveProperty("per_page", 5);
    expect(body.meta).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.data.length).toBeGreaterThan(0);

    expect(body.data[0]).toHaveProperty("id_music");
    expect(body.data[0]).toHaveProperty("name");
    expect(body.data[0]).toHaveProperty("has_instrumental_music");
    expect(body.data[0]).toHaveProperty("duration");
    expect(body.data[0]).toHaveProperty("lyric");
    expect(body.data[0]).toHaveProperty("albums_names");
    expect(body.data[0]).toHaveProperty("albums");
    expect(Array.isArray(body.data[0].albums)).toBe(true);
  });

  it("deve retornar uma música específica pelo ID com letras", async () => {
    const res = await router.request("/v1/musics/1?lang=pt");
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("id_music", 1);
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("duration");
    expect(body).toHaveProperty("url_image");
    expect(body).toHaveProperty("url_music");
    expect(body).toHaveProperty("lyric");
    expect(Array.isArray(body.lyric)).toBe(true);
    expect(body.lyric.length).toBeGreaterThan(0);

    expect(body.lyric[0]).toHaveProperty("id_lyric");
    expect(body.lyric[0]).toHaveProperty("lyric");
    expect(body.lyric[0]).toHaveProperty("time");
    expect(body.lyric[0]).toHaveProperty("show_slide");
    expect(body.lyric[0]).toHaveProperty("order");
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
