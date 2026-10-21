# Point de reprise — FINCA MARIA V1 opérationnelle

Date : 25/05/2026

## Objectif

Rendre FINCA MARIA utilisable cette semaine comme outil de terrain familial : questions, anomalies, relances, preuves, alertes, statuts et exports.

## État validé

Le dépôt local attendu est :

```bash
cd ~/DEV/AZOTH_STUDIO
pwd
git status
```

GitHub SSH fonctionne. Le dépôt est sur `main`.

## Briques créées

### Questions / tâches

Fichier : `app/src/data/cortijo.js`

Objectif : suivre les questions ouvertes, les responsables, les preuves attendues et les relances.

### Anomalies

Fichier : `app/src/data/cortijo.js`

Objectif : faire remonter les points suspects : ticket isolé, production basse, facture sans preuve.

### Relances

Fichier : `app/src/data/cortijo.js`

Rythme : J+1, J+2, J+3, pause J+4, J+5, J+6, J+7.

### Dashboard Cortijo

Fichier : `app/src/components/CortijoDashboard.jsx`

Objectif : afficher questions, anomalies, relances et permettre une saisie locale.

Attention : ce fichier doit être testé localement après chaque modification.

### Sauvegarde locale

Dans `CortijoDashboard.jsx`, les questions et anomalies sont sauvegardées dans le navigateur avec `localStorage`.

Objectif : fermer puis rouvrir l’outil sans perdre les saisies.

### Coffre de preuves

Fichiers :

- `app/src/data/cortijo-proofs.js`
- `app/src/components/CortijoProofVault.jsx`

Objectif : préparer l’import local de preuves : photo, PDF, facture, vidéo, capture, message coop.

À intégrer proprement dans le dashboard après test PC.

### Liaisons question / anomalie / preuve

Fichier : `app/src/data/cortijo-links.js`

Objectif : relier une question, une anomalie et une preuve pour faire émerger les incohérences.

### Alertes ouvertes

Fichier : `app/src/data/cortijo-alerts.js`

Objectif : signaler les preuves manquantes, preuves non reliées et anomalies ouvertes.

### Export

Fichier : `app/src/utils/cortijo-export.js`

Objectif : générer un export texte V1 du dossier Cortijo : questions, anomalies, preuves, alertes.

### Statuts

Fichier : `app/src/data/cortijo-statuses.js`

Objectif : préparer les workflows de suivi : questions, anomalies, preuves.

## Ce qui est prêt mais pas encore pleinement intégré

- Coffre de preuves dans le dashboard
- Statuts interactifs dans les cartes
- Export déclenchable depuis l’interface
- Vue unique “À traiter aujourd’hui”

## Règle de reprise

Ne pas reconstruire toute l’application.
Ajouter une brique, tester, puis continuer.

## Ordre recommandé ce soir sur le PC

```bash
cd ~/DEV/AZOTH_STUDIO
pwd
git status
git pull

cd app
pwd
npm install
npm run dev
```

Puis ouvrir l’adresse affichée par Vite.

Vérifier :

1. l’application démarre ;
2. la carte Cortijo est visible ;
3. le dashboard Cortijo s’affiche ;
4. les questions et anomalies sont visibles ;
5. une question ajoutée reste présente après fermeture/réouverture ;
6. aucun écran blanc.

## Cap suivant

Priorité : intégration, pas nouvelles briques.

Ordre :

1. brancher le coffre de preuves ;
2. rendre les statuts modifiables ;
3. brancher l’export ;
4. créer la vue “À traiter aujourd’hui”.
