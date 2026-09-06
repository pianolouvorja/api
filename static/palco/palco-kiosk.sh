#!/usr/bin/env bash
# Abre N receivers Palco em fullscreen real, sem popup e sem Electron.
# Cada instância usa perfil Chrome isolado; por isso múltiplas telas coexistem.
# X11/Windows/macOS: --window-position direciona a tela. Wayland pode ignorar bounds.
set -euo pipefail

URL=''
SCREENS=()
DRY_RUN=false
# Browser-agnostic: CHROME_BIN ainda vence (compat), senão Edge > Chromium >
# Chrome > Brave > Firefox. Firefox: -kiosk sem --app; bounds podem falhar.
CHROME="${CHROME_BIN:-}"
if [[ -z "$CHROME" ]]; then
  for b in microsoft-edge microsoft-edge-stable microsoft-edge-beta \
           chromium chromium-browser google-chrome google-chrome-stable brave-browser firefox; do
    command -v "$b" >/dev/null 2>&1 && { CHROME="$b"; break; }
  done
fi
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
command -v "$CHROME" >/dev/null || { echo "Erro: nenhum browser suportado encontrado (Edge/Chromium/Chrome/Brave/Firefox): $CHROME" >&2; exit 127; }
# Firefox: -kiosk aceita URL direta (sem --app) e ignora --user-data-dir inline;
# bounds por monitor podem não ser respeitados — aviso ao usuário.
IS_FIREFOX=false
[[ "$CHROME" == *firefox* ]] && IS_FIREFOX=true
mkdir -p "$STATE_DIR"

for i in "${!SCREENS[@]}"; do
  IFS=, read -r x y width height <<<"${SCREENS[$i]}"
  [[ $x =~ ^-?[0-9]+$ && $y =~ ^-?[0-9]+$ && $width =~ ^[0-9]+$ && $height =~ ^[0-9]+$ ]] || {
    echo "Erro: screen inválida: ${SCREENS[$i]} (esperado X,Y,LARGURA,ALTURA)" >&2; exit 2;
  }
  # Slot N+1 por tela: cada monitor é um receiver lógico distinto (conteúdo
  # independente por módulo no operador). Tela 1 = slot 1, tela 2 = slot 2…
  screenUrl=$(sed -E "s/([?&])slot=[0-9]+/\\1slot=__TMP__/" <<<"$URL")
  if grep -q 'slot=' <<<"$screenUrl"; then screenUrl=${screenUrl/__TMP__/$((i+1))}
  else screenUrl="$URL$(grep -q '?' <<<"$URL" && echo '&' || echo '?')slot=$((i+1))"; fi
  if $IS_FIREFOX; then
    cmd=("$CHROME" -kiosk "$screenUrl" --window-position="$x,$y" --window-size="$width,$height" --no-remote -CreateProfile "palco-kiosk-$((i+1))")
    $DRY_RUN || $IS_FIREFOX && echo "Aviso: Firefox pode ignorar o posicionamento por monitor — confira as janelas." >&2
  else
    cmd=("$CHROME" --kiosk --app="$screenUrl" --user-data-dir="$STATE_DIR/screen-$((i+1))" --window-position="$x,$y" --window-size="$width,$height" --no-first-run --disable-session-crashed-bubble)
  fi
  printf 'Tela %d (slot %d): ' "$((i+1))" "$((i+1))"; printf '%q ' "${cmd[@]}"; printf '\n'
  "$DRY_RUN" || "${cmd[@]}" >/dev/null 2>&1 &
done

$DRY_RUN || echo "Palco iniciado: ${#SCREENS[@]} tela(s) em kiosk. Para encerrar: pkill -f '$STATE_DIR'"
