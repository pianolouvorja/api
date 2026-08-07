CREATE TABLE IF NOT EXISTS albums (
  id_album INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  id_file_image INTEGER,
  color TEXT DEFAULT '#000000',
  id_language TEXT NOT NULL,
  FOREIGN KEY (id_language) REFERENCES languages(id_language),
  FOREIGN KEY (id_file_image) REFERENCES files(id_file)
);
