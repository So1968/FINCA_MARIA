#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env || ! -f docker-compose.local.yml ]]; then
  echo "Configuration locale introuvable : arrêt sans modification." >&2
  exit 1
fi
email="admin@finca.local"
if [[ -t 0 ]]; then
  read -r -p "Compte à récupérer [$email] : " entered
  email="${entered:-$email}"
  read -r -s -p "Nouveau mot de passe (12 caractères minimum) : " password
  printf '\n'
  read -r -s -p "Confirmer le nouveau mot de passe : " confirm
  printf '\n'
else
  echo "Cette commande doit être lancée depuis un terminal interactif." >&2
  exit 1
fi
if [[ "$password" != "$confirm" || ${#password} -lt 12 || ${#password} -gt 200 ]]; then
  echo "Mots de passe différents ou longueur invalide." >&2
  exit 1
fi
unset confirm
printf '%s\n' "$password" | sudo docker compose -f docker-compose.coolify.yml -f docker-compose.local.yml exec -T finca-api node src/recover-password.js "$email"
unset password
