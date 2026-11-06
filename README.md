# FINCA MARIA

Application autonome de gestion de la terre, de la maison familiale et des documents.
Le code, les tests, les installations et les évolutions sont gérés ici :
https://github.com/So1968/FINCA_MARIA

AZOTH_STUDIO conserve uniquement une fiche de suivi du projet. Il ne lance ni ne construit FINCA MARIA.

## Démarrer sur le PC

Node.js 22.12 minimum, version 22 (voir `.nvmrc`). Depuis la racine du dépôt :

```bash
npm run setup
npm run dev
```

Ouvrir http://127.0.0.1:5173/ : le logiciel s'ouvre directement. Les anciens liens `?project=cortijo&drop=1` restent acceptés.
Le BAÚL local est conservé dans `~/Documents/FINCA_MARIA/BAUL_PRIVE`, ou dans le dossier indiqué par `CORTIJO_BAUL_DIR`.
Les clés de stockage du navigateur sont conservées pour retrouver les données existantes à la même adresse.
Les originaux du BAÚL et les sauvegardes personnelles restent hors Git.

## Organisation

- `app/` : interface FINCA MARIA et interface familiale isolée.
- `server/` : comptes, droits, PostgreSQL, documents et sauvegardes chiffrées.
- `dossier/` : dossier documentaire et historique métier privé.
- `scripts/` : lancement, installation et contrôles.
- `outils/historique-documentaire/` : anciens traitements documentaires, conservés comme archives techniques, sans exécution automatique.
- `archives/` : variantes antérieures et pièces uniques de l'ancien pack familial ; aucun déploiement actif.
- `docs/migration/` : audit, provenance et procédure de séparation d'AZOTH_STUDIO.

## Vérifier

```bash
npm test
npm run build
npm run check:family
```

Les contrôles complets du serveur et des sauvegardes sont dans le workflow GitHub Actions.
Le parcours Actions peut aussi être testé dans Chromium, après `npm run setup` :

```bash
cd app && npx playwright install chromium && cd ..
npm run test:actions:browser
```

Ce test utilise un BAÚL temporaire et des sessions de navigateur isolées. Il contrôle
la sauvegarde locale, les erreurs de stockage, le retour au filtre Accomplies et
l’affichage mobile/bureau. `FINCA_CHROMIUM_PATH` permet d’utiliser un Chromium déjà
installé ; `FINCA_E2E_PORT` remplace le port de test 5225 si nécessaire.

Le déploiement utilise `docker-compose.coolify.yml` : voir [la fiche Coolify](COOLIFY_HANDOFF.md).
Le transfert du code ne déplace pas automatiquement les bases de données ni les volumes du serveur existant.

## Confidentialité

Ce dépôt complet doit être privé : le dossier documentaire contient des informations familiales.
L'ancien prototype public demeure dans l'historique du dépôt, sans constituer une seconde application active.
