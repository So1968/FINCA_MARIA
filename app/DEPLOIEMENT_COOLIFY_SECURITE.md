# FINCA MARIA — déploiement Coolify

## État actuel

FINCA MARIA dispose d'une pile serveur complète pour un déploiement Coolify :

- frontend React/Vite servi par Nginx ;
- API Node.js ;
- PostgreSQL privé ;
- comptes nominatifs ;
- deux rôles administrateurs donnant accès à l'ensemble du logiciel ;
- sessions en cookie `HttpOnly`, `Secure`, `SameSite=Strict` ;
- journal d'audit ;
- synchronisation serveur des données ;
- BAÚL privé sur volume persistant ;
- contrôles anti-doublon SHA-256 ;
- sauvegardes automatiques chiffrées PostgreSQL + BAÚL ;
- contrôles d'intégrité des sauvegardes ;
- `data checksums` PostgreSQL à l'initialisation ;
- volumes persistants séparés pour PostgreSQL, BAÚL et sauvegardes.

Le fichier Coolify à utiliser est à la racine :

`docker-compose.coolify.yml`

Branche de préparation :

`main`

## Services

- `finca-web` : seul service public, port interne `8080` ;
- `finca-api` : privé, port interne `3000` ;
- `finca-db` : PostgreSQL privé ;
- `finca-backup` : sauvegarde chiffrée privée.

Seul `finca-web` doit recevoir un domaine public.

## Volumes persistants

- `finca_postgres` : base PostgreSQL ;
- `finca_baul` : documents du BAÚL ;
- `finca_backups` : sauvegardes chiffrées.

Ne jamais supprimer ces volumes lors d'une mise à jour.

## Variables Coolify

```env
APP_ORIGIN=https://votre-domaine-finca.fr
POSTGRES_DB=finca_maria
POSTGRES_USER=finca
POSTGRES_PASSWORD=SECRET_ALEATOIRE_URL_SAFE_24_CARACTERES_MINIMUM
FINCA_BOOTSTRAP_ADMIN_EMAIL=votre-email@exemple.fr
FINCA_BOOTSTRAP_ADMIN_NAME=Votre nom
FINCA_BOOTSTRAP_ADMIN_PASSWORD=MOT_DE_PASSE_ADMIN_LONG_ET_UNIQUE
SESSION_HOURS=12
BACKUP_ENCRYPTION_PASSPHRASE=CLE_DE_CHIFFREMENT_SAUVEGARDE_32_CARACTERES_MINIMUM
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
```

Ne jamais committer les vraies valeurs.

Règles de secrets :

- `POSTGRES_PASSWORD` : au moins 24 caractères, uniquement `A-Z a-z 0-9 . _ ~ -` avec la composition actuelle ;
- mot de passe administrateur : au moins 16 caractères recommandé ;
- `BACKUP_ENCRYPTION_PASSPHRASE` : au moins 32 caractères ;
- les trois secrets doivent être différents ;
- stocker les secrets dans Coolify comme variables protégées/masquées ;
- conserver une copie de la clé de sauvegarde hors du serveur dans un coffre de secrets.

`APP_ORIGIN` doit correspondre exactement à l'URL HTTPS publique.

## Pré-contrôle avant déploiement

Depuis la racine du dépôt, avec les variables chargées :

```sh
sh scripts/check-coolify-config.sh
```

Ce contrôle vérifie sans afficher les secrets :

- HTTPS ;
- longueur et séparation des secrets ;
- validité du Docker Compose ;
- présence des quatre services ;
- présence des trois volumes persistants.

## Installation Coolify

1. Créer une ressource **Docker Compose** depuis le dépôt privé `So1968/FINCA_MARIA`.
2. Choisir la branche `main`.
3. Choisir `docker-compose.coolify.yml`.
4. Renseigner les variables ci-dessus.
5. Associer le domaine uniquement à `finca-web`, port `8080`.
6. Activer HTTPS.
7. Laisser `finca-api`, `finca-db` et `finca-backup` sans domaine public.
8. Vérifier la persistance des trois volumes.
9. Déployer.

## Contrôle après déploiement

```sh
sh scripts/verify-coolify.sh https://votre-domaine-finca.fr
```

Puis tester réellement :

- connexion et déconnexion ;
- accès complet administrateur ;
- synchronisation depuis un second navigateur ;
- import, prévisualisation et anti-doublon BAÚL ;
- journal d'audit ;
- présence d'une sauvegarde chiffrée complète dans `finca_backups` ;
- restauration de test sur une pile isolée.

## Sauvegardes et chiffrement

Les sauvegardes locales sont désormais chiffrées avant leur écriture dans le volume :

- `postgres-*.sql.gz.gpg` ;
- `baul-*.tar.gz.gpg` ;
- `complete-*.sha256`.

Les archives hors serveur doivent rester chiffrées. Une copie hors serveur est toujours obligatoire.

Le chiffrement des sauvegardes ne remplace pas le chiffrement du disque du serveur. Le serveur Coolify
doit utiliser un stockage chiffré au niveau de l'hôte ou de l'hébergeur pour protéger PostgreSQL et le
BAÚL lorsqu'ils sont en service.

## Sécurité

- HTTPS obligatoire ;
- aucun secret dans les variables `VITE_*` ;
- comptes administrateurs individuels ;
- aucun partage d'identifiants ;
- PostgreSQL, API et sauvegarde sur réseau privé Docker ;
- conteneurs applicatifs en lecture seule lorsque possible ;
- `no-new-privileges` actif ;
- BAÚL jamais publié comme répertoire web ;
- sauvegardes chiffrées AES-256 via GnuPG ;
- clé de sauvegarde distincte et stockée hors serveur ;
- interface Coolify elle-même protégée par authentification forte ;
- accès SSH du serveur limité aux personnes autorisées.

## Mise en service

FINCA MARIA ne doit être considéré prêt pour usage réel qu'après :

1. déploiement sur le vrai serveur ;
2. HTTPS valide ;
3. contrôle des volumes ;
4. première sauvegarde chiffrée ;
5. copie hors serveur ;
6. restauration réelle réussie ;
7. confirmation du chiffrement du stockage de l'hôte.
