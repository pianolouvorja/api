import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupSeededDb } from "../helpers/seeded-db.js";

describe("coverage seeded — v1 routes", () => {
  let router: any;
  let cleanup: () => void;

  beforeAll(async () => {
    ({ router, cleanup } = await setupSeededDb());
  });

  afterAll(() => cleanup());

  it("GET /v1/bible?lang=pt lista livros", async () => {
    const res = await router.request("/v1/bible?lang=pt");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data[0].id_bible_book).toBe(50);
    expect(data.data[0].name).toBe("Gálatas");
  });

  it("GET /v1/bible/50/1?lang=pt: 200, 404 livro inexistente", async () => {
    const ok = await router.request("/v1/bible/50/1?lang=pt");
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.chapter).toBe(1);
    expect(body.verses[0].text).toContain("Paulo");
    const nf = await router.request("/v1/bible/999/1?lang=pt");
    expect(nf.status).toBe(404);

    const bad = await router.request("/v1/bible/abc/1?lang=pt");
    expect(bad.status).toBe(404);
  });

  it("GET /v1/albums/20 e /v1/categories/11 com dados", async () => {
    const res = await router.request("/v1/albums/20?lang=pt");
    expect(res.status).toBe(200);
    const album = await res.json();
    expect(album.name).toBe("Album Cheio");
    expect(album.musics.length).toBeGreaterThan(0);

    const resCat = await router.request("/v1/categories/11?lang=pt");
    expect(resCat.status).toBe(200);
    const cat = await resCat.json();
    expect(cat.name).toBe("Coletanea Teste");
  });

  it("GET /v1/musics/30 (cheia) e /v1/musics/31 (nula)", async () => {
    const r30 = await router.request("/v1/musics/30?lang=pt");
    const m30 = await r30.json();
    expect(m30.image_position).toBe(4);
    expect(m30.lyric[0].image_position).toBe(4);
    expect(m30.lyric[0].instrumental_time).toBe("00:12");
    expect(m30.albums).toHaveLength(1);
    expect(m30.albums[0].url_image).toBe("https://cdn/alb.jpg");

    const r31 = await router.request("/v1/musics/31?lang=pt");
    const m31 = await r31.json();
    expect(m31.duration).toBeNull();
    expect(m31.image_position).toBeNull();
    expect(m31.lyric[0].url_image).toBeNull();
    expect(m31.lyric[0].instrumental_time).toBe("00:20");
    expect(m31.albums).toHaveLength(1);
    expect(m31.albums[0].url_image).toBeNull();
  });
});
