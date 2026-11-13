#!/usr/bin/env bash
# Snapshot privé uniquement. Ne modifie aucun fichier suivi, conteneur ou volume.
set -euo pipefail
umask 077
repo=$(git rev-parse --show-toplevel)
[ "$#" -eq 1 ] || { echo 'Usage : bash scripts/snapshot-meetings-installation.sh /chemin/prive/nouveau-dossier' >&2; exit 2; }
destination=$(realpath -m -- "$1")
case "$destination/" in "$repo/"*) echo 'Le snapshot doit être hors du dépôt public.' >&2; exit 2;; esac
[ ! -e "$destination" ] || { echo 'Choisissez un dossier qui n’existe pas encore.' >&2; exit 2; }
mkdir -m 700 -- "$destination"
for file in app/src/components/FincaMeetingsHub.jsx app/src/components/FincaMeetingsHub.jsx.bak-demo docker-compose.local.yml; do
  if [ -f "$repo/$file" ]; then
    mkdir -p -- "$destination/$(dirname "$file")"
    cp -p -- "$repo/$file" "$destination/$file"
    chmod 600 -- "$destination/$file"
  fi
done
git -C "$repo" status --short > "$destination/git-status.txt"
git -C "$repo" rev-parse HEAD > "$destination/installed-commit.txt"
git -C "$repo" diff --binary HEAD -- app/src/components/FincaMeetingsHub.jsx > "$destination/local-meetings.patch"
git -C "$repo" show HEAD:app/src/components/FincaMeetingsHub.jsx > "$destination/meetings-base.jsx"
echo 'Snapshot privé créé. Aucun fichier actif ni volume Docker modifié.'
