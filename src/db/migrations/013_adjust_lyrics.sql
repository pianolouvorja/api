-- Migration 013: Ajustar lyrics para importacao do upstream
-- Remove UNIQUE(id_music, order) e permite id_lyric explicito

-- Criar nova tabela se nao existir
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

-- Copiar dados da tabela antiga se existir e tiver colunas compativeis
-- Usar try/catch no connection.ts pois pode falhar se lyrics nao existir
INSERT OR IGNORE INTO lyrics_new (id_lyric, id_music, lyric, aux_lyric, id_file_image, time, instrumental_time, show_slide, "order", id_language)
SELECT id_lyric, id_music, lyric, aux_lyric, id_file_image, time, instrumental_time, show_slide, "order", id_language FROM lyrics;

-- Dropar antiga e renomear
DROP TABLE IF EXISTS lyrics;
ALTER TABLE lyrics_new RENAME TO lyrics;

CREATE INDEX IF NOT EXISTS idx_lyrics_id_music ON lyrics(id_music);
