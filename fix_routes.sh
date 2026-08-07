#!/bin/bash
# Corrige musics
sed -i 's/const db = getDb(lang);/const db = getDb();/' src/v1/musics/musics.routes.ts
sed -i 's/const { count } = db.prepare(`SELECT COUNT(\*) as count FROM musics`).get() as { count: number };/const { count } = db.prepare(`SELECT COUNT(\*) as count FROM musics WHERE id_language = ?`).get(lang) as { count: number };/' src/v1/musics/musics.routes.ts
sed -i 's/const musics = db.prepare(`SELECT \* FROM musics LIMIT ? OFFSET ?`).all(perPage, offset) as any\[\];/const musics = db.prepare(`SELECT \* FROM musics WHERE id_language = ? LIMIT ? OFFSET ?`).all(lang, perPage, offset) as any\[\];/' src/v1/musics/musics.routes.ts

sed -i 's/params: z.object({/param: z.object({/' src/v1/musics/musics.routes.ts
sed -i 's/c.req.valid("params")/c.req.valid("param")/' src/v1/musics/musics.routes.ts
sed -i 's/WHERE id_music = ?/WHERE id_music = ? AND id_language = ?/' src/v1/musics/musics.routes.ts
sed -i 's/\.get(parseInt(id, 10))/.get(parseInt(id, 10), lang)/' src/v1/musics/musics.routes.ts

# Corrige albums
sed -i 's/const db = getDb(lang);/const db = getDb();/' src/v1/albums/albums.routes.ts
sed -i 's/const { count } = db.prepare(`SELECT COUNT(\*) as count FROM albums`).get() as { count: number };/const { count } = db.prepare(`SELECT COUNT(\*) as count FROM albums WHERE id_language = ?`).get(lang) as { count: number };/' src/v1/albums/albums.routes.ts
sed -i 's/const albums = db.prepare(`SELECT \* FROM albums LIMIT ? OFFSET ?`).all(perPage, offset) as any\[\];/const albums = db.prepare(`SELECT \* FROM albums WHERE id_language = ? LIMIT ? OFFSET ?`).all(lang, perPage, offset) as any\[\];/' src/v1/albums/albums.routes.ts

sed -i 's/params: z.object({/param: z.object({/' src/v1/albums/albums.routes.ts
sed -i 's/c.req.valid("params")/c.req.valid("param")/' src/v1/albums/albums.routes.ts
sed -i 's/WHERE id_album = ?`/WHERE id_album = ? AND id_language = ?`/' src/v1/albums/albums.routes.ts
sed -i 's/\.get(parseInt(id, 10))/.get(parseInt(id, 10), lang)/' src/v1/albums/albums.routes.ts

# Corrige categories
sed -i 's/const db = getDb(lang);/const db = getDb();/' src/v1/categories/categories.routes.ts
sed -i 's/SELECT \* FROM categories`/SELECT \* FROM categories WHERE id_language = ?`/' src/v1/categories/categories.routes.ts
sed -i 's/\.all() as any\[\];/\.all(lang) as any\[\];/' src/v1/categories/categories.routes.ts

sed -i 's/params: z.object({/param: z.object({/' src/v1/categories/categories.routes.ts
sed -i 's/c.req.valid("params")/c.req.valid("param")/' src/v1/categories/categories.routes.ts
sed -i 's/WHERE id_category = ?`/WHERE id_category = ? AND id_language = ?`/' src/v1/categories/categories.routes.ts
sed -i 's/\.get(parseInt(id, 10))/.get(parseInt(id, 10), lang)/' src/v1/categories/categories.routes.ts

# Corrige bible
sed -i 's/const db = getDb(lang);/const db = getDb();/' src/v1/bible/bible.routes.ts
sed -i 's/SELECT \* FROM bible_books`/SELECT \* FROM bible_books WHERE id_language = ?`/' src/v1/bible/bible.routes.ts
sed -i 's/\.all() as any\[\];/\.all(lang) as any\[\];/' src/v1/bible/bible.routes.ts

sed -i 's/params: z.object({/param: z.object({/' src/v1/bible/bible.routes.ts
sed -i 's/c.req.valid("params")/c.req.valid("param")/' src/v1/bible/bible.routes.ts
sed -i 's/WHERE id_bible_book = ?/WHERE id_bible_book = ? AND id_language = ?/' src/v1/bible/bible.routes.ts
sed -i 's/\.get(parsedBookId, parsedChapter)/\.get(parsedBookId, lang, parsedChapter)/' src/v1/bible/bible.routes.ts
