#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SCRIPT_PATH="$PROJECT_ROOT/scripts/ouvrir-cortijo-local.sh"
APPLICATIONS_DIR="$HOME/.local/share/applications"
APPLICATIONS_TARGET="$APPLICATIONS_DIR/FINCA_MARIA.desktop"

DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
DESKTOP_DIR="${DESKTOP_DIR:-$HOME/Bureau}"
if [[ ! -d "$DESKTOP_DIR" && -d "$HOME/Desktop" ]]; then
  DESKTOP_DIR="$HOME/Desktop"
fi
mkdir -p "$DESKTOP_DIR" "$APPLICATIONS_DIR"
DESKTOP_TARGET="$DESKTOP_DIR/FINCA_MARIA.desktop"

if [[ ! -f "$SCRIPT_PATH" ]]; then
  printf 'Lanceur introuvable : %s\n' "$SCRIPT_PATH" >&2
  exit 1
fi

chmod +x "$SCRIPT_PATH"

create_shortcut() {
  local target="$1"
  cat > "$target" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Ouvrir Finca Maria
Comment=Démarrer Finca Maria en local et ouvrir le navigateur
Exec=$SCRIPT_PATH
Icon=folder-documents
Terminal=false
Categories=Office;Utility;
StartupNotify=true
EOF
  chmod +x "$target"
}

create_shortcut "$APPLICATIONS_TARGET"
create_shortcut "$DESKTOP_TARGET"

gio set "$DESKTOP_TARGET" metadata::trusted true 2>/dev/null || true
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_DIR" 2>/dev/null || true
fi

printf '\nRaccourci Finca Maria installé.\n'
printf 'Bureau : %s\n' "$DESKTOP_TARGET"
printf 'Applications : %s\n' "$APPLICATIONS_TARGET"
printf '\nDouble-clique sur « Ouvrir Finca Maria ».\n'
