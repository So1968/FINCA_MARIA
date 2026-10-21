# FINCA MARIA — installation sur le serveur privé

Cette branche prépare le vrai logiciel FINCA MARIA pour fonctionner derrière un serveur privé sans réinventer l'application existante.

## Ce qui est prêt

- frontend React/Vite existant conservé ;
- conteneur web Nginx ;
- backend Node dédié ;
- PostgreSQL persistant ;
- connexion par compte nominatif et mot de passe ;
- mot de passe stocké sous forme de dérivé `scrypt`, jamais en clair dans la base ;
- session aléatoire stockée dans un cookie `HttpOnly`, `Secure`, `SameSite=Strict` ;
- le jeton de session n'est pas stocké dans `localStorage` en mode serveur ;
- accès administrateur complet pour les rôles `admin-projet` et `admin-secretariat` ;
- accès héritier au vrai tableau FINCA MARIA sous `/family/`, en consultation ;
- redirection automatique d'un compte `heritier` vers `/family/` après connexion ;
- même base PostgreSQL et mêmes données partagées pour l'administration et la consultation héritier ;
- aucune route d'écriture, de gestion des comptes ou du BAÚL exposée par l'API famille ;
- création, changement de rôle, désactivation et changement de mot de passe depuis Gouvernance & accès ;
- journal d'audit côté serveur ;
- réservations Maison, préparation des chambres et principaux états Maison persistés et synchronisés via PostgreSQL ;
- protection contre les doubles réservations côté serveur ;
- limitation des tentatives de connexion ;
- contrôle d'origine sur les opérations d'écriture ;
- base et API non exposées directement sur Internet ;
- seul le conteneur web écoute localement sur le port choisi.

## Pré-requis sur le serveur

- Linux maintenu à jour ;
- Docker Engine + plugin `docker compose` ;
- un nom de domaine ou sous-domaine ;
- un reverse proxy HTTPS devant `127.0.0.1:8080` (Caddy, Traefik, Nginx Proxy Manager, Coolify ou équivalent) ;
- sauvegarde hors machine pour PostgreSQL.

Le reverse proxy public doit être la seule porte d'entrée. Ne pas publier PostgreSQL ni le port 3000 de l'API.

## Installation

```bash
git clone <URL_DU_DEPOT_PRIVE>
cd FINCA_MARIA
git checkout main
cp .env.finca.example .env
nano .env
```

Dans `.env`, renseigner au minimum :

```text
APP_ORIGIN=https://finca.votre-domaine.fr
POSTGRES_PASSWORD=un_secret_long_et_unique
FINCA_BOOTSTRAP_ADMIN_EMAIL=adresse-de-l-administrateur
FINCA_BOOTSTRAP_ADMIN_NAME=nom-affiché
FINCA_BOOTSTRAP_ADMIN_PASSWORD=mot-de-passe-initial-d-au-moins-12-caracteres
```

Pour éviter les problèmes d'URL PostgreSQL, utiliser pour `POSTGRES_PASSWORD` une valeur longue composée de lettres, chiffres, `_` et `-`, ou encoder correctement les caractères réservés.

Démarrer :

```bash
docker compose -f docker-compose.finca.yml up -d --build
```

Contrôler :

```bash
docker compose -f docker-compose.finca.yml ps
docker compose -f docker-compose.finca.yml logs --tail=100 finca-api
curl http://127.0.0.1:8080/healthz
```

Configurer ensuite le reverse proxy HTTPS vers :

```text
http://127.0.0.1:8080
```

`APP_ORIGIN` doit être exactement l'adresse HTTPS réellement utilisée dans le navigateur, sans slash final.

## Première connexion administrateur

Ouvrir :

```text
https://finca.votre-domaine.fr/login.html
```

Utiliser l'email et le mot de passe initial définis dans `.env`.

Après connexion, aller dans **Gouvernance & accès**. L'administrateur peut :

- créer un deuxième administrateur ;
- créer les comptes des héritiers ;
- attribuer le rôle `heritier` ;
- choisir les autres rôles ;
- désactiver/réactiver un compte ;
- changer un mot de passe ;
- consulter le journal d'audit.

Les rôles `admin-projet` et `admin-secretariat` ouvrent tous les modules du logiciel. Les différences entre ces deux rôles décrivent leur fonction réelle, pas une limitation technique d'accès.

## Accès des héritiers au vrai FINCA MARIA

Chaque héritier doit disposer de son propre compte nominatif avec le rôle :

```text
heritier
```

L'héritier peut ouvrir directement :

```text
https://finca.votre-domaine.fr/family/
```

S'il passe par la page de connexion générale sans adresse de destination, le rôle `heritier` est automatiquement redirigé vers `/family/`.

Cette page utilise l’interface isolée de consultation `FincaFamilySafeApp` et charge les données partagées depuis le même serveur PostgreSQL que l'administration.

La séparation de sécurité reste la suivante :

- `/` : logiciel complet et API d'administration, réservés aux administrateurs ;
- `/family/` : vrai FINCA MARIA en consultation pour les héritiers ;
- `/family-api/me` et `/family-api/bootstrap` : lecture de la session et des données partagées ;
- aucune route d'écriture n'est exposée sous `/family-api/` ;
- `/api/admin/*` : administrateurs uniquement ;
- `/api/baul/*` : administrateurs uniquement ;
- le BAÚL privé n'est pas accessible depuis l'espace héritier.

Les champs de saisie et les commandes de modification connues sont désactivés dans la vue héritier. La protection décisive reste cependant côté serveur : la vue héritier ne dispose d'aucune route d'écriture vers PostgreSQL ou le BAÚL.

## Vérifications après ouverture à la famille

Faire au minimum les tests suivants :

1. sans connexion, `/family/` redirige vers la page de connexion ;
2. un compte `heritier` se connecte et arrive sur `/family/` ;
3. il voit les vraies données FINCA MARIA provenant du serveur ;
4. il ne peut pas ouvrir `/api/admin/users` ;
5. il ne peut pas ouvrir `/api/baul/status` ;
6. il ne peut pas modifier les données serveur ;
7. un administrateur continue d'accéder normalement à `/` et à Gouvernance & accès.

## Sauvegarde PostgreSQL

Exemple de sauvegarde manuelle :

```bash
mkdir -p backups
docker compose -f docker-compose.finca.yml exec -T finca-db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "backups/finca-$(date +%F-%H%M).dump"
```

Le serveur réel doit automatiser la sauvegarde et copier les fichiers de sauvegarde hors du serveur. Une sauvegarde qui n'a jamais été restaurée n'est pas considérée comme validée.

## Restauration de test

La restauration doit être testée sur une base séparée avant toute urgence réelle. Conserver également :

- le commit Git déployé ;
- le `.env` dans un coffre de secrets séparé ;
- les sauvegardes PostgreSQL ;
- le volume BAÚL et ses sauvegardes.

## Ce qui reste volontairement séparé

- le BAÚL privé et ses originaux restent réservés aux administrateurs ;
- les comptes `contributeur-familial`, `secretaire` et `conseil` ne sont pas automatiquement assimilés à un compte héritier ;
- les données historiques déjà codées restent inchangées : la couche serveur sécurise et persiste le logiciel existant, elle ne remplace pas ses modules.
