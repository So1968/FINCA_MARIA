# FINCA MARIA — fiche de raccordement Coolify

Cette fiche est destinée à l'administrateur du serveur. Elle ne contient aucun secret.

## Source à déployer

- Dépôt privé : `So1968/FINCA_MARIA`
- Branche : `main`
- Docker Compose : `docker-compose.coolify.yml`
- Service public : `finca-web`
- Port interne du service public : `8080`

Ne pas utiliser les anciennes compositions frontend seules et ne pas déployer l'ancienne démo familiale comme application séparée.

## Services

- `finca-web` : frontend Nginx, seul service à associer au domaine public.
- `finca-api` : API Node.js privée, port interne 3000, sans domaine public.
- `finca-db` : PostgreSQL privé, sans port public.
- `finca-backup` : sauvegarde automatique PostgreSQL + BAÚL.

## Accès public après déploiement

Un seul domaine FINCA MARIA suffit :

```text
https://DOMAINE_PUBLIC_FINCA/
```

- `/login.html` : connexion nominative ;
- `/` : administration complète, réservée aux rôles `admin-projet` et `admin-secretariat` ;
- `/family/` : vrai FINCA MARIA en consultation pour les comptes `heritier` ;
- un héritier qui se connecte depuis la page générale est redirigé automatiquement vers `/family/`.

La vue `/family/` utilise une interface isolée de consultation `FincaFamilySafeApp` et les données partagées du même serveur PostgreSQL. Elle ne doit pas être reliée à une seconde base.

## Séparation des droits héritiers

L'espace héritier n'expose que :

- `/family-api/me` : identité et rôle de la session ;
- `/family-api/bootstrap` : lecture des données partagées ;
- `/family-api/logout` : fermeture de session.

Il n'expose aucune route d'écriture. Les routes `/api/admin/*` et `/api/baul/*` restent derrière le contrôle administrateur.

Chaque héritier doit avoir un compte nominatif distinct avec le rôle `heritier`. Ne pas utiliser de compte familial partagé.

## Variables Coolify obligatoires

```env
APP_ORIGIN=https://DOMAINE_PUBLIC_FINCA
POSTGRES_DB=finca_maria
POSTGRES_USER=finca
POSTGRES_PASSWORD=VALEUR_SECRETE
FINCA_BOOTSTRAP_ADMIN_EMAIL=EMAIL_ADMIN_INITIAL
FINCA_BOOTSTRAP_ADMIN_NAME=NOM_ADMIN_INITIAL
FINCA_BOOTSTRAP_ADMIN_PASSWORD=VALEUR_SECRETE
SESSION_HOURS=12
BACKUP_INTERVAL_SECONDS=86400
BACKUP_RETENTION_DAYS=14
```

`APP_ORIGIN` doit être exactement l'URL HTTPS publique, sans slash final.

Les vraies valeurs secrètes restent uniquement dans Coolify et ne doivent pas être ajoutées au dépôt.

## Volumes à conserver impérativement

- `finca_postgres`
- `finca_baul`
- `finca_backups`

Ces volumes sont ceux du vrai FINCA MARIA. Ils doivent rester persistants lors des redéploiements. Ne pas les recréer et ne pas basculer l'espace héritier sur d'autres volumes.

## Réseau et domaine

Associer le domaine uniquement à `finca-web:8080` et activer HTTPS.

Ne pas exposer directement `finca-api` ni `finca-db` à Internet.

## Vérification après déploiement

Depuis une machine disposant de `curl` :

```bash
sh scripts/verify-coolify.sh https://DOMAINE_PUBLIC_FINCA
```

Ce contrôle ne demande aucun mot de passe. Il vérifie la santé publique, la page de connexion, la protection du logiciel sans session et les principaux en-têtes de sécurité.

Ensuite effectuer deux tests réels.

### Test administrateur

1. connexion avec un compte administrateur ;
2. accès à `/` ;
3. modification d'une donnée test ;
4. import d'un document test dans le BAÚL ;
5. déconnexion.

### Test héritier

1. créer un compte nominatif avec le rôle `heritier` depuis **Gouvernance & accès** ;
2. se connecter avec ce compte ;
3. vérifier la redirection vers `/family/` ;
4. vérifier que le vrai tableau FINCA MARIA et les vraies données partagées sont visibles ;
5. vérifier que `/api/admin/users` et `/api/baul/status` restent refusés ;
6. vérifier qu'aucune modification n'est persistée côté serveur.

## État de validation du dépôt

Le workflow `FINCA MARIA server checks` construit le frontend et le backend, construit le conteneur comprenant aussi la vue `/family/`, audite les dépendances, valide le Compose et exécute un test runtime de la pile Coolify avec PostgreSQL, authentification administrateur, BAÚL, anti-doublon et sauvegardes.

La validation finale reste celle du serveur réel : domaine, HTTPS, volumes persistants, comptes héritiers et restauration de sauvegarde.
