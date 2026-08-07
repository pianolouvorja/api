import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { getDb } from "../db/connection.js";

export const compatRoutes = new Hono();

const UPSTREAM = process.env.UPSTREAM_API ?? "https://api.louvorja.com.br";
const BIBLE_CACHE_DIR = join(process.cwd(), "data", "bible_cache");

// ==============================================
// Helper: parsear path de arquivo do upstream (dir/file_name)
// ==============================================
function parseFilePath(fullPath: string): { dir: string; file_name: string } {
  const idx = fullPath.lastIndexOf("/");
  if (idx === -1) return { dir: "/", file_name: fullPath };
  return {
    dir: fullPath.substring(0, idx),
    file_name: fullPath.substring(idx + 1),
  };
}

// ==============================================
// GET /json_db — manifest de arquivos disponiveis
// ==============================================
compatRoutes.get("/json_db", (c) => {
  // Servir manifest estatico baseado nos dados que temos
  return c.json([
    {
      file: "config.json",
      table: "config",
      path: "/db/config",
      hash: "static",
    },
    {
      file: "pt_categories.json",
      table: "pt_categories",
      path: "/db/pt_categories",
      hash: "static",
    },
    {
      file: "pt_musics.json",
      table: "pt_musics",
      path: "/db/pt_musics",
      hash: "static",
    },
    {
      file: "pt_hymnal.json",
      table: "pt_hymnal",
      path: "/db/pt_hymnal",
      hash: "static",
    },
    {
      file: "pt_hymnal_1996.json",
      table: "pt_hymnal_1996",
      path: "/db/pt_hymnal_1996",
      hash: "static",
    },
    {
      file: "pt_bible_book.json",
      table: "pt_bible_book",
      path: "/db/pt_bible_book",
      hash: "static",
    },
    {
      file: "pt_bible_version.json",
      table: "pt_bible_version",
      path: "/db/pt_bible_version",
      hash: "static",
    },
  ]);
});

// ==============================================
// GET /json_db/:file — router generico que faz parse do filename
// ==============================================
compatRoutes.get("/json_db/:file", (c) => {
  const file = c.req.param("file");
  const db = getDb();

  // config
  if (file === "config") {
    return c.json({
      datetime: new Date().toISOString().slice(0, 19).replace("T", " "),
      latest_updated: new Date().toISOString().slice(0, 19).replace("T", " "),
      version: Date.now(),
      version_number: 1,
    });
  }

  // pt_categories ou es_categories
  if (file === "pt_categories" || file === "es_categories") {
    const lang = file.split("_")[0];
    const categories = db
      .prepare(
        `SELECT id_category, name, slug, "order"
         FROM categories
         WHERE type = 'collection' AND id_language = ?
         ORDER BY "order"`,
      )
      .all(lang) as any[];

    const result = categories.map((cat) => {
      const albums = db
        .prepare(
          `SELECT al.id_album, al.name, al.color,
             fi.url as url_image,
             ca.name as subtitle, ca."order"
           FROM albums al
           INNER JOIN categories_albums ca ON ca.id_album = al.id_album
           LEFT JOIN files fi ON al.id_file_image = fi.id_file
           WHERE ca.id_category = ? AND al.id_language = ?
           ORDER BY ca."order"`,
        )
        .all(cat.id_category, lang) as any[];

      return {
        id_category: cat.id_category,
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
        albums: albums.map((a) => ({
          id_album: a.id_album,
          name: a.name,
          color: a.color,
          url_image: a.url_image || null,
          subtitle: a.subtitle || "",
          order: a.order,
        })),
      };
    });

    return c.json(result);
  }

  // pt_musics ou es_musics
  if (file === "pt_musics" || file === "es_musics") {
    const lang = file.split("_")[0];
    const musics = db
      .prepare(
        `SELECT
          m.id_music, m.name,
          CASE WHEN IFNULL(m.id_file_instrumental_music, 0) > 0 THEN 1 ELSE 0 END as has_instrumental_music,
          fm.duration as duration,
          (SELECT GROUP_CONCAT(l.lyric, ' ') FROM lyrics l WHERE l.id_music = m.id_music) as lyric,
          (SELECT GROUP_CONCAT(al.name, '|')
             FROM albums al
             INNER JOIN albums_musics am2 ON am2.id_album = al.id_album
             INNER JOIN categories_albums ca ON ca.id_album = al.id_album
             INNER JOIN categories ct ON ct.id_category = ca.id_category
             WHERE ct.type IN ('hymnal', 'collection')
               AND am2.id_music = m.id_music
             GROUP BY am2.id_music) as albums_names
        FROM musics m
        LEFT JOIN files fm ON m.id_file_music = fm.id_file
        WHERE m.id_language = ?`,
      )
      .all(lang) as any[];

    const result = musics.map((m) => {
      const albums = db
        .prepare(
          `SELECT al.id_album, al.name, MIN(ct."order") as "order", ct.type,
             am.track
           FROM albums_musics am
           INNER JOIN albums al ON al.id_album = am.id_album
           LEFT JOIN categories_albums ca ON ca.id_album = al.id_album
           LEFT JOIN categories ct ON ct.id_category = ca.id_category
           WHERE ct.type IN ('hymnal', 'collection') AND am.id_music = ?
           GROUP BY al.id_album, al.name, am.id_music, am.id_album, am.track, ct.type
           ORDER BY "order"`,
        )
        .all(m.id_music) as any[];

      return {
        id_music: m.id_music,
        name: m.name,
        has_instrumental_music: m.has_instrumental_music,
        duration: m.duration || null,
        lyric: m.lyric || null,
        albums_names: m.albums_names || null,
        albums: albums.map((a) => ({
          id_album: a.id_album,
          name: a.name,
          order: a.order,
          type: a.type,
          pivot: { id_music: m.id_music, id_album: a.id_album, track: a.track },
        })),
      };
    });

    return c.json(result);
  }

  // pt_hymnal ou es_hymnal
  if (file === "pt_hymnal" || file === "es_hymnal") {
    const lang = file.split("_")[0];
    const musics = db
      .prepare(
        `SELECT m.id_music, m.name, am.track,
           CASE WHEN IFNULL(m.id_file_instrumental_music, 0) > 0 THEN 1 ELSE 0 END as has_instrumental_music,
           fm.duration as duration,
           (SELECT GROUP_CONCAT(l.lyric, ' ') FROM lyrics l WHERE l.id_music = m.id_music) as lyric
         FROM musics m
         INNER JOIN albums_musics am ON am.id_music = m.id_music
         INNER JOIN categories_albums ca ON ca.id_album = am.id_album
         INNER JOIN categories ct ON ct.id_category = ca.id_category
         LEFT JOIN files fm ON m.id_file_music = fm.id_file
         WHERE ct.slug = 'hymnal' AND m.id_language = ?
         ORDER BY am.track`,
      )
      .all(lang) as any[];

    return c.json(musics);
  }

  // pt_hymnal_1996
  if (file === "pt_hymnal_1996" || file === "es_hymnal_1996") {
    const lang = file.split("_")[0];
    const musics = db
      .prepare(
        `SELECT m.id_music, m.name, am.track,
           CASE WHEN IFNULL(m.id_file_instrumental_music, 0) > 0 THEN 1 ELSE 0 END as has_instrumental_music,
           fm.duration as duration,
           (SELECT GROUP_CONCAT(l.lyric, ' ') FROM lyrics l WHERE l.id_music = m.id_music) as lyric
         FROM musics m
         INNER JOIN albums_musics am ON am.id_music = m.id_music
         INNER JOIN categories_albums ca ON ca.id_album = am.id_album
         INNER JOIN categories ct ON ct.id_category = ca.id_category
         LEFT JOIN files fm ON m.id_file_music = fm.id_file
         WHERE ct.slug = 'hymnal_1996' AND m.id_language = ?
         ORDER BY am.track`,
      )
      .all(lang) as any[];

    return c.json(musics);
  }

  // music_{id}
  const musicMatch = file.match(/^music_(\d+)$/);
  if (musicMatch) {
    const idMusic = parseInt(musicMatch[1], 10);
    return handleMusicDetail(c, db, idMusic);
  }

  // album_{id}
  const albumMatch = file.match(/^album_(\d+)$/);
  if (albumMatch) {
    const idAlbum = parseInt(albumMatch[1], 10);
    return handleAlbumDetail(c, db, idAlbum);
  }

  // pt_bible_book
  if (file === "pt_bible_book") {
    const books = db
      .prepare(
        `SELECT id_book AS id_bible_book, book_number, name, chapters, abbreviation, testament, keywords, color
         FROM bible_books WHERE id_language = 'pt' ORDER BY book_number`,
      )
      .all();
    return c.json(books);
  }

  // pt_bible_version
  if (file === "pt_bible_version") {
    const versions = db
      .prepare(
        `SELECT id_version AS id_bible_version, name, abbreviation FROM bible_versions WHERE language = 'pt' ORDER BY name`,
      )
      .all();
    return c.json(versions);
  }

  // bible_{version}_{book}_{chapter} — lazy proxy
  const bibleMatch = file.match(/^bible_(\d+)_(\d+)_(\d+)$/);
  if (bibleMatch) {
    return handleBibleChapter(c, file);
  }

  return c.json({ error: "Arquivo nao encontrado!" }, 404);
});

// ==============================================
// Handler: detalhe de musica
// ==============================================
function handleMusicDetail(c: any, db: any, idMusic: number) {
  const music = db
    .prepare(
      `SELECT m.id_music, m.name,
         fm.duration as duration,
         fi.duration as instrumental_duration,
         fi_img.url as url_image,
         fi_img.image_position as image_position,
         fm.url as url_music,
         fi_inst.url as url_instrumental_music
       FROM musics m
       LEFT JOIN files fi_img ON m.id_file_image = fi_img.id_file
       LEFT JOIN files fm ON m.id_file_music = fm.id_file
       LEFT JOIN files fi_inst ON m.id_file_instrumental_music = fi_inst.id_file
       LEFT JOIN files fi ON m.id_file_instrumental_music = fi.id_file
       WHERE m.id_music = ?`,
    )
    .get(idMusic);

  if (!music) return c.json({ error: "Arquivo nao encontrado!" }, 404);

  const lyrics = db
    .prepare(
      `SELECT l.id_lyric, l.id_music, l.lyric, l.aux_lyric,
         fi.url as url_image, fi.image_position as image_position,
         l.time,
         CASE WHEN l.instrumental_time = '00:00:00' THEN l.time ELSE l.instrumental_time END as instrumental_time,
         l.show_slide, l."order"
       FROM lyrics l
       LEFT JOIN files fi ON l.id_file_image = fi.id_file
       WHERE l.id_music = ?
       ORDER BY l."order" ASC`,
    )
    .all(idMusic);

  const albums = db
    .prepare(
      `SELECT al.id_album, al.name, am.track,
         fi.url as url_image,
         MIN(ct."order") as "order"
       FROM albums al
       INNER JOIN albums_musics am ON am.id_album = al.id_album
       LEFT JOIN files fi ON al.id_file_image = fi.id_file
       LEFT JOIN categories_albums ca ON ca.id_album = al.id_album
       LEFT JOIN categories ct ON ct.id_category = ca.id_category
       WHERE ct.type IN ('hymnal', 'collection') AND am.id_music = ?
       GROUP BY al.id_album, al.name, am.id_music, am.id_album, am.track
       ORDER BY "order"`,
    )
    .all(idMusic);

  return c.json({
    id_music: music.id_music,
    name: music.name,
    duration: music.duration || null,
    instrumental_duration: music.instrumental_duration || null,
    url_image: music.url_image || null,
    image_position: music.image_position ?? null,
    url_music: music.url_music || null,
    url_instrumental_music: music.url_instrumental_music || null,
    lyric: lyrics.map((l: any) => ({
      id_lyric: l.id_lyric,
      id_music: l.id_music,
      lyric: l.lyric,
      aux_lyric: l.aux_lyric,
      url_image: l.url_image || null,
      image_position: l.image_position ?? null,
      time: l.time,
      instrumental_time: l.instrumental_time,
      show_slide: l.show_slide,
      order: l.order,
    })),
    albums: albums.map((a: any) => ({
      id_album: a.id_album,
      name: a.name,
      track: a.track,
      url_image: a.url_image || null,
      order: a.order,
    })),
  });
}

// ==============================================
// Handler: detalhe de album
// ==============================================
function handleAlbumDetail(c: any, db: any, idAlbum: number) {
  const album = db
    .prepare(
      `SELECT a.id_album, a.name, a.color, fi.url as url_image
       FROM albums a
       LEFT JOIN files fi ON a.id_file_image = fi.id_file
       WHERE a.id_album = ?`,
    )
    .get(idAlbum);

  if (!album) return c.json({ error: "Arquivo nao encontrado!" }, 404);

  const catRow = db
    .prepare(
      `SELECT GROUP_CONCAT(ct.type || '.' || ct.slug, '|') as categories
       FROM categories ct
       INNER JOIN categories_albums ca ON ca.id_category = ct.id_category
       WHERE ca.id_album = ?`,
    )
    .get(idAlbum);

  const categories = catRow?.categories ? catRow.categories.split("|") : [];

  const musics = db
    .prepare(
      `SELECT m.id_music, m.name,
         CASE WHEN IFNULL(m.id_file_instrumental_music, 0) > 0 THEN 1 ELSE 0 END as has_instrumental_music,
         fm.duration as duration, am.track
       FROM musics m
       INNER JOIN albums_musics am ON am.id_music = m.id_music
       LEFT JOIN files fm ON m.id_file_music = fm.id_file
       WHERE am.id_album = ?
       ORDER BY am.track ASC`,
    )
    .all(idAlbum);

  return c.json({
    id_album: album.id_album,
    name: album.name,
    color: album.color,
    url_image: album.url_image || null,
    categories,
    musics: musics.map((m: any) => ({
      id_music: m.id_music,
      name: m.name,
      has_instrumental_music: m.has_instrumental_music,
      duration: m.duration || null,
      track: m.track,
    })),
  });
}

// ==============================================
// Handler: bible chapter (lazy proxy com cache)
// ==============================================
function handleBibleChapter(c: any, cacheKey: string) {
  mkdirSync(BIBLE_CACHE_DIR, { recursive: true });
  const cacheFile = join(BIBLE_CACHE_DIR, `${cacheKey}.json`);

  if (existsSync(cacheFile)) {
    const cached = readFileSync(cacheFile, "utf-8");
    return c.json(JSON.parse(cached));
  }

  return c.json({ error: "Versiculo nao cacheado." });
}

// ==============================================
// GET /file/:path* — serve imagens e MP3 (redirect pro upstream)
// ==============================================
compatRoutes.get("/file/:path{.*}", (c) => {
  const path = c.req.param("path");
  const url = `${UPSTREAM}/file/${path}`;
  return c.redirect(url, 302);
});
