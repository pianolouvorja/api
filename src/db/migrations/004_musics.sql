CREATE TABLE IF NOT EXISTS musics (
  id_music INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  id_file_image INTEGER,
  id_file_music INTEGER,
  id_file_instrumental_music INTEGER,
  id_language TEXT NOT NULL,
  FOREIGN KEY (id_language) REFERENCES languages(id_language),
  FOREIGN KEY (id_file_image) REFERENCES files(id_file),
  FOREIGN KEY (id_file_music) REFERENCES files(id_file),
  FOREIGN KEY (id_file_instrumental_music) REFERENCES files(id_file)
);
