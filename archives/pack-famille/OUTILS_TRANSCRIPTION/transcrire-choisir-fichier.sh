#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Erreur : environnement .venv introuvable."
  echo "Il faut installer Whisper local dans 00_STUDIO/OUTILS_TRANSCRIPTION."
  exit 1
fi

source .venv/bin/activate
mkdir -p sorties

echo "=== Derniers fichiers audio/vidéo trouvés dans Téléchargements ==="
echo ""

mapfile -t FICHIERS < <(
  find "$HOME/Téléchargements" "$HOME/Downloads" -maxdepth 1 -type f \( \
    -iname '*.mp3' -o \
    -iname '*.m4a' -o \
    -iname '*.wav' -o \
    -iname '*.ogg' -o \
    -iname '*.flac' -o \
    -iname '*.webm' -o \
    -iname '*.mp4' \
  \) -printf '%T@|%p\n' 2>/dev/null \
  | sort -nr \
  | head -15 \
  | cut -d'|' -f2-
)

if [ "${#FICHIERS[@]}" -eq 0 ]; then
  echo "Aucun fichier audio/vidéo trouvé dans Téléchargements ou Downloads."
  exit 1
fi

for i in "${!FICHIERS[@]}"; do
  NUM=$((i+1))
  echo "$NUM) ${FICHIERS[$i]}"
done

echo ""
read -rp "Quel fichier veux-tu transcrire ? Tape le numéro : " CHOIX

if ! [[ "$CHOIX" =~ ^[0-9]+$ ]]; then
  echo "Choix invalide."
  exit 1
fi

INDEX=$((CHOIX-1))

if [ "$INDEX" -lt 0 ] || [ "$INDEX" -ge "${#FICHIERS[@]}" ]; then
  echo "Numéro hors liste."
  exit 1
fi

AUDIO="${FICHIERS[$INDEX]}"

echo ""
echo "=== Fichier choisi ==="
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
