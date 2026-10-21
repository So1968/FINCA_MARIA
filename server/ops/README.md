# Exploitation FINCA MARIA

La pile Coolify est `docker-compose.coolify.yml`, branche `main`.
Le service `finca-backup` exécute `backup-finca.sh` au démarrage puis toutes les
`BACKUP_INTERVAL_SECONDS` (86400 par défaut). Il conserve 14 jours par défaut.
Les volumes persistants ne remplacent pas une sauvegarde hors serveur.

## Chiffrement des sauvegardes

`BACKUP_ENCRYPTION_PASSPHRASE` est obligatoire et doit contenir au moins 32 caractères.
Cette clé doit être différente du mot de passe PostgreSQL et du mot de passe administrateur.
Ne jamais la committer dans GitHub ni l'envoyer par messagerie.

Les dumps PostgreSQL et les archives BAÚL sont compressés puis chiffrés en AES-256 par GnuPG
avant leur publication dans le volume `finca_backups`. Aucun dump PostgreSQL ni archive BAÚL
en clair n'est écrit dans ce volume.

Une sauvegarde exploitable comprend :

- `postgres-<date>-<id>.sql.gz.gpg` ;
- `baul-<date>-<id>.tar.gz.gpg` ;
- `complete-<date>-<id>.sha256`.

Le manifeste SHA-256 porte sur les deux fichiers chiffrés. Un échec de dump, de chiffrement
ou de vérification ne publie pas de manifeste complet.

## Produire et contrôler une sauvegarde

Depuis le répertoire du projet et avec les variables du serveur chargées :

```sh
docker compose -f docker-compose.coolify.yml exec -T finca-backup /usr/local/bin/backup-finca
docker compose -f docker-compose.coolify.yml exec -T finca-backup sh -ec 'cd /backups; for manifest in complete-*.sha256; do sha256sum -c "$manifest"; done'
```

Copier régulièrement les trois fichiers vers un stockage distinct du serveur. La copie hors
serveur reste chiffrée. Conserver la clé de déchiffrement dans un gestionnaire de secrets ou
un coffre distinct du serveur de production.

## Restauration à valider avant ouverture aux utilisateurs

1. Créer une pile isolée, avec une base et un volume BAÚL vierges.
2. Copier une paire complète et son manifeste depuis le stockage hors serveur.
3. Vérifier le manifeste avec `sha256sum -c complete-<date>-<id>.sha256`.
4. Déchiffrer le dump PostgreSQL et l'archive BAÚL uniquement dans un espace temporaire protégé.
5. Charger le SQL dans la base isolée avec `psql -v ON_ERROR_STOP=1`.
6. Extraire le BAÚL dans le volume documentaire isolé.
7. Démarrer l'API puis le frontend et tester connexion, données partagées, BAÚL et audit.
8. Invalider les sessions restaurées et consigner le test de restauration.

La CI effectue automatiquement une sauvegarde chiffrée puis une restauration isolée de données
synthétiques PostgreSQL et BAÚL. Cela ne remplace pas le test réel depuis une copie hors serveur.

## Protection du serveur physique

Le chiffrement des sauvegardes ne chiffre pas à lui seul les volumes PostgreSQL et BAÚL en cours
d'utilisation. Le serveur Coolify doit donc utiliser un disque ou volume chiffré au niveau de
l'hôte (par exemple chiffrement intégral du disque ou stockage chiffré fourni par l'hébergeur),
avec sauvegarde de la clé de récupération hors du serveur.

PostgreSQL est initialisé avec les `data checksums` afin de détecter certaines corruptions de pages.
Cette option prend effet lors de la création initiale du volume PostgreSQL.
