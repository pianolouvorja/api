import Database from "better-sqlite3";

const db = new Database("./data/catalog.db");
db.pragma("foreign_keys = ON");

const musics = db
  .prepare(
    "SELECT id_music FROM musics WHERE id_language = ? ORDER BY id_music",
  )
  .all("pt") as { id_music: number }[];
console.log(musics.length, "musicas precisam de detalhes");

const insertDetailedLyric = db.prepare(`
  INSERT OR REPLACE INTO lyrics (id_lyric, id_music, lyric, aux_lyric, id_file_image, time, instrumental_time, show_slide, "order", id_language)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const deleteLyrics = db.prepare("DELETE FROM lyrics WHERE id_music = ?");
const findFileByUrl = db.prepare("SELECT id_file FROM files WHERE url = ?");
const insertFile = db.prepare(
  "INSERT INTO files (name, path, type, url, size, dir, file_name, duration, image_position) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)",
);

let count = 0;
let fails = 0;
let totalLyrics = 0;

async function main() {
  for (const m of musics) {
    try {
      const res = await fetch(
        `https://api.louvorja.com.br/json_db/music_${m.id_music}`,
      );
      if (!res.ok) {
        fails++;
        continue;
      }
      const d = (await res.json()) as any;
      if (!d || d.error) {
        fails++;
        continue;
      }

      if (d.lyric && Array.isArray(d.lyric) && d.lyric.length > 0) {
        deleteLyrics.run(m.id_music);
        for (const l of d.lyric) {
          let lyricImageFileId: number | null = null;
          if (l.url_image) {
            const existing = findFileByUrl.get(l.url_image) as any;
            if (existing) {
              lyricImageFileId = existing.id_file;
            } else {
              const idx = l.url_image.lastIndexOf("/");
              const dir = idx > -1 ? l.url_image.substring(0, idx) : "/";
              const fn =
                idx > -1 ? l.url_image.substring(idx + 1) : l.url_image;
              const r = insertFile.run(
                fn,
                l.url_image,
                "image",
                l.url_image,
                dir,
                fn,
                null,
                l.image_position ?? null,
              );
              lyricImageFileId = Number(r.lastInsertRowid);
            }
          }
          insertDetailedLyric.run(
            l.id_lyric ?? null,
            m.id_music,
            l.lyric || "",
            l.aux_lyric || null,
            lyricImageFileId,
            l.time || "00:00:00",
            l.instrumental_time || "00:00:00",
            l.show_slide ? 1 : 0,
            l.order ?? 0,
            "pt",
          );
          totalLyrics++;
        }
      }

      count++;
      if (count % 100 === 0) {
        process.stdout.write(
          `\r  ${count}/${musics.length} (${totalLyrics} lyrics, ${fails} falhas)`,
        );
      }
      await new Promise((r) => setTimeout(r, 20));
    } catch (e: any) {
      fails++;
      console.error(`\nERRO music ${m.id_music}: ${e.message}`);
    }
  }

  console.log(
    `\nTotal: ${count} musicas, ${totalLyrics} lyrics, ${fails} falhas`,
  );
  const final = db.prepare("SELECT count(*) as c FROM lyrics").get() as any;
  console.log("Lyrics no banco:", final.c);
  db.close();
}

main();
