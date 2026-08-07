-- Migration 013: Ajustar lyrics para importacao do upstream
-- Remove UNIQUE(id_music, order) e permite id_lyric explicito

-- Dropar tabela antiga se a nova ja existir (estado intermediario de runs anteriores)
DROP TABLE IF EXISTS lyrics_new;

-- Criar nova tabela sem AUTOINCREMENT e sem UNIQUE
CREATE TABLE IF NOT EXISTS lyrics_new (
  id_lyric INTEGER PRIMARY KEY,
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
  FOREIGN KEY (id_file_image) REFERENCES files(id_file)
);

-- Copiar dados se a tabela antiga existir e tiver dados
INSERT OR IGNORE INTO lyrics_new SELECT * FROM lyrics;

-- Trocar tabelas
DROP TABLE IF EXISTS lyrics;
ALTER TABLE lyrics_new RENAME TO lyrics;

CREATE INDEX IF NOT EXISTS idx_lyrics_id_music ON lyrics(id_music);
