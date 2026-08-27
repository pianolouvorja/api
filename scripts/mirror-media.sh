#!/usr/bin/env bash
# Mirror das midias da api.louvorja.com.br para media/
# Baixa todos os arquivos (audio+imagens) referenciados no catalogo SQLite.
# Idempotente: pula arquivos ja existentes. Resume seguro.
set -euo pipefail

BASE="${BACKUP_DIR:-$HOME/piano-api}"
API="${UPSTREAM_API:-https://api.louvorja.com.br}"
DB="${DB_PATH:-$BASE/data/catalog.db}"
MEDIA="$BASE/media"
STATE="$BASE/backups/.mirror_state"

mkdir -p "$MEDIA" "$(dirname "$STATE")"

# Lista todas as URLs distintas (audio + imagem) do catalogo
URLS=$(sqlite3 "$DB" "SELECT DISTINCT url FROM files WHERE url IS NOT NULL AND url != '';")
TOTAL=$(echo "$URLS" | wc -l)
ok=0; skip=0; fail=0; i=0

echo "=== Mirror: $TOTAL arquivos ==="

while IFS= read -r url; do
  i=$((i+1))
  dest="$MEDIA/${url#/}"
  if [[ -f "$dest" && ! -f "$dest.tmp" ]]; then
    skip=$((skip+1))
  else
    # Encoda apenas espacos/acentos, NAO as barras (%2F -> 404 no upstream)
    enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe='/'))" "$url")
    mkdir -p "$(dirname "$dest")"
    if curl -sf --retry 2 "$API/file/$enc" -o "$dest.tmp"; then
      mv "$dest.tmp" "$dest"
      ok=$((ok+1))
    else
      rm -f "$dest.tmp"
      fail=$((fail+1))
      echo "FAIL: $url" >> "$STATE.failures"
    fi
  fi
  if (( i % 200 == 0 )); then
    echo "  $i/$TOTAL (ok=$ok skip=$skip fail=$fail) $(du -sh "$MEDIA" | cut -f1)"
    echo "$i" > "$STATE"
  fi
done <<< "$URLS"

echo "$i" > "$STATE"
du -sh "$MEDIA"
echo "=== Concluido: ok=$ok skip=$skip fail=$fail ==="
