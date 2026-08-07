-- Migration 012: Adicionar colunas faltantes para paridade com upstream MySQL
-- Referencia: app/Helpers/DataBase.php do louvorja/api

-- files: colunas faltantes
ALTER TABLE files ADD COLUMN dir TEXT;
ALTER TABLE files ADD COLUMN file_name TEXT;
ALTER TABLE files ADD COLUMN duration TEXT;
ALTER TABLE files ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE files ADD COLUMN image_position INTEGER;

-- categories: colunas faltantes
ALTER TABLE categories ADD COLUMN slug TEXT;
ALTER TABLE categories ADD COLUMN "order" INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'collection';

-- categories_albums: colunas faltantes
ALTER TABLE categories_albums ADD COLUMN name TEXT;
ALTER TABLE categories_albums ADD COLUMN "order" INTEGER DEFAULT 0;
ALTER TABLE categories_albums ADD COLUMN id_language TEXT;

-- albums_musics: colunas faltantes
ALTER TABLE albums_musics ADD COLUMN track INTEGER;
ALTER TABLE albums_musics ADD COLUMN id_language TEXT;
