-- Custom Collections (Minhas Coletâneas)
CREATE TABLE IF NOT EXISTS custom_collections (
  id_collection INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Custom Musics (músicas do usuário)
CREATE TABLE IF NOT EXISTS custom_musics (
  id_music INTEGER PRIMARY KEY AUTOINCREMENT,
  id_collection INTEGER NOT NULL,
  name TEXT NOT NULL,
  lyric TEXT, -- texto completo da letra
  auxiliary_lyric TEXT, -- tradução / PB
  id_file_audio INTEGER, -- áudio principal
  id_file_instrumental INTEGER, -- instrumental
  id_file_image INTEGER, -- imagem de fundo
  duration INTEGER, -- duração em segundos
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_collection) REFERENCES custom_collections(id_collection) ON DELETE CASCADE,
  FOREIGN KEY (id_file_audio) REFERENCES files(id_file),
  FOREIGN KEY (id_file_instrumental) REFERENCES files(id_file),
  FOREIGN KEY (id_file_image) REFERENCES files(id_file)
);

-- Custom Lyrics (estrofes individuais para timing)
CREATE TABLE IF NOT EXISTS custom_lyrics (
  id_lyric INTEGER PRIMARY KEY AUTOINCREMENT,
  id_music INTEGER NOT NULL,
  lyric TEXT NOT NULL,
  aux_lyric TEXT,
  id_file_image INTEGER,
  time TEXT DEFAULT '00:00',
  instrumental_time TEXT DEFAULT '00:00',
  show_slide INTEGER DEFAULT 1,
  "order" INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_music) REFERENCES custom_musics(id_music) ON DELETE CASCADE,
  FOREIGN KEY (id_file_image) REFERENCES files(id_file)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_musics_collection ON custom_musics(id_collection);
CREATE INDEX IF NOT EXISTS idx_custom_lyrics_music ON custom_lyrics(id_music);