import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupSeededDb } from "../helpers/seeded-db.js";

describe("coverage seeded — json_db e dados nulos/preenchidos", () => {
  let router: any;
  let cleanup: () => void;
  let getDb: () => { exec: (sql: string) => unknown };

  beforeAll(async () => {
    ({ router, cleanup, getDb } = await setupSeededDb());
    getDb().exec(`DELETE FROM categories_albums WHERE id_album = 1;`);
  });

  afterAll(() => cleanup());

  it("pt_categories: album cheio (url_image/color) e album vazio (nulls)", async () => {
    const res = await router.request("/json_db/pt_categories");
    expect(res.status).toBe(200);
    const data = await res.json();
    const coletanea = data.find((c: any) => c.id_category === 11);
    expect(coletanea.albums).toHaveLength(2);
    expect(coletanea.albums[0].url_image).toBe("https://cdn/alb.jpg");
    expect(coletanea.albums[0].subtitle).toBe("");
    expect(coletanea.albums[1].url_image).toBeNull();
  });

  it("pt_musics: duration/lyric preenchidos e musics sem album/lyric", async () => {
    const res = await router.request("/json_db/pt_musics");
    const data = await res.json();
    const cheia = data.find((m: any) => m.id_music === 30);
    const semAlbum = data.find((m: any) => m.id_music === 32);
    expect(cheia.duration).toBe("00:03:20");
    expect(cheia.lyric).toContain("Solo ao Deus de Israel");
    expect(cheia.albums_names).toBe("Album Cheio|Album Cheio");
    expect(semAlbum.albums_names).toBeNull();
    const vazia = data.find((m: any) => m.id_music === 31);
    expect(vazia.albums_names).toBe("Album Vazio");
  });

  it("music_31 com todos os campos nulos (branches || null e ?? null)", async () => {
    const res = await router.request("/json_db/music_31");
    const m = await res.json();
    expect(m.duration).toBeNull();
    expect(m.instrumental_duration).toBeNull();
    expect(m.url_image).toBeNull();
    expect(m.image_position).toBeNull();
    expect(m.url_music).toBeNull();
    expect(m.url_instrumental_music).toBeNull();
    expect(m.lyric[0].url_image).toBeNull();
    expect(m.lyric[0].image_position).toBeNull();
    expect(m.lyric[0].instrumental_time).toBe("00:20");
    expect(m.lyric[0].show_slide).toBe(0);
    expect(m.albums).toHaveLength(1);
    expect(m.albums[0].url_image).toBeNull();
  });

  it("music_30 com campos preenchidos (image_position, instrumental_time custom)", async () => {
    const res = await router.request("/json_db/music_30");
    const m = await res.json();
    expect(m.url_image).toBe("https://cdn/img1.jpg");
    expect(m.image_position).toBe(4);
    expect(m.instrumental_duration).toBe("00:03:25");
    expect(m.lyric[0].instrumental_time).toBe("00:12");
    expect(m.albums[0].url_image).toBe("https://cdn/alb.jpg");
  });

  it("album_20 com 2 categorias e album_21 sem categorias", async () => {
    const res20 = await router.request("/json_db/album_20");
    const a20 = await res20.json();
    expect(a20.categories).toContain("collection.coletanea");
    expect(a20.categories).toContain("hymnal.hymnal");
    expect(a20.url_image).toBe("https://cdn/alb.jpg");
    expect(a20.musics).toHaveLength(1);
    expect(a20.musics[0].has_instrumental_music).toBe(1);

    const res21 = await router.request("/json_db/album_21");
    const a21 = await res21.json();
    expect(a21.url_image).toBeNull();
    expect(a21.categories).toContain("collection.coletanea");
    expect(a21.musics).toHaveLength(1);
    expect(a21.musics[0].has_instrumental_music).toBe(0);
  });

  it("pt_hymnal e pt_hymnal_1996 retornam musicas do hinario", async () => {
    const res = await router.request("/json_db/pt_hymnal");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.some((m: any) => m.id_music === 30)).toBe(true);
    const res96 = await router.request("/json_db/pt_hymnal_1996");
    expect(res96.status).toBe(200);
  });

  it("pt_bible_book e pt_bible_version com colunas novas", async () => {
    const books = await (await router.request("/json_db/pt_bible_book")).json();
    expect(books[0].id_bible_book).toBe(50);
    expect(books[0].testament).toBe(2);
    expect(books[0].keywords).toContain("cristo");
    const versions = await (
      await router.request("/json_db/pt_bible_version")
    ).json();
    expect(versions[0].id_bible_version).toBe("acf");
    expect(versions[0].abbreviation).toBe("ACF");
  });

  it("GET /json_db/config retorna metadata", async () => {
    const res = await router.request("/json_db/config");
    expect(res.status).toBe(200);
    const cfg = await res.json();
    expect(cfg.version_number).toBe(1);
    expect(cfg.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("albums com color/track nulos e music 32 sem lyric/albums", async () => {
    getDb().exec(`UPDATE albums SET color = NULL WHERE id_album = 20;`);
    const list = await router.request("/v1/albums?lang=pt");
    const albums = (await list.json()).data;
    const a20 = albums.find((a: any) => a.id_album === 20);
    expect(a20.color).toBeNull();

    const detail = await router.request("/v1/albums/20?lang=pt");
    const alb = await detail.json();
    expect(alb.musics[0].duration).toBe("00:03:20");
    expect(alb.musics[0].track).toBe(1);

    const detail21 = await router.request("/v1/albums/21?lang=pt");
    const alb21 = await detail21.json();
    expect(alb21.musics[0].duration).toBeNull();

    const listMusics = await router.request("/v1/musics?lang=pt");
    const musics = await listMusics.json();
    const m32 = musics.data.find((m: any) => m.id_music === 32);
    expect(m32.lyric).toBeNull();
    expect(m32.albums_names).toBeNull();
    expect(m32.albums).toEqual([]);
  });

  it("categoria collection sem albums → albums vazio", async () => {
    getDb().exec(
      `INSERT INTO categories (id_category, name, id_language, slug, "order", type) VALUES (15,'Vazia','pt','vazia',7,'collection')`,
    );
    const list = await router.request("/v1/categories?lang=pt");
    const cats = await list.json();
    const vazia = cats.find((c: any) => c.id_category === 15);
    expect(vazia.albums).toEqual([]);
  });
});
