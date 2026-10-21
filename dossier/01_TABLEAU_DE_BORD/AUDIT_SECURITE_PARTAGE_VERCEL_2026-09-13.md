# FINCA MARIA — Audit sécurité avant partage Vercel

Date : 13/09/2026

## Décision actuelle

**NO-GO pour un déploiement public ou un lien de contournement partagé.**

Un déploiement Vercel peut être envisagé uniquement derrière une authentification obligatoire, après validation du périmètre réellement livré au navigateur.

## Constats

### 1. Le dépôt GitHub est privé

Le dépôt `So1968/AZOTH_STUDIO` est actuellement privé. C'est une bonne base, mais cela ne suffit pas à protéger une application web une fois déployée.

### 2. Le BAÚL brut est correctement exclu de Git

Le `.gitignore` exclut notamment :

- `02_PRODUITS/FINCA_MARIA/05_BAUL_PREUVES/00_A_CLASSER/`
- `02_PRODUITS/FINCA_MARIA/05_BAUL_PREUVES/99_ORIGINAUX_PRIVES/`
- les variantes de `BAUL_PRIVE` / `BAUL_PRIVATE`

Les PDF, scans, photos, vidéos et originaux sensibles ne doivent pas être intégrés au build Vercel.

### 3. Des données familiales sensibles sont déjà codées dans le frontend

Les fichiers `app/src/data/*` et plusieurs composants React contiennent directement des éléments opérationnels et familiaux :

- noms de personnes / prestataires ;
- chronologies de succession et de gestion ;
- montants de factures et paiements ;
- productions agricoles, rendements et historiques ;
- PAC, fiscalité, coopérative, contrats et litiges / questions ouvertes ;
- informations sur la maison et l'assurance.

Ces données sont intégrées au bundle frontend et sont donc téléchargées sur le navigateur de toute personne autorisée à charger l'application.

### 4. L'authentification applicative n'est pas encore réellement branchée

`cortijoAccess.js` décrit les rôles et principes de sécurité, mais les comptes sont encore indiqués comme « à raccorder à l'authentification » / « à créer ».

`App.jsx` route directement vers les vues FINCA MARIA selon les paramètres d'URL et ne réalise pas, à lui seul, de contrôle d'identité ou de rôle.

Conséquence : la protection doit être placée **avant l'application** tant qu'un vrai backend d'authentification / autorisation n'est pas opérationnel.

### 5. Le filtrage par rôle frontend ne constitue pas une barrière de sécurité

Même si l'interface masque certains écrans, les données déjà livrées dans le bundle JavaScript restent accessibles à l'utilisateur qui a reçu le bundle. Toute séparation « famille / admin / expert » devra donc être faite côté serveur pour les données qui ne doivent pas être accessibles à tous les comptes autorisés.

## Règles de déploiement Vercel retenues

Avant tout partage :

1. Vercel Authentication obligatoire sur **production ET previews**.
2. Aucun déploiement public non authentifié.
3. Aucun lien temporaire de bypass pour des données sensibles.
4. Un compte individuel par personne ; pas de compte partagé.
5. 2FA activée sur le compte propriétaire Vercel et, si applicable, sur les comptes autorisés.
6. Aucun PDF / relevé bancaire / pièce d'identité / document cadastral brut / document de succession brut dans `app/public`, dans le bundle ou dans un stockage public.
7. Les originaux restent dans le BAÚL privé hors Git / hors build.
8. Les secrets restent hors Git et hors variables exposées `VITE_*`.
9. Les vues familiales ne doivent contenir que les données explicitement validées comme partageables avec la personne invitée.
10. Avant chaque déploiement, construire localement et contrôler le contenu de `dist/`.

## Niveau de risque actuel

- **Originaux sensibles** : correctement séparés par `.gitignore`, sous réserve de ne pas les recopier ailleurs dans le build.
- **Données synthétiques familiales** : présentes dans le frontend ; sensibles mais partageables seulement avec des personnes explicitement autorisées.
- **Authentification applicative** : non active.
- **RBAC serveur** : non actif.
- **Déploiement Vercel public** : interdit.
- **Déploiement Vercel protégé pour Sofia + sœur** : possible après contrôle du build et activation effective de la protection avant exposition.

## Étape suivante

Faire un build local de `app`, inventorier les fichiers réellement produits dans `dist/`, rechercher les données sensibles incluses dans les bundles JS et vérifier qu'aucun original du BAÚL ni secret n'est embarqué.

Ensuite seulement : créer le projet Vercel, activer la protection, tester l'accès non authentifié puis autoriser le compte de la sœur.
