#!/usr/bin/env bash
set -euo pipefail

BAUL_ROOT="${CORTIJO_BAUL_DIR:-$HOME/Documents/FINCA_MARIA/BAUL_PRIVE}"
DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
DESKTOP_DIR="${DESKTOP_DIR:-$HOME/Bureau}"
APPLICATIONS_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/BAUL_FINCA_MARIA.desktop"
APPLICATION_FILE="$APPLICATIONS_DIR/BAUL_FINCA_MARIA.desktop"

CATEGORIES=(
  "01_FACTURES"
  "02_AGRI_SAN_JUAN"
  "03_PAC_SUBVENTIONS"
  "04_PELAEZ"
  "05_PHOTOS_VIDEOS_TERRAIN"
  "06_CASA_MAISON_LOCATION"
  "07_REUNIONS_DECISIONS"
  "08_WHATSAPP_MAILS_CAPTURE"
  "09_CADASTRE_SIGPAC_PLANS"
  "10_A_VERIFIER_URGENT"
)

mkdir -p "$BAUL_ROOT/00_A_CLASSER/00_RECEPTION_A_VALIDER"
mkdir -p "$BAUL_ROOT/01_CLASSES_VALIDES"
mkdir -p "$BAUL_ROOT/02_EXPORTS_PREPARES"
mkdir -p "$BAUL_ROOT/99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB"

for category in "${CATEGORIES[@]}"; do
  mkdir -p "$BAUL_ROOT/01_CLASSES_VALIDES/$category"
done

cat > "$BAUL_ROOT/A_LIRE_BAUL_FINCA_MARIA.txt" <<EOF
BAÚL PRIVÉ — FINCA MARIA

Ce dossier contient les documents réels du projet Finca Maria.
Il reste local sur cet ordinateur et ne doit pas être envoyé sur GitHub.

CHEMIN PRINCIPAL
$BAUL_ROOT

ORGANISATION
00_A_CLASSER/00_RECEPTION_A_VALIDER
  Documents reçus par le logiciel en attente de validation.

01_CLASSES_VALIDES
  Documents rangés après confirmation humaine.

02_EXPORTS_PREPARES
  Index et dossiers préparés pour une transmission.

99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB
  Originaux conservés. Ne pas supprimer.

RÈGLE
Le BAÚL peut proposer un classement, mais une personne doit le valider.
EOF

mkdir -p "$DESKTOP_DIR" "$APPLICATIONS_DIR"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Ouvrir BAÚL Finca Maria
Comment=Ouvrir le dossier local privé des preuves Finca Maria
Exec=xdg-open "$BAUL_ROOT"
Icon=folder-documents
Terminal=false
Categories=Office;FileManager;
EOF

cp "$DESKTOP_FILE" "$APPLICATION_FILE"
chmod +x "$DESKTOP_FILE" "$APPLICATION_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPLICATIONS_DIR" >/dev/null 2>&1 || true
fi

echo "BAÚL Finca Maria préparé."
echo "Dossier principal : $BAUL_ROOT"
echo "Sas à valider : $BAUL_ROOT/00_A_CLASSER/00_RECEPTION_A_VALIDER"
echo "Raccourci bureau : $DESKTOP_FILE"
echo "Raccourci applications : $APPLICATION_FILE"
