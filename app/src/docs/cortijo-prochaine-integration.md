# Prochaine intégration Cortijo V1

Objectif : rendre l’outil opérationnel sans refonte.

## À brancher dans l’interface

1. Coffre de preuves
- composant existant : `app/src/components/CortijoProofVault.jsx`
- données : `app/src/data/cortijo-proofs.js`
- objectif : afficher les preuves dans le dashboard Cortijo.

2. Statuts interactifs
- données : `app/src/data/cortijo-statuses.js`
- objectif : permettre de changer le statut d’une question, d’une anomalie ou d’une preuve.

3. Export
- utilitaire existant : `app/src/utils/cortijo-export.js`
- objectif : télécharger un export texte du dossier Cortijo.

## Règle

Ne pas reconstruire toute l’application. Ajouter une brique, tester, puis continuer.
