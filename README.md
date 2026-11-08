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

`npm run test:meetings:browser` vérifie la validation des comptes rendus avec
une API simulée : échecs de sauvegarde et de validation, annulation de confirmation,
conservation du texte et protection contre les doubles clics. Il ne modifie aucune
réunion réelle. `FINCA_MEETINGS_E2E_PORT` remplace son port de test 5226.
Il vérifie aussi que l’actualisation de la transcription conserve les saisies
non enregistrées, qu’une sauvegarde lente ne remplace pas une saisie plus récente
et qu’une réponse tardive ne rouvre pas une réunion quittée.
Les saisies non enregistrées déclenchent aussi une confirmation avant de changer
de réunion ou d’abandonner le formulaire. La fermeture ou le rechargement de la
page active l’avertissement standard du navigateur. Enregistrer les modifications
retire cette protection ; cela ne crée pas de sauvegarde automatique des brouillons.

`npm run test:meeting-audio:browser` teste le démarrage, l’arrêt et la reprise
audio avec un microphone et une API simulés, sans utiliser votre microphone.
Une seule capture peut démarrer à la fois. Le changement de réunion est bloqué
pendant la capture ou la sauvegarde. Si la finalisation échoue, le bouton
« Reprendre la sauvegarde audio » reste disponible, y compris après rechargement
si des blocs sont présents sur le serveur ou dans le stockage local.
`FINCA_AUDIO_E2E_PORT` remplace son port de test 5227.

La liste des réunions propose une recherche sur le serveur (titre, thème, texte
du compte rendu et date), des filtres avec ou sans version validée et un chargement
par pages. La recherche conserve la réunion ouverte et ses saisies.
`npm run test:meeting-search:browser` vérifie ce parcours avec une API simulée ;
`FINCA_SEARCH_E2E_PORT` remplace le port de test 5228. La CI vérifie également la
recherche et la pagination sur sa base PostgreSQL de test.

La création d’une action depuis un repère de réunion exige que ses corrections
soient enregistrées. Le bouton et les champs du repère sont verrouillés pendant
la demande ; un échec permet de réessayer sans perdre les valeurs enregistrées.

Les repères affichent leurs documents BAÚL rattachés. Un document déjà lié à
la réunion ne peut pas être rattaché une seconde fois. Pendant la demande,
le choix du document est verrouillé ; une erreur conserve ce choix pour réessayer.

Chaque version validée d’un compte rendu peut être exportée en texte (.txt).
L’export reprend la copie figée à sa validation, avec sa date, son numéro de
version et ses références. Les propositions restent distinctes des décisions
confirmées. Exporter ne sauvegarde ni ne valide le brouillon actuellement saisi.

Le registre des décisions propose une recherche par mots dans les notes, responsables,
titres, types et dates des réunions, sans distinction de casse ou d’accents.
La recherche porte sur les 5 000 derniers repères renvoyés par le serveur.
Les résultats sont affichés par pages de 25 éléments. Une nouvelle recherche ou
un changement de filtre revient à la première page.
Il conserve sa page, sa recherche et son filtre lorsqu’on ouvre un compte rendu
d’origine puis qu’on utilise « Retour au registre des décisions ». Le repère choisi
est mis en évidence dans la réunion. Une indisponibilité du registre peut être
retentée sans être confondue avec une liste vide. Le parcours est vérifié par
`npm run test:decision-register:browser` (port 5229, modifiable par `FINCA_REGISTER_E2E_PORT`).

Les deux vues Actions proposent les mêmes filtres : à faire, à compléter,
en cours / attente, accomplies et toutes. Le filtre reste dans le lien lors
d’une actualisation ou d’un aller-retour dans un dossier. Les modifications
enregistrées sont répercutées dans les autres onglets du même navigateur.
Les saisies non enregistrées restent visibles si une mise à jour arrive
d’un autre onglet. Le bouton « Réessayer la sauvegarde » permet de les enregistrer
après rétablissement du stockage, sans modifier les champs à nouveau.

Le déploiement utilise `docker-compose.coolify.yml` : voir [la fiche Coolify](COOLIFY_HANDOFF.md).
Le transfert du code ne déplace pas automatiquement les bases de données ni les volumes du serveur existant.

## Entretien des branches

Après une fusion dans la branche par défaut, GitHub Actions supprime la branche
de travail du dépôt si elle pointe toujours sur le commit fusionné. Une branche
ayant reçu de nouveaux commits, une branche issue d’un fork ou la branche par
défaut est conservée. Le workflow exécute uniquement le code de la branche par
défaut, sans charger celui d’une proposition externe. Le registre des anciennes
archives est dans `docs/GIT_RANGEMENT_2026-11-06.md`.
La CI complète s’exécute sur les propositions de fusion et sur les mises à jour
de `main`, pour éviter une seconde exécution sur chaque push de branche de travail.

## Confidentialité

Ce dépôt complet doit être privé : le dossier documentaire contient des informations familiales.
L'ancien prototype public demeure dans l'historique du dépôt, sans constituer une seconde application active.
