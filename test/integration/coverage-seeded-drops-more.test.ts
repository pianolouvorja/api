import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupSeededDb } from "../helpers/seeded-db.js";

describe("coverage seeded — 500 sem albums/categories/bible", () => {
  let router: any;
  let cleanup: () => void;
  let getDb: () => { exec: (sql: string) => unknown };

  beforeAll(async () => {
    ({ router, cleanup, getDb } = await setupSeededDb());
  });

  afterAll(() => cleanup());

  it("GET /v1/albums retorna 500 sem tabela albums", async () => {
    getDb().exec(`DROP TABLE IF EXISTS albums`);
    const list = await router.request("/v1/albums?lang=pt");
    expect(list.status).toBe(500);
    const detail = await router.request("/v1/albums/20?lang=pt");
    expect(detail.status).toBe(500);
  });

  it("GET /v1/categories retorna 500 sem tabela categories", async () => {
    getDb().exec(`DROP TABLE IF EXISTS categories`);
    const list = await router.request("/v1/categories?lang=pt");
    expect(list.status).toBe(500);
    const detail = await router.request("/v1/categories/11?lang=pt");
    expect(detail.status).toBe(500);
  });

  it("GET /v1/bible retorna 500 sem tabela bible_books", async () => {
    getDb().exec(`DROP TABLE IF EXISTS bible_books`);
    getDb().exec(`DROP TABLE IF EXISTS bible_chapters`);
    const list = await router.request("/v1/bible?lang=pt");
    expect(list.status).toBe(500);
    const detail = await router.request("/v1/bible/50/1?lang=pt");
    expect(detail.status).toBe(500);
  });

  it("GET /json_db/arquivo-invalido → 404", async () => {
    const res = await router.request("/json_db/foo_bar");
    expect(res.status).toBe(404);
  });
});
