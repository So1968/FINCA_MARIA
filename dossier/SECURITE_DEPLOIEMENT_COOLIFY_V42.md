# FINCA MARIA V42 — Sécurité et déploiement Coolify

## Décision d'architecture

FINCA MARIA ne doit pas être exposée directement sur Internet. La mise en production repose sur deux barrières indépendantes :

1. **Sécurité infrastructure / Coolify / serveur**.
2. **Sécurité applicative / identité / MFA**.

Aucune mise en production familiale ne doit être considérée comme validée tant que les deux couches ne sont pas en place et testées.

---

## 1. Couche infrastructure

### Exposition réseau

- Publier uniquement le service `auth-gateway` via le domaine FINCA MARIA.
- Le conteneur `finca-maria` reste uniquement sur le réseau Docker interne et n'expose aucun port hôte.
- Le proxy Coolify termine HTTPS et route vers `auth-gateway:4180`.
- Ne pas utiliser de `ports:` publics pour l'application ni pour une base de données.

### Pare-feu / TCP

Pour un Coolify auto-hébergé :

- `80/tcp` : HTTP / émission ou renouvellement des certificats.
- `443/tcp` : HTTPS public.
- `22/tcp` ou port SSH personnalisé : administration, idéalement limité par IP ou VPN.
- `8000/tcp`, `6001/tcp`, `6002/tcp` : nécessaires lors d'un accès direct à Coolify par IP ; **à fermer au public dès que le tableau Coolify est disponible derrière son propre domaine HTTPS**.
- Aucun port FINCA MARIA supplémentaire ne doit être ouvert publiquement.

Attention : Docker peut contourner certaines règles UFW via ses règles NAT. Préférer le pare-feu du fournisseur d'hébergement / security group ; sinon valider explicitement les règles Docker.

### SSH

- Authentification par clé uniquement.
- Désactiver les connexions root par mot de passe (`PermitRootLogin prohibit-password`).
- Conserver une console de secours fournisseur avant toute modification du SSH.
- Utiliser une clé dédiée à Coolify.
- Restreindre l'origine du SSH dès que possible.

### Coolify = plan de contrôle privilégié

- Inscription publique désactivée.
- Compte administrateur Coolify protégé par 2FA.
- Rôles Coolify au minimum nécessaire.
- API tokens rares, limités et révoqués lorsqu'ils ne servent plus.
- Mises à jour Coolify, Docker Engine et OS suivies.
- Ne jamais mettre les secrets FINCA MARIA dans Git.

### Conteneurs FINCA MARIA

Le déploiement préparé impose :

- utilisateur non-root pour le serveur web ;
- système de fichiers en lecture seule ;
- `cap_drop: ALL` ;
- `no-new-privileges` ;
- volumes temporaires `tmpfs` uniquement là où nginx en a besoin ;
- limites CPU / mémoire ;
- healthchecks ;
- réseau interne isolé entre l'application et la passerelle d'authentification ;
- aucune publication directe du port de l'application.

### En-têtes HTTP

Le nginx FINCA MARIA ajoute notamment :

- `X-Content-Type-Options: nosniff` ;
- `X-Frame-Options: DENY` ;
- `Referrer-Policy: no-referrer` ;
- `Permissions-Policy` restrictive ;
- CSP restrictive ;
- isolation cross-origin de base.

La CSP devra être retestée après chaque ajout de service externe.

---

## 2. Couche identité et sécurité applicative

### Principe

Chaque membre de la famille dispose de son **propre compte**. Aucun compte générique partagé.

Architecture préparée :

`Internet → HTTPS Coolify → auth-gateway (OIDC) → FINCA MARIA interne`

Le fournisseur d'identité recommandé pour l'auto-hébergement est **authentik**, déployé séparément et configuré comme IdP OIDC. La passerelle FINCA MARIA utilise `oauth2-proxy` pour bloquer toute requête non authentifiée avant qu'elle atteigne l'application.

### MFA obligatoire

Pour FINCA MARIA :

- facteur 1 : mot de passe individuel fort ou passkey si l'IdP le permet ;
- facteur 2 : TOTP via application d'authentification ;
- MFA obligatoire pour tous les comptes FINCA MARIA ;
- MFA obligatoire également pour les administrateurs Coolify ;
- changement d'adresse mail, désactivation MFA, changement de rôle ou récupération de compte = ré-authentification forte obligatoire ;
- codes de récupération conservés hors du serveur.

SMS ne doit pas être le mécanisme MFA principal si une application TOTP / passkey est disponible.

### Rôles prévus

Groupes à créer dans l'IdP :

- `FINCA-MARIA-ADMINS` : administration technique et gestion des accès.
- `FINCA-MARIA-EDITEURS` : ajout de réponses, missions, comptes rendus, métadonnées.
- `FINCA-MARIA-LECTEURS` : consultation uniquement.

L'accès à l'application doit être lié explicitement à l'un de ces groupes. Absence de groupe = refus par défaut.

**Important :** la V42 actuelle est essentiellement une application frontend avec stockage local. Le filtrage d'affichage par rôle n'est pas une frontière de sécurité suffisante. Les permissions d'écriture devront être appliquées côté serveur quand le stockage partagé / API sera ajouté. Jusque-là, la passerelle OIDC sécurise l'accès à l'ensemble de l'application, mais ne transforme pas encore le frontend en système RBAC serveur complet.

### Sessions

Paramètres préparés :

- cookie `Secure` ;
- cookie `HttpOnly` ;
- `SameSite=Lax` ;
- durée maximale de session 8 h ;
- rafraîchissement régulier ;
- déconnexion disponible ;
- rotation / invalidation des sessions après changements sensibles à prévoir côté IdP.

---

## 3. Secrets

Variables requises par le compose :

- `FINCA_PUBLIC_URL`
- `FINCA_ALLOWED_DOMAIN`
- `OAUTH2_PROXY_IMAGE`
- `OIDC_ISSUER_URL`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OAUTH2_PROXY_COOKIE_SECRET`

Règles :

- aucune vraie valeur dans Git ;
- utiliser l'interface de secrets / variables de Coolify ;
- marquer les variables critiques comme obligatoires ;
- utiliser les Build Secrets Coolify lorsqu'un secret est nécessaire pendant une construction d'image ;
- rotation immédiate si une valeur apparaît dans un log, un commit ou une capture d'écran ;
- pinner les images sensibles par version validée, idéalement par digest avant production.

---

## 4. Sauvegardes et reprise

### Coolify

- sauvegarde automatique quotidienne de l'instance vers stockage S3 compatible externe ;
- sauvegarde séparée de `APP_KEY` hors serveur ;
- sauvegarde des clés SSH Coolify ;
- test de restauration planifié.

La sauvegarde Coolify ne sauvegarde **pas** automatiquement les données d'application / volumes.

### FINCA MARIA

V42 stocke encore plusieurs éléments dans `localStorage` du navigateur. Tant que c'est le cas :

- exporter régulièrement les fichiers JSON de travail familial / analyse / suivi ;
- garder au moins deux copies distinctes ;
- ne pas considérer le serveur comme la sauvegarde principale du BAÚL privé.

Avant un vrai mode multi-utilisateur partagé, il faudra ajouter un stockage serveur persistant, une base de données et ses sauvegardes chiffrées. Ce chantier devra inclure sauvegarde automatique, rétention et test de restauration.

### Politique minimale recommandée

- quotidien : sauvegarde automatique ;
- hebdomadaire : copie hors serveur ;
- mensuel : test d'une restauration ;
- avant chaque changement majeur : snapshot / export complet.

---

## 5. Étapes bloquantes avant mise en production

- [ ] Domaine FINCA MARIA choisi et DNS pointé.
- [ ] Coolify accessible uniquement en HTTPS sur son domaine.
- [ ] Ports 8000/6001/6002 fermés au public après validation du domaine Coolify.
- [ ] SSH par clé validé et accès par mot de passe bloqué.
- [ ] 2FA activée sur tous les comptes Coolify privilégiés.
- [ ] authentik installé et sauvegardé.
- [ ] Groupes FINCA-MARIA-ADMINS / EDITEURS / LECTEURS créés.
- [ ] Application OIDC FINCA MARIA créée dans authentik.
- [ ] MFA TOTP obligatoire dans le flux d'authentification FINCA MARIA.
- [ ] Un compte individuel créé par personne autorisée.
- [ ] Secrets OIDC saisis uniquement dans Coolify.
- [ ] Image oauth2-proxy épinglée sur une version/digest approuvé.
- [ ] Domaine Coolify attaché au service `auth-gateway`, jamais au service `finca-maria` directement.
- [ ] Test : utilisateur non connecté → redirection vers authentik.
- [ ] Test : mot de passe correct sans second facteur → accès refusé / MFA exigée.
- [ ] Test : lecteur / éditeur / admin avec comptes distincts.
- [ ] Test : logout invalide la session.
- [ ] Test : en-têtes de sécurité HTTPS présents.
- [ ] Test : aucun port interne FINCA MARIA accessible depuis Internet.
- [ ] Sauvegarde Coolify S3 configurée.
- [ ] `APP_KEY` et clés SSH sauvegardées hors serveur.
- [ ] Procédure de récupération de compte et de perte MFA écrite.
- [ ] Procédure d'incident : couper l'accès, révoquer sessions/tokens, changer secrets, restaurer si nécessaire.

---

## 6. Ce qui peut être préparé sans Sofia

Déjà préparé dans le dépôt : Dockerfile, nginx durci, Compose Coolify, passerelle OIDC, modèle de variables, règles de réseau et ce plan de sécurité.

Informations nécessaires seulement au moment du branchement réel :

- nom / IP du serveur qui héberge Coolify ;
- domaine ou sous-domaine choisi pour FINCA MARIA ;
- domaine de l'IdP (`auth...`) ;
- liste des personnes autorisées et rôle de chacune ;
- choix du stockage S3 de sauvegarde ;
- création effective des secrets et comptes MFA.

Aucun de ces éléments ne doit être inventé dans le code.
