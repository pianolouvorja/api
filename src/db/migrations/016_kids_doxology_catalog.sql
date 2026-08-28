-- Catálogo estrutural compatível com pianolouvorja/app.
INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Português');

INSERT OR IGNORE INTO categories (id_category, name, id_language, slug, type, "order")
SELECT 98, 'Infantis', id_language, 'kids', 'collection', 98 FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 'Doxologia', id_language, 'doxology', 'collection', 99 FROM languages WHERE id_language = 'pt';

INSERT OR IGNORE INTO albums (id_album, name, id_language)
SELECT id_album, name, id_language FROM (
  SELECT 9000 AS id_album, 'Infantis' AS name, id_language FROM languages WHERE id_language = 'pt'
  UNION ALL SELECT 9010, 'Entrada da Plataforma', id_language FROM languages WHERE id_language = 'pt'
  UNION ALL SELECT 9011, 'Dízimos e Ofertas', id_language FROM languages WHERE id_language = 'pt'
);

INSERT OR IGNORE INTO categories_albums (id_category, id_album, name, "order", id_language)
SELECT 98, 9000, 'Infantis', 1, id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 9010, 'Entrada da Plataforma', 1, id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 9011, 'Dízimos e Ofertas', 2, id_language FROM languages WHERE id_language = 'pt';
