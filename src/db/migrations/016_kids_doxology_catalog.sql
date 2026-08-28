-- Catálogo estrutural compatível com pianolouvorja/app.
INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Português');

INSERT OR IGNORE INTO categories (id_category, name, id_language, slug, type, "order")
VALUES
  (98, 'Infantis', 'pt', 'kids', 'collection', 98),
  (99, 'Doxologia', 'pt', 'doxology', 'collection', 99);

INSERT OR IGNORE INTO albums (id_album, name, id_language)
VALUES
  (9000, 'Infantis', 'pt'),
  (9010, 'Entrada da Plataforma', 'pt'),
  (9011, 'Dízimos e Ofertas', 'pt');

INSERT OR IGNORE INTO categories_albums (id_category, id_album, name, "order", id_language)
VALUES
  (98, 9000, 'Infantis', 1, 'pt'),
  (99, 9010, 'Entrada da Plataforma', 1, 'pt'),
  (99, 9011, 'Dízimos e Ofertas', 2, 'pt');
INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Português');

