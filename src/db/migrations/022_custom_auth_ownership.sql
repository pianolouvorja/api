-- 022_custom_auth_ownership.sql
-- Adiciona owner_id nas tabelas custom + índices.
-- owner_id NULL = coletânea legado (pública, sem dono).

-- custom_collections
ALTER TABLE custom_collections ADD COLUMN owner_id INTEGER REFERENCES custom_users(id_user);

CREATE INDEX IF NOT EXISTS idx_custom_collections_owner_id ON custom_collections(owner_id);

-- custom_musics
ALTER TABLE custom_musics ADD COLUMN owner_id INTEGER REFERENCES custom_users(id_user);

CREATE INDEX IF NOT EXISTS idx_custom_musics_owner_id ON custom_musics(owner_id);

-- custom_lyrics (herda via custom_musics, não precisa de owner_id direto)

-- custom_sessions: já tem id_user FK