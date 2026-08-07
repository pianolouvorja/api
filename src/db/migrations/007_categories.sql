CREATE TABLE IF NOT EXISTS categories (
  id_category INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  id_language TEXT,
  FOREIGN KEY (id_language) REFERENCES languages(id_language)
);
