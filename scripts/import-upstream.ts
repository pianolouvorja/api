/**
 * Script de importacao do catalogo louvorja.com.br
 * Baixa: categorias, albums, musicas (com letras e URLs de audio)
 * Salva no SQLite. URLs de midia apontam pro upstream (streaming direto).
 *
 * Uso: npx tsx scripts/import-upstream.ts
 * Env: UPSTREAM_API (default: https://api.louvorja.com.br)
 *      DB_PATH (default: ./data/catalog.db)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";

const UPSTREAM = process.env.UPSTREAM_API ?? "https://api.louvorja.com.br";
const DB_PATH = process.env.DB_PATH ?? "./data/catalog.db";

// Criar diretorio do DB se nao existir
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Rodar migrations
const migrationsDir = join(process.cwd(), "src", "db", "migrations");
if (existsSync(migrationsDir)) {
  const files = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    db.exec(readFileSync(join(migrationsDir, file), "utf-8"));
  }
  console.log(`${files.length} migrations aplicadas`);
}

// ==============================================
// Helpers
// ==============================================

async function fetchJson(path: string): Promise<any> {
  const url = `${UPSTREAM}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  FAIL ${res.status}: ${url}`);
    return null;
  }
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Garantir que linguagens existem
function ensureLanguages() {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO languages (id_language, name) VALUES (?, ?)",
  );
  insert.run("pt", "Portugues");
  insert.run("en", "English");
  insert.run("es", "Espanol");
  console.log("Linguagens garantidas: pt, en, es");
}

// ==============================================
// 1. CATEGORIAS + ALBUMS
// ==============================================

async function importCategoriesWithAlbums(lang = "pt") {
  console.log(`\n=== IMPORTANDO CATEGORIAS (${lang}) ===`);
  const data = await fetchJson(`/db/${lang}_categories`);

  if (!data?.data) {
    console.log("Sem categorias para importar");
    return { categories: 0, albums: 0 };
  }

  const insertCat = db.prepare(
    "INSERT OR REPLACE INTO categories (id_category, name, id_language) VALUES (?, ?, ?)",
  );

  const insertAlbum = db.prepare(`
    INSERT OR REPLACE INTO albums (id_album, name, id_file_image, color, id_language)
    VALUES (?, ?, NULL, ?, ?)
  `);

  const insertCatAlbum = db.prepare(
    "INSERT OR REPLACE INTO categories_albums (id_category, id_album) VALUES (?, ?)",
  );

  let catCount = 0;
  let albumCount = 0;

  for (const cat of data.data) {
    insertCat.run(cat.id_category, cat.name, lang);
    catCount++;

    if (cat.albums && Array.isArray(cat.albums)) {
      for (const album of cat.albums) {
        insertAlbum.run(
          album.id_album,
          album.name,
          album.color || "#000000",
          lang,
        );
        insertCatAlbum.run(cat.id_category, album.id_album);
        albumCount++;
      }
    }
  }

  console.log(`  ${catCount} categorias, ${albumCount} albums`);
  return { categories: catCount, albums: albumCount };
}

// ==============================================
// 2. MUSICAS (com letra + URLs de audio)
// ==============================================

async function importMusics(lang = "pt") {
  console.log(`\n=== IMPORTANDO MUSICAS (${lang}) ===`);

  // Primeiro descobrir total de paginas
  const first = await fetchJson(`/db/${lang}_musics?page=1`);
  if (!first?.data) {
    console.log("Sem musicas para importar");
    return 0;
  }

  const lastPage = first.meta?.last_page ?? 1;
  const total = first.meta?.total ?? 0;
  console.log(`  Total: ${total} musicas em ${lastPage} paginas`);

  const insertMusic = db.prepare(`
    INSERT OR REPLACE INTO musics (id_music, name, id_file_image, id_file_music, id_file_instrumental_music, id_language)
    VALUES (?, ?, NULL, NULL, NULL, ?)
  `);

  // Inserir ou atualizar file e ligar na musica
  const _insertFile = db.prepare(`
    INSERT OR REPLACE INTO files (id_file, name, path, type, url, size)
    VALUES (?, ?, ?, ?, ?, 0)
  `);
  const _updateMusicFile = db.prepare(`
    UPDATE musics SET id_file_image = ?, id_file_music = ?, id_file_instrumental_music = ? WHERE id_music = ?
  `);

  // Inserir albums_musics
  const insertAlbumMusic = db.prepare(
    "INSERT OR IGNORE INTO albums_musics (id_album, id_music) VALUES (?, ?)",
  );

  // Garantir que qualquer album referenciado exista (evita FK error)
  const ensureAlbum = db.prepare(
    "INSERT OR IGNORE INTO albums (id_album, name, id_file_image, color, id_language) VALUES (?, ?, NULL, ?, ?)",
  );

  let count = 0;

  for (let page = 1; page <= lastPage; page++) {
    const pageData =
      page === 1 ? first : await fetchJson(`/db/${lang}_musics?page=${page}`);
    if (!pageData?.data) continue;

    for (const music of pageData.data) {
      // Inserir musica basica
      insertMusic.run(music.id_music, music.name, lang);

      // Processar albums da musica
      if (music.albums && Array.isArray(music.albums)) {
        for (const alb of music.albums) {
          const albumId = typeof alb === "number" ? alb : alb.id_album;
          const albumName =
            typeof alb === "object"
              ? (alb.name ?? `Album ${albumId}`)
              : `Album ${albumId}`;
          if (albumId) {
            ensureAlbum.run(albumId, albumName, "#000000", lang);
            insertAlbumMusic.run(albumId, music.id_music);
          }
        }
      }

      // Inserir letra como texto completo
      if (music.lyric) {
        db.prepare(`
          INSERT INTO lyrics (id_music, lyric, aux_lyric, id_file_image, time, instrumental_time, show_slide, "order", id_language)
          VALUES (?, ?, NULL, NULL, ?, ?, 1, 1, ?)
        `).run(
          music.id_music,
          music.lyric,
          music.duration || "00:00:00",
          music.has_instrumental_music ? "00:00:00" : "00:00:00",
          lang,
        );
      }
    }

    count += pageData.data.length;
    process.stdout.write(`\r  Pagina ${page}/${lastPage} - ${count} musicas`);
    await sleep(100); // nao saturar a API
  }

  console.log("");
  return count;
}

// ==============================================
// 3. DETALHES DE CADA MUSICA (audio URLs)
// ==============================================

async function importMusicDetails(lang = "pt") {
  console.log(`\n=== IMPORTANDO DETALHES DE MUSICAS (audio, imagem) ===`);

  // Buscar todas as musicas que ainda nao tem file_music
  const musics = db
    .prepare(`
    SELECT id_music FROM musics WHERE id_language = ? AND id_file_music IS NULL
  `)
    .all(lang) as { id_music: number }[];

  console.log(`  ${musics.length} musicas precisam de detalhes`);

  const insertFile = db.prepare(`
    INSERT INTO files (name, path, type, url, size)
    VALUES (?, ?, ?, ?, 0)
  `);
  const updateMusicFiles = db.prepare(`
    UPDATE musics SET id_file_image = ?, id_file_music = ?, id_file_instrumental_music = ? WHERE id_music = ?
  `);

  let count = 0;
  let fails = 0;

  for (const m of musics) {
    const detail = await fetchJson(`/db/music_${m.id_music}`);

    if (!detail?.data) {
      fails++;
      continue;
    }

    const d = detail.data;
    let imageFileId: number | null = null;
    let musicFileId: number | null = null;
    let instrumentalFileId: number | null = null;

    // URL da imagem
    if (d.url_image) {
      const result = insertFile.run(
        d.url_image.split("/").pop() || "image",
        d.url_image,
        "image",
        `${UPSTREAM}${d.url_image}`,
      );
      imageFileId = Number(result.lastInsertRowid);
    }

    // URL do audio cantado
    if (d.url_music) {
      const result = insertFile.run(
        d.url_music.split("/").pop() || "audio",
        d.url_music,
        "audio",
        `${UPSTREAM}${d.url_music}`,
      );
      musicFileId = Number(result.lastInsertRowid);
    }

    // URL do audio instrumental
    if (d.url_instrumental_music) {
      const result = insertFile.run(
        d.url_instrumental_music.split("/").pop() || "audio",
        d.url_instrumental_music,
        "audio",
        `${UPSTREAM}${d.url_instrumental_music}`,
      );
      instrumentalFileId = Number(result.lastInsertRowid);
    }

    updateMusicFiles.run(
      imageFileId,
      musicFileId,
      instrumentalFileId,
      m.id_music,
    );

    count++;
    if (count % 50 === 0) {
      process.stdout.write(
        `\r  ${count}/${musics.length} processadas (${fails} falhas)`,
      );
    }

    // Atualizar letra detalhada se tiver array de lyrics
    if (d.lyric && Array.isArray(d.lyric) && d.lyric.length > 0) {
      // Limpar letras antigas e inserir as detalhadas
      db.prepare("DELETE FROM lyrics WHERE id_music = ?").run(m.id_music);

      const insertDetailedLyric = db.prepare(`
        INSERT INTO lyrics (id_music, lyric, aux_lyric, id_file_image, time, instrumental_time, show_slide, "order", id_language)
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)
      `);

      for (const lyric of d.lyric) {
        insertDetailedLyric.run(
          m.id_music,
          lyric.lyric || "",
          lyric.aux_lyric || null,
          lyric.time || "00:00:00",
          lyric.instrumental_time || "00:00:00",
          lyric.show_slide !== false ? 1 : 0,
          lyric.order ?? 0,
          lang,
        );
      }
    }

    await sleep(50); // nao saturar
  }

  console.log(`\r  ${count}/${musics.length} processadas (${fails} falhas)`);
  return count;
}

// ==============================================
// 4. BIBLIA (opcional - pesado)
// ==============================================

async function importBible() {
  console.log("\n=== IMPORTANDO BIBLIA (PT) ===");

  // Versoes
  const versions = await fetchJson("/db/pt_bible_version");
  if (!versions?.data) {
    console.log("Sem versoes biblicas");
    return;
  }

  const insertVersion = db.prepare(
    "INSERT OR IGNORE INTO bible_versions (id_version, name, language) VALUES (?, ?, ?)",
  );
  for (const v of versions.data) {
    insertVersion.run(String(v.id_version || v.id), v.name || "unknown", "pt");
  }
  console.log(`  ${versions.data.length} versoes`);

  // Livros
  const books = await fetchJson("/db/pt_bible_book");
  if (!books?.data) {
    console.log("Sem livros biblicos");
    return;
  }

  const insertBook = db.prepare(
    "INSERT OR IGNORE INTO bible_books (id_book, name, abbreviation, chapters, book_number, id_language) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const b of books.data) {
    const id = b.id_bible_book || b.id_book || b.id;
    insertBook.run(
      id,
      b.name || "",
      b.abbreviation || b.abbrev || "",
      b.chapters || 0,
      b.book_number || id,
      "pt",
    );
  }
  console.log(`  ${books.data.length} livros`);
  console.log("  (versiculos importados sob demanda via lazy proxy)");
}

// ==============================================
// MAIN
// ==============================================

async function main() {
  const startTime = Date.now();
  console.log("=========================================");
  console.log("IMPORTACAO DO CATALOGO louvorja.com.br");
  console.log(`Upstream: ${UPSTREAM}`);
  console.log(`DB: ${DB_PATH}`);
  console.log("=========================================");

  ensureLanguages();

  // 1. Categorias + Albums
  await importCategoriesWithAlbums("pt");

  // 2. Musicas (basico)
  await importMusics("pt");

  // 3. Detalhes de cada musica (audio, imagem, letra detalhada)
  await importMusicDetails("pt");

  // 4. Biblia (opcional)
  await importBible();

  // Stats finais
  const stats = {
    categories: db.prepare("SELECT count(*) as c FROM categories").get() as any,
    albums: db.prepare("SELECT count(*) as c FROM albums").get() as any,
    musics: db.prepare("SELECT count(*) as c FROM musics").get() as any,
    lyrics: db.prepare("SELECT count(*) as c FROM lyrics").get() as any,
    files: db.prepare("SELECT count(*) as c FROM files").get() as any,
    albums_musics: db
      .prepare("SELECT count(*) as c FROM albums_musics")
      .get() as any,
    bible_books: db
      .prepare("SELECT count(*) as c FROM bible_books")
      .get() as any,
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n=========================================");
  console.log("IMPORTACAO CONCLUIDA");
  console.log(`Tempo: ${elapsed}s`);
  console.log(`Categorias: ${stats.categories.c}`);
  console.log(`Albums: ${stats.albums.c}`);
  console.log(`Musicas: ${stats.musics.c}`);
  console.log(`Letras: ${stats.lyrics.c}`);
  console.log(`Arquivos (URLs): ${stats.files.c}`);
  console.log(`Albums-Musicas: ${stats.albums_musics.c}`);
  console.log(`Livros Biblicos: ${stats.bible_books.c}`);

  const pageSize = db.pragma("page_size", { simple: true }) as number;
  const pageCount = db.pragma("page_count", { simple: true }) as number;
  const sizeMB = ((pageSize * pageCount) / 1024 / 1024).toFixed(1);
  console.log(`SQLite: ${sizeMB} MB`);
  console.log("=========================================");

  db.close();
}

main().catch((err) => {
  console.error("ERRO FATAL:", err);
  db.close();
  process.exit(1);
});
