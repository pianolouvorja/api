#!/usr/bin/env bash
# Abre N receivers Palco em fullscreen real, sem popup e sem Electron.
# Cada instância usa perfil Chrome isolado; por isso múltiplas telas coexistem.
# X11/Windows/macOS: --window-position direciona a tela. Wayland pode ignorar bounds.
set -euo pipefail

URL=''
SCREENS=()
DRY_RUN=false
CHROME="${CHROME_BIN:-google-chrome}"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/louvorja-piano/palco-kiosk"

usage() {
  cat <<'EOF'
Uso:
  palco-kiosk.sh --url URL --screen X,Y,LARGURA,ALTURA [--screen ...]
  palco-kiosk.sh --url URL --all [--dry-run]

Exemplos:
  palco-kiosk.sh --url 'http://localhost:3100/palco/?code=ABC123' --all
  palco-kiosk.sh --url 'https://api.exemplo/palco/?code=ABC123' --screen 0,0,1920,1080 --screen 1920,0,1920,1080
EOF
}

while (($#)); do
  case "$1" in
    --url) URL=${2:?URL ausente}; shift 2 ;;
    --screen) SCREENS+=("${2:?screen ausente}"); shift 2 ;;
    --all)
      command -v xrandr >/dev/null || { echo 'Erro: --all exige xrandr; use --screen X,Y,L,A.' >&2; exit 2; }
      while read -r geometry; do
        geometry=${geometry%%/*}
        SCREENS+=("${geometry/x/,}")
      done < <(xrandr --listmonitors | awk 'NR>1 {print $3}' | sed -E 's#^[^0-9]*([0-9]+/[0-9]+)x([0-9]+/[0-9]+)\+(-?[0-9]+)\+(-?[0-9]+).*$#\3,\4,\1,\2#' | sed -E 's#([0-9]+),([0-9]+),([0-9]+)/[0-9]+,([0-9]+)/[0-9]+#\1,\2,\3,\4#')
      shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Erro: argumento desconhecido: $1" >&2; usage; exit 2 ;;
  esac
done

[[ -n "$URL" ]] || { echo 'Erro: --url é obrigatório.' >&2; usage; exit 2; }
((${#SCREENS[@]})) || { echo 'Erro: informe pelo menos uma tela.' >&2; usage; exit 2; }
command -v "$CHROME" >/dev/null || { echo "Erro: Chrome não encontrado: $CHROME" >&2; exit 127; }
mkdir -p "$STATE_DIR"

for i in "${!SCREENS[@]}"; do
  IFS=, read -r x y width height <<<"${SCREENS[$i]}"
  [[ $x =~ ^-?[0-9]+$ && $y =~ ^-?[0-9]+$ && $width =~ ^[0-9]+$ && $height =~ ^[0-9]+$ ]] || {
    echo "Erro: screen inválida: ${SCREENS[$i]} (esperado X,Y,LARGURA,ALTURA)" >&2; exit 2;
  }
  cmd=("$CHROME" --kiosk --app="$URL" --user-data-dir="$STATE_DIR/screen-$((i+1))" --window-position="$x,$y" --window-size="$width,$height" --no-first-run --disable-session-crashed-bubble)
  printf 'Tela %d: ' "$((i+1))"; printf '%q ' "${cmd[@]}"; printf '\n'
  "$DRY_RUN" || "${cmd[@]}" >/dev/null 2>&1 &
done

$DRY_RUN || echo "Palco iniciado: ${#SCREENS[@]} tela(s) em kiosk. Para encerrar: pkill -f '$STATE_DIR'"
