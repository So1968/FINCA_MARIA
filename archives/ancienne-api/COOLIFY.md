# FINCA MARIA — base partagée sur Coolify

Ce service transforme les données MAISON en données familiales partagées entre ordinateur et téléphones.

## Ce qui est centralisé en premier

- réservations de chambres ;
- état « chambre prête » ;
- notes Maison ;
- suivi jardin ;
- carnet de sorties ;
- checklist de séjour ;
- suivi entretien ;
- futur plan de couchages.

Les réservations sont protégées contre les doubles réservations côté serveur : deux appareils ne peuvent pas valider la même chambre sur des dates qui se chevauchent.

## Ressources Coolify

1. Créer une base PostgreSQL dédiée à FINCA MARIA.
2. Créer une application depuis `So1968/AZOTH_STUDIO`, branche `finca-maria`.
3. Définir le répertoire de build sur `services/finca-maria-api` et utiliser le `Dockerfile` de ce dossier.
4. Exposer le port `3000` et utiliser `/health` comme contrôle de santé.
5. Donner au service API un domaine HTTPS, par exemple `https://api-finca.example.net`.

## Variables serveur obligatoires

- `DATABASE_URL` : URL interne PostgreSQL fournie par Coolify.
- `FINCA_FAMILY_CODE` : code connu uniquement de la famille.
- `FINCA_SESSION_SECRET` : secret aléatoire d'au moins 32 caractères.
- `FINCA_ALLOWED_ORIGINS` : origine(s) autorisée(s), séparées par des virgules. Ajouter l'adresse du site FINCA MARIA et, pendant les tests locaux, `http://127.0.0.1:5173`.

Ne jamais écrire le code familial ni le secret de session dans GitHub.

## Côté interface FINCA MARIA

Définir au build de l'application :

`VITE_FINCA_API_URL=https://domaine-de-l-api`

Quand cette variable existe, un petit bouton de connexion familiale apparaît dans MAISON. Chaque appareil saisit un prénom et le code familial une seule fois ; il reçoit ensuite une session limitée dans le temps.

## Migration des données déjà présentes

Au premier raccordement d'un appareil, les anciennes données locales sont envoyées vers la base lorsqu'elles n'existent pas encore. Ensuite la base centrale devient la référence partagée. Une copie locale reste conservée pour l'affichage et pour tolérer les coupures temporaires.
