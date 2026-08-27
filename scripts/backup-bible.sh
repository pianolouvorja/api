#!/usr/bin/env bash
# Mirror completo da Biblia: baixa todos os capitulos (todas versoes x 66 livros x capitulos)
# para data/bible_cache/ — usado pelo handler lazy-proxy como cache local.
# Idempotente: pula arquivos ja baixados. Throttle respeita rate limit (5000/h).
set -euo pipefail

BASE="${BACKUP_DIR:-$HOME/piano-api}"
API="${UPSTREAM_API:-https://api.louvorja.com.br}"
DB="${DB_PATH:-$BASE/data/catalog.db}"
CACHE="$BASE/data/bible_cache"
DELAY="${DELAY:-0.8}"   # 0.8s ~ 4500 req/h < limite 5000/h

mkdir -p "$CACHE"

# Cartesiano: versoes (todas) x livros (66, com nr de capitulos)
PAIRS=$(sqlite3 "$DB" "SELECT v.id_version, b.id_book, b.chapters FROM bible_versions v CROSS JOIN bible_books b ORDER BY v.id_version, b.book_number;")
TOTAL=$(echo "$PAIRS" | wc -l)
TOTAL_CH=$(echo "$PAIRS" | awk -F'|' '{s+=$3} END{print s}')
echo "=== Biblia: $TOTAL livros, $TOTAL_CH capitulos x versoes disponiveis ==="

ok=0; skip=0; fail=0; i=0
FAILLOG="$CACHE/.failures"; : > "$FAILLOG"

while IFS='|' read -r ver book chs; do
  for ((ch=1; ch<=chs; ch++)); do
    i=$((i+1))
    key="bible_${ver%.*}_${book}_${ch}"
    f="$CACHE/$key.json"
    if [[ -s "$f" ]]; then
      skip=$((skip+1)); continue
    fi
    if curl -sf --retry 2 "$API/json_db/$key" -o "$f.tmp"; then
      mv "$f.tmp" "$f"; ok=$((ok+1))
    else
      rm -f "$f.tmp"; fail=$((fail+1)); echo "$key" >> "$FAILLOG"
    fi
    sleep "$DELAY"
    if (( i % 500 == 0 )); then echo "  $i/$TOTAL_CH (ok=$ok skip=$skip fail=$fail) $(date +%H:%M:%S)"; fi
  done
done <<< "$PAIRS"

echo "=== Concluido: ok=$ok skip=$skip fail=$fail ==="
du -sh "$CACHE"
[[ $fail -gt 0 ]] && { echo "Falhas em $FAILLOG"; exit 1; }
exit 0
