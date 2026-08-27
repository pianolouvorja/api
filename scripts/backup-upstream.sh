#!/usr/bin/env bash
# Backup completo da api.louvorja.com.br
# - Dump cru dos endpoints /json_db/*.json (backup fiel do upstream)
# - Rebuild do SQLite (data/catalog.db) via import-upstream.ts
# - Detecta mudanças via config.latest_updated e só re-importa se mudou (ou --force)
set -euo pipefail

API="${UPSTREAM_API:-https://api.louvorja.com.br}"
BASE="${BACKUP_DIR:-$HOME/piano-api}"
RAW="$BASE/backups/raw"
DB="$BASE/data/catalog.db"
STAMP_FILE="$BASE/backups/.last_config"
TS=$(date +%F_%H%M)

mkdir -p "$RAW"

# Endpoints de dump cru (JSON estático do upstream)
ENDPOINTS=(
  config pt_categories pt_musics pt_hymnal_1996
  es_categories es_musics
  en_categories en_musics
)

echo "=== Backup api.louvorja.com.br ($TS) ==="

# 1. Verificar mudança via config
curl -sf "$API/json_db/config" -o "$RAW/config.json"
CUR=$(grep -o '"latest_updated":"[^"]*"' "$RAW/config.json" || echo "unknown")
LAST=$(cat "$STAMP_FILE" 2>/dev/null || echo "none")

echo "upstream: $CUR"
echo "local:    $LAST"

if [[ "$CUR" == "$LAST" && "${1:-}" != "--force" ]]; then
  echo "Sem mudanças desde o último backup. Use --force para re-importar mesmo assim."
  exit 0
fi

# 2. Dump cru de todos os endpoints
for ep in "${ENDPOINTS[@]}"; do
  if curl -sf "$API/json_db/$ep" -o "$RAW/$ep.json"; then
    echo "ok: $ep ($(du -h "$RAW/$ep.json" | cut -f1))"
  else
    echo "FAIL: $ep (HTTP error)" >&2
  fi
done

# 3. Dump per-item (music_{id}) — pega IDs do dump de músicas
for lang in pt es en; do
  f="$RAW/${lang}_musics.json"
  [[ -f "$f" ]] || continue
  mkdir -p "$RAW/$lang"
  ids=$(grep -o '"id_music":[0-9]*' "$f" | cut -d: -f2)
  n=0; fails=0
  for id in $ids; do
    if curl -sf "$API/json_db/music_$id" -o "$RAW/$lang/music_$id.json"; then
      n=$((n+1))
    else
      fails=$((fails+1))
    fi
    sleep 0.8  # respeita rate limit upstream (~4500 req/h)
  done
  echo "music_$id ($lang): $n ok, $fails fails"
done

# 4. Rebuild SQLite
cd "$BASE"
DB_PATH="$DB" npx tsx scripts/import-upstream.ts | tail -20

# 5. Snapshot versionado + limpeza (mantém 4 semanas)
mkdir -p "$BASE/backups/snapshots"
cp "$DB" "$BASE/backups/snapshots/catalog_$TS.db"
ls -t "$BASE/backups/snapshots/"*.db | tail -n +5 | xargs -r rm --
echo "$CUR" > "$STAMP_FILE"
echo "=== Backup concluído: $DB ==="
