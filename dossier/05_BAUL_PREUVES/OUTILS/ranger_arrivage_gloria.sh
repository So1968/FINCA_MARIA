#!/usr/bin/env bash
set -euo pipefail

BASE="$HOME/DEV/AZOTH_STUDIO/02_PRODUITS/FINCA_MARIA/05_BAUL_PREUVES"
ARRIVAGE="$BASE/00_A_CLASSER/03_PHOTOS_VIDEOS/ARRIVAGE_GLORIA"
DEST="$ARRIVAGE/ORIGINAUX"
INDEX="$ARRIVAGE/INVENTAIRE_AUTO_GLORIA.md"

mkdir -p "$DEST"

echo "=== Rangement automatique des fichiers WhatsApp de Gloria ==="
echo "Destination : $DEST"
echo ""

SOURCE_DIRS=(
  "$HOME/Téléchargements"
  "$HOME/Downloads"
  "$HOME/Bureau"
  "$HOME/Desktop"
)

shopt -s nullglob

COPIES=0
DEJA_PRESENTS=0

for DIR in "${SOURCE_DIRS[@]}"; do
  if [ -d "$DIR" ]; then
    for FICHIER in "$DIR"/WhatsApp\ Image* "$DIR"/WhatsApp\ Video*; do
      if [ -f "$FICHIER" ]; then
        NOM="$(basename "$FICHIER")"
        if [ ! -e "$DEST/$NOM" ]; then
          cp -p "$FICHIER" "$DEST/$NOM"
          echo "Copié : $NOM"
          COPIES=$((COPIES + 1))
        else
          echo "Déjà présent : $NOM"
          DEJA_PRESENTS=$((DEJA_PRESENTS + 1))
        fi
      fi
    done
  fi
done

echo ""
echo "=== Création / mise à jour de l'inventaire ==="

{
  echo "# Inventaire automatique — Arrivage Gloria"
  echo ""
  echo "Cet inventaire est généré automatiquement à partir des fichiers présents dans :"
  echo ""
  echo "\`ARRIVAGE_GLORIA/ORIGINAUX\`"
  echo ""
  echo "Important : la date issue du nom WhatsApp correspond souvent à la date d'envoi ou de réception, pas forcément à la date réelle de prise de vue."
  echo ""
  echo "| Date repérée dans le nom | Type | Nom du fichier | Taille | À analyser |"
  echo "|---|---|---|---:|---|"

  find "$DEST" -maxdepth 1 -type f ! -name ".gitkeep" | sort | while read -r F; do
    NOM="$(basename "$F")"
    TAILLE="$(du -h "$F" | cut -f1)"

    if [[ "$NOM" == WhatsApp\ Image* ]]; then
      TYPE="Photo"
    elif [[ "$NOM" == WhatsApp\ Video* ]]; then
      TYPE="Vidéo"
    else
      TYPE="Fichier"
    fi

    DATE_REPEREE="$(echo "$NOM" | sed -nE 's/.*([0-9]{4}-[0-9]{2}-[0-9]{2}) at ([0-9]{2})\.([0-9]{2})\.([0-9]{2}).*/\1 \2:\3:\4/p')"

    if [ -z "$DATE_REPEREE" ]; then
      DATE_REPEREE="À confirmer"
    fi

    echo "| $DATE_REPEREE | $TYPE | $NOM | $TAILLE | Sujet visible / contexte à compléter |"
  done
} > "$INDEX"

echo ""
echo "=== Résultat ==="
echo "Nouveaux fichiers copiés : $COPIES"
echo "Déjà présents : $DEJA_PRESENTS"
echo ""
echo "Inventaire : $INDEX"
echo ""
echo "=== Fichiers dans ORIGINAUX ==="
find "$DEST" -maxdepth 1 -type f | sort
