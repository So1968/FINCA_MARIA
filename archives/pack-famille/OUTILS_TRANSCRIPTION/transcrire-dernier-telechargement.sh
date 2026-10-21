#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Erreur : environnement .venv introuvable."
  echo "Il faut d'abord installer Whisper local."
  exit 1
fi

source .venv/bin/activate
mkdir -p sorties

echo "=== Recherche du dernier audio/vidéo téléchargé ==="

AUDIO="$(
  find "$HOME/Téléchargements" "$HOME/Downloads" -maxdepth 1 -type f \( \
    -iname '*.mp3' -o \
    -iname '*.m4a' -o \
    -iname '*.wav' -o \
    -iname '*.ogg' -o \
    -iname '*.flac' -o \
    -iname '*.webm' -o \
    -iname '*.mp4' \
  \) -printf '%T@ %p\n' 2>/dev/null \
  | sort -nr \
  | head -1 \
  | cut -d' ' -f2-
)"

if [ -z "$AUDIO" ]; then
  echo "Aucun fichier audio/vidéo trouvé dans Téléchargements ou Downloads."
  exit 1
fi

echo "Audio trouvé : $AUDIO"
echo ""
echo "=== Transcription locale gratuite avec Whisper ==="

whisper "$AUDIO" \
  --model small \
  --language French \
  --output_format txt \
  --output_dir sorties

echo ""
echo "=== Dernière transcription générée ==="
DERNIER="$(ls -t sorties/*.txt | head -1)"
echo "$DERNIER"
echo ""
cat "$DERNIER"
