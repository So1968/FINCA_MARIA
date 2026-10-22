# FINCA MARIA — Accès familiaux, récupération et traçabilité

État : cahier des charges, **aucune activation de compte, aucune invitation envoyée**.

## Principes approuvés

- Tous les 14 cohéritiers désignés ont un **droit identique de consultation** des informations familiales et patrimoniales communes.
- Les rôles ne changent que les droits d'écriture et d'administration. La lecture de secrets techniques et de données personnelles de sécurité reste exclue.
- Chaque personne possède un compte individuel identifié par une adresse e-mail unique. Pas de mot de passe partagé.
- Les opérations sensibles sont attribuées à un utilisateur identifié et journalisées.
- La suppression ordinaire est logique, réversible, jamais silencieuse ; restauration attribuée et journalisée.
- Les sauvegardes chiffrées et **testées en restauration** sont distinctes de la corbeille.
- Ne pas stocker les noms/adresses des cohéritiers dans Git : prévoir un import privé lors du déploiement. Les 14 identités ont été confirmées dans le registre familial privé ; aucun nom ou e-mail personnel n'est conservé dans ce dépôt.

## Matrice des autorisations cible

| Opération | Administrateur familial | Secrétaire | Membre du conseil | Consultation |
|---|---|---|---|---|
| Lire patrimoine, comptes rendus, décisions, archives | oui | oui | oui | oui |
| Lire la corbeille et l'historique des opérations familiales | oui | oui | oui | oui |
| Préparer réunions, comptes rendus brouillons, imports | oui | oui | selon délégation explicite | non |
| Valider ou publier une décision | selon procédure collégiale | selon procédure collégiale | selon procédure collégiale | non |
| Restaurer un élément supprimé | oui | selon autorisation | non | non |
| Inviter, suspendre un compte / gérer les rôles | oui | non | non | non |
| Modifier la configuration et les secrets techniques | administrateur technique uniquement | non | non | non |

Une validation collégiale **ne doit pas** être confondue avec un clic de l'administrateur.

## Authentification et récupération

1. Invitation nominative à usage unique, à durée limitée, après vérification de l'adresse.
2. Initialisation du mot de passe par l'intéressé, sans mot de passe envoyé en clair.
3. « Mot de passe oublié » : réponse identique pour adresse connue/inconnue ; jeton aléatoire stocké sous forme d'empreinte, expiration courte et usage unique ; limitation des tentatives ; e-mail par SMTP transactionnel configuré côté serveur.
4. À la réinitialisation : révocation des sessions existantes ; journalisation de l'événement **sans jamais journaliser le jeton ou le mot de passe**.
5. Gestion des rôles **côté API** sur chaque route, pas uniquement affichage conditionnel dans React.
6. Pas de partage de compte ; envisager une authentification multifacteur pour l'administration.

## Suppressions, versions et restauration

- Colonnes ou table dédiée : deleted_at, deleted_by, deletion_reason, deleted_snapshot_version.
- Par défaut, retirer l'élément des listes actives, mais conserver ses fichiers et ses références.
- Journal d'audit append-only logique : acteur, horodatage serveur, action, type/id, avant/après, résultat.
- Restaurer avec transaction atomique, vérifier les collisions de références, et conserver l'événement de restauration.
- Versionner documents et comptes rendus officiels ; une correction n'efface pas une ancienne version.
- Limiter les effacements définitifs à une procédure exceptionnelle définie et documentée ; concilier cette politique avec les obligations légales de protection des données.
- Journal et sauvegardes protégés contre l'altération : l'hébergeur et les administrateurs disposant d'un accès système restent techniquement privilégiés ; prévoir copie chiffrée indépendante et contrôle périodique de restauration.

## Déploiement Coolify

- Préparer DNS + TLS HTTPS, stockage persistant séparé pour PostgreSQL / BAÚL / backups.
- Configurer les identifiants SMTP via les secrets Coolify, jamais dans Git.
- Auditer l'actuel rôle `admin-secretariat` : il est actuellement inclus dans `ADMIN_ROLES`, trop large pour une secrétaire.
- Auditer les accès API : la liste actuelle des utilisateurs et la création des comptes sont déjà présentes, mais l'invitation par e-mail et la récupération autonome ne le sont pas.
- Préparer une migration additive, un test en environnement isolé et des tests d'accès par rôle, avant d'activer le premier compte familial.
- L'installation locale `http://127.0.0.1:8080` reste indépendante ; aucune migration de données n'est supposée automatique.
- Ne lancer aucun import réel, activation de compte, invitation ou déploiement de production au seul motif que ce document est commité.

## Tests obligatoires

- Tous les rôles lisent la même donnée familiale publiée.
- Un rôle consultation ne peut ni écrire ni supprimer même via un appel API direct.
- Une secrétaire ne peut ni créer un administrateur ni modifier les permissions.
- Réinitialisation : liens expirés, rejoués, faux comptes, tentatives abusives, révocation des sessions.
- Suppression/restauration document, réunion, décision : contenu intact, auteur et heures tracés.
- Sauvegarde PostgreSQL **et** fichiers BAÚL, puis restauration contrôlée en environnement séparé.
