import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupSeededDb } from "../helpers/seeded-db.js";

describe("coverage seeded — catch 500 sem tabela", () => {
  let router: any;
  let cleanup: () => void;
  let getDb: () => { exec: (sql: string) => unknown };

  beforeAll(async () => {
    ({ router, cleanup, getDb } = await setupSeededDb());
  });

  afterAll(() => cleanup());

  it("/v1/musics com tabela vazia → data []", async () => {
    getDb().exec(`DELETE FROM musics;`);
    const res = await router.request("/v1/musics?lang=pt");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([]);
  });

  it("album detail sem relacoes → categories vazia", async () => {
    getDb().exec(`DELETE FROM categories_albums; DELETE FROM albums_musics;`);
    const res = await router.request("/json_db/album_20");
    expect(res.status).toBe(200);
    const alb = await res.json();
    expect(alb.categories).toEqual([]);
    expect(alb.musics).toEqual([]);
  });

  it("GET /v1/musics retorna 500 sem tabela musics", async () => {
    getDb().exec(`DROP TABLE IF EXISTS musics`);
    const list = await router.request("/v1/musics?lang=pt");
    expect(list.status).toBe(500);
  });
});
