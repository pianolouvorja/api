-- 025_ranking_gamification.sql
-- F1..F3 do Ranking/Gamificação de Coletâneas da Comunidade (SPEC 16/09).
-- Idempotente statement-a-statement (lição api#88): IF NOT EXISTS em tudo.

-- F1: registro de usos — 1 uso por usuário×coletânea (PK composta garante 1x).
CREATE TABLE IF NOT EXISTS collection_uses (
  user_id INTEGER NOT NULL REFERENCES custom_users(id_user),
  collection_id INTEGER NOT NULL REFERENCES custom_collections(id_collection),
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, collection_id)
);

-- F2: pontos de contribuição (append-only; ranking = query agregada).
CREATE TABLE IF NOT EXISTS contrib_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES custom_users(id_user),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('publish','use_received','track_complete','cover','favorited','weekly_task','badge')),
  ref_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_points_user_created ON contrib_points(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_points_reason_ref ON contrib_points(reason, ref_id);

-- Anti-spam (SPEC §2): padrão anômalo congela pontos até moderação.
CREATE TABLE IF NOT EXISTS point_freeze (
  user_id INTEGER PRIMARY KEY REFERENCES custom_users(id_user),
  frozen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT NOT NULL
);

-- F3: badges.
CREATE TABLE IF NOT EXISTS user_badges (
  user_id INTEGER NOT NULL REFERENCES custom_users(id_user),
  badge TEXT NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge)
);
