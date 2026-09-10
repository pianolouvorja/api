-- Hinos oficiais dentro de coletâneas custom (link por official_music_id)
ALTER TABLE custom_musics ADD COLUMN official_music_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_custom_musics_official ON custom_musics(official_music_id);
