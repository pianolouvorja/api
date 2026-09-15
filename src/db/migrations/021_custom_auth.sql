-- 021_custom_auth.sql
-- Login simples de coletâneas custom: usuários + sessões por token opaco.
CREATE TABLE IF NOT EXISTS custom_users (
  id_user INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- pbkdf2$iter$salt$hash
  display_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_sessions (
  token_hash TEXT PRIMARY KEY,        -- sha256(token); token puro nunca é persistido
  id_user INTEGER NOT NULL REFERENCES custom_users(id_user) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Retrocompatível: coleções pré-auth ficam owner_id NULL (= editáveis por qualquer um)
ALTER TABLE custom_collections ADD COLUMN owner_id INTEGER REFERENCES custom_users(id_user);
ALTER TABLE custom_collections ADD COLUMN author_name TEXT;
