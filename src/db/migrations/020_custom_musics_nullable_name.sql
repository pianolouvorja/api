-- Link p/ hino oficial: name pode ser NULL (herdado da tabela musics no playback)
-- SQLite não suporta ALTER COLUMN; recria a tabela.
CREATE TABLE custom_musics_new (
  id_music INTEGER PRIMARY KEY AUTOINCREMENT,
  id_collection INTEGER NOT NULL,
  name TEXT, -- texto completo da letra (NULL quando é link p/ hino oficial)
  lyric TEXT, -- texto completo da letra
  auxiliary_lyric TEXT, -- tradução / PB
  id_file_audio INTEGER, -- áudio principal
  id_file_instrumental INTEGER, -- instrumental
  id_file_image INTEGER, -- imagem de fundo
  duration INTEGER, -- duração em segundos
  official_music_id INTEGER, -- link p/ hino oficial (tabela musics)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_collection) REFERENCES custom_collections(id_collection) ON DELETE CASCADE,
  FOREIGN KEY (id_file_audio) REFERENCES files(id_file),
  FOREIGN KEY (id_file_instrumental) REFERENCES files(id_file),
  FOREIGN KEY (id_file_image) REFERENCES files(id_file)
);
INSERT INTO custom_musics_new
  (id_music, id_collection, name, lyric, auxiliary_lyric, id_file_audio, id_file_instrumental, id_file_image, duration, official_music_id, created_at, updated_at)
SELECT id_music, id_collection, name, lyric, auxiliary_lyric, id_file_audio, id_file_instrumental, id_file_image, duration, official_music_id, created_at, updated_at
FROM custom_musics;
DROP TABLE custom_musics;
ALTER TABLE custom_musics_new RENAME TO custom_musics;
CREATE INDEX idx_custom_musics_collection ON custom_musics(id_collection);
CREATE INDEX idx_custom_musics_official ON custom_musics(official_music_id);
