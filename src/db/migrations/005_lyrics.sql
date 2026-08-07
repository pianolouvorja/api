CREATE TABLE IF NOT EXISTS lyrics (
  id_lyric INTEGER PRIMARY KEY AUTOINCREMENT,
  id_music INTEGER NOT NULL,
  lyric TEXT NOT NULL,
  aux_lyric TEXT,
  id_file_image INTEGER,
  time TEXT DEFAULT '00:00',
  instrumental_time TEXT DEFAULT '00:00',
  show_slide INTEGER DEFAULT 1,
  "order" INTEGER DEFAULT 0,
  id_language TEXT NOT NULL,
  FOREIGN KEY (id_music) REFERENCES musics(id_music),
  FOREIGN KEY (id_language) REFERENCES languages(id_language),
  FOREIGN KEY (id_file_image) REFERENCES files(id_file),
  UNIQUE(id_music, "order")
);
