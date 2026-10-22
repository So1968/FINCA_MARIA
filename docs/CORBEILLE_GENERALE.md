# FINCA MARIA — Corbeille générale

État : implémentation pour réservations, réunions (avec audio) et documents du BAÚL.

## Principes

- Une suppression ordinaire est **logique et réversible** : `deleted_at` et `deleted_by` sont conservés.
- La liste active exclut les éléments en corbeille. Les réunions placées en corbeille refusent également toute modification de leurs sous-éléments.
- Tous les cohéritiers actifs ont accès **en lecture seule** à l'historique et aux éléments supprimés via l'espace famille ; seuls les administrateurs familiaux `admin-projet` peuvent déplacer, restaurer ou purger.
- Le compte secrétaire `admin-secretariat` n'a aucun droit de gestion des comptes utilisateurs.
- Les transactions PostgreSQL incluent la journalisation de la suppression et de la restauration.
- Les fichiers originaux restent inchangés lors de la mise en corbeille. La restauration vérifie leur présence, taille et empreinte SHA-256.
- Une restauration de réservation conflictuelle est bloquée pour éviter les doubles affectations.
- Les purges définitives produisent un reçu durable avec auteur et date, visible par les cohéritiers.
- Une purge de documents ou de réunions exige deux confirmations administrateur : vérification de l'élément et contrôle des sauvegardes. Si un document était référencé dans une réunion, la rupture de ces liens exige une troisième confirmation, auditée.
- Un enregistrement ou une transcription en cours interdit la purge d'une réunion.
- La suppression des fichiers intervient **après validation SQL**, au moyen de la file durable `trash_file_cleanup`. En cas d'échec, l'état « effacement en attente » est visible et l'administrateur peut relancer l'opération.

## Interface

- Administrateur : `/?view=corbeille` ou « Corbeille générale » depuis Réunions.
- Cohéritiers : `/family/` → « Corbeille et historique ». Lecture seule.
- Dans l'interface administrateur : choisir un élément actif, le déplacer en corbeille, le restaurer ou sélectionner « Supprimer définitivement » avec saisie de `VIDER DEFINITIVEMENT` et confirmations.
- Les reçus restent dans « Historique des suppressions définitives ».

## Précautions et limites

1. Une **purge** retire les données de la base active et programme la suppression de l'original sur le stockage actif. Elle n'efface pas instantanément les anciennes sauvegardes chiffrées. Celles-ci restent soumises à leur durée de conservation.
2. L'administrateur doit vérifier les dépendances et les sauvegardes avant la purge. Les modifications de droits sont contrôlées côté API et Nginx, pas seulement dans React.
3. Les journaux d'audit doivent eux-mêmes être protégés par des sauvegardes indépendantes et un accès privilégié ; un administrateur disposant du serveur physique conserve toujours des possibilités techniques supplémentaires.
4. Les comptes familiaux ne sont pas créés par ces changements. Invitations et récupération autonome des mots de passe feront l'objet d'une livraison distincte.
5. **Ne jamais** exécuter `docker compose down -v` lors d'une mise à jour : cela détruirait les volumes PostgreSQL, BAÚL et sauvegardes.

## Tests requis

- Unitaires Node : lecture sans droit d'écriture, restrictions admin, confirmations de purge, fichier absent/altéré/intact, lien symbolique hors BAÚL, audit et transactions.
- Docker + PostgreSQL réels, mais données de CI : suppression/restauration de réservation, réunion et document ; retour du fichier BAÚL octet pour octet ; purge après contrôles ; consultation des reçus.
- Sauvegarde chiffrée puis restauration isolée PostgreSQL et BAÚL.
- Compilation interface React et vue familiale séparée, audit du bundle hérité.

Aucune donnée réelle ni aucune invitation familiale n'est utilisée dans ces tests.
