#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "=== Installation des outils système gratuits ==="
sudo apt update
sudo apt install -y ffmpeg python3-pip python3-venv python3.12-venv

echo ""
echo "=== Création environnement Python local ==="
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate

echo ""
echo "=== Installation Whisper local gratuit ==="
python -m pip install -U pip setuptools wheel
python -m pip install -U openai-whisper

echo ""
echo "=== Vérification ==="
whisper --help | head -10
