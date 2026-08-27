#!/usr/bin/env bash
# Mirror do conteudo ES/EN: hinario ES (620 musicas), pt_hymnal_1996 (confirmar),
# e EN via /json_db/music_<id> quando existir.
# Salva em data/bible_cache-like: data/lang_cache/ para JSONs e media/ para mp3.
set -u
API="https://api.louvorja.com.br"
BASE="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$BASE/data/json_db_cache"
mkdir -p "$CACHE"

fetch() { # fetch <arquivo> — baixa /json_db/<arquivo> se nao existir
  local f="$1" out="$CACHE/$1.json"
  [ -s "$out" ] && { echo "skip $f"; return 0; }
  local code
  code=$(curl -s -w "%{http_code}" -o "$out.tmp" "$API/json_db/$f")
  if [ "$code" = "200" ] && [ -s "$out.tmp" ]; then mv "$out.tmp" "$out"; echo "ok $f"
  else rm -f "$out.tmp"; echo "404 $f"; return 1; fi
}

# 1. Catalogos por lingua
for f in es_categories es_musics es_hymnal es_hymnal_1996 \
         en_categories en_musics en_hymnal en_hymnal_1996 \
         pt_hymnal pt_hymnal_1996; do fetch "$f"; done

# 2. Detalhe por musica (paths de mp3/capa): music_<id> para todos os ids ES/EN
ids=$(python3 - "$CACHE" <<'EOF'
import json,glob,os
ids=set()
for f in glob.glob(os.path.join(sys.argv[1] if False else "", "")): pass
EOF
)
# (simples: extrair via python abaixo)
python3 - "$CACHE" <<'EOF' > /tmp/lang_music_ids.txt
import json, sys, glob, os
cache = sys.argv[1]
ids = set()
for f in ["es_musics.json","en_musics.json"]:
    p = os.path.join(cache, f)
    if os.path.exists(p):
        for m in json.load(open(p)): ids.add(m["id_music"])
print("\n".join(str(i) for i in sorted(ids)))
EOF

total=$(wc -l < /tmp/lang_music_ids.txt)
echo "=== Detalhe: $total musicas es/en ==="
i=0
while read -r id; do
  i=$((i+1))
  fetch "music_$id" || true
  [ $((i % 100)) -eq 0 ] && echo "  $i/$total"
  sleep 0.8
done < /tmp/lang_music_ids.txt

# 3. Baixar mp3s/capas referenciados em media/
echo "=== Midias es/en ==="
python3 - "$CACHE" "$BASE/media" <<'EOF' > /tmp/lang_media_paths.txt
import json, sys, glob, os
cache, _ = sys.argv[1], sys.argv[2]
paths = set()
for p in glob.glob(os.path.join(cache, "music_*.json")):
    d = json.load(open(p))
    for k in ("url_music","url_instrumental_music","url_image"):
        v = d.get(k)
        if v: paths.add(v)
print("\n".join(sorted(paths)))
EOF
mtotal=$(wc -l < /tmp/lang_media_paths.txt)
echo "$mtotal arquivos de midia"
i=0
while IFS= read -r path; do
  i=$((i+1))
  dest="$BASE/media${path//\///}"
  dest="$BASE/media/$path"
  [ -s "$dest" ] && continue
  mkdir -p "$(dirname "$dest")"
  code=$(curl -s --retry 3 -w "%{http_code}" -o "$dest.tmp" "$API/file$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe='/'))" "$path")")
  if [ "$code" = "200" ] && [ -s "$dest.tmp" ]; then mv "$dest.tmp" "$dest"
  else rm -f "$dest.tmp"; echo "FAIL $code $path"; fi
  [ $((i % 50)) -eq 0 ] && echo "  $i/$mtotal"
  sleep 0.8
done < /tmp/lang_media_paths.txt
echo "=== Concluido ==="
