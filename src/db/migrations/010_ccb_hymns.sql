CREATE TABLE IF NOT EXISTS ccb_hymns (
  id_hymn INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  lyric TEXT,
  id_language TEXT DEFAULT 'pt',
  audio_url TEXT,
  public_domain INTEGER DEFAULT 0,
  FOREIGN KEY (id_language) REFERENCES languages(id_language)
);
