#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage : ./transcrire-audio.sh /chemin/vers/audio.mp3"
  echo ""
  echo "Exemple :"
  echo './transcrire-audio.sh "$HOME/Téléchargements/mon-audio.mp3"'
  exit 1
fi

AUDIO="$1"

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Erreur : environnement .venv introuvable."
  echo "Il faut d'abord installer Whisper local."
  exit 1
fi

source .venv/bin/activate
mkdir -p sorties

echo "=== Audio à transcrire ==="
echo "$AUDIO"

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
