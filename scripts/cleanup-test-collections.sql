-- cleanup-test-collections.sql (P5 / B8)
-- Remove coletâneas de teste do ambiente de PRODUÇÃO.
-- Executar MANUALMENTE no prod (sqlite3 <DB_PATH> < este arquivo) APÓS:
--   1. Backup: sqlite3 <DB_PATH> ".backup /backup/catalog-$(date +%F).db"
--   2. Conferir a lista com o SELECT abaixo e validar com o Rafael.
--
-- Coletâneas alvo (revisadas 15/09/2026): "tt", "kiki", "Person", "probe-test", "teste"
-- Seguro por nome EXATO (sem LIKE %) pra não pegar coletânea de usuário real.

-- PRÉVIA (rode antes pra ver o que será apagado):
-- SELECT id_collection, name, owner_id, created_at
--   FROM custom_collections
--  WHERE name IN ('tt','kiki','Person','probe-test','teste');

DELETE FROM custom_lyrics WHERE id_music IN (
  SELECT id_music FROM custom_musics
   WHERE id_collection IN (
     SELECT id_collection FROM custom_collections
      WHERE name IN ('tt','kiki','Person','probe-test','teste')
   )
);

DELETE FROM custom_musics
 WHERE id_collection IN (
   SELECT id_collection FROM custom_collections
    WHERE name IN ('tt','kiki','Person','probe-test','teste')
 );

DELETE FROM custom_collections
 WHERE name IN ('tt','kiki','Person','probe-test','teste');
