# Rangement Git du 6 novembre 2026

`main` est la branche de référence. Les anciens travaux sont conservés sous des tags
`archive/2026-11-06/…` avant la suppression de leurs branches.
L’historique n’est pas réécrit. Les brouillons de sécurité archivés ne sont pas intégrés par ce rangement.

## Inventaire de départ

| Ancienne branche | Commit observé | État au rangement | Archive |
| --- | --- | --- | --- |
| `amelioration-retour-actions-2026-11-05` | `4d107aab0221` | Remplacée par la consolidation Actions (#13) | `archive/2026-11-06/amelioration-retour-actions-2026-11-05` |
| `archives/prototype-autonome-2026-10-21` | `db5cdb907a1b` | Ancienne branche déjà incluse dans main | `archive/2026-11-06/archives/prototype-autonome-2026-10-21` |
| `developpement-actions-2026-11-05` | `d6eca56a35f5` | Consolidée dans le chantier Actions | `archive/2026-11-06/developpement-actions-2026-11-05` |
| `docs/acces-familiaux-securises` | `5250a0ba97a4` | Brouillon #6, à reprendre | `archive/2026-11-06/docs/acces-familiaux-securises` |
| `feature/corbeille-reservations` | `53b0132a998a` | Brouillon #10, à reprendre | `archive/2026-11-06/feature/corbeille-reservations` |
| `feature/corbeille-reunions` | `b91c6c0a38e7` | Brouillon #11, à reprendre | `archive/2026-11-06/feature/corbeille-reunions` |
| `feature/corbeille-unifiee-controle-admin` | `6b81a6a02d65` | Intégrée par #12 | `archive/2026-11-06/feature/corbeille-unifiee-controle-admin` |
| `feature/import-historique-reunions` | `dece78b383dd` | Intégrée par #5 | `archive/2026-11-06/feature/import-historique-reunions` |
| `feature/jetons-invitation-recuperation` | `a11815a6f6b5` | Brouillon #9, à reprendre | `archive/2026-11-06/feature/jetons-invitation-recuperation` |
| `feature/lecture-familiale-reunions` | `ad85ac8953b0` | Brouillon #8, à reprendre | `archive/2026-11-06/feature/lecture-familiale-reunions` |
| `feature/recuperation-mot-de-passe-local` | `3bc38b5f74cf` | Commande de récupération à examiner | `archive/2026-11-06/feature/recuperation-mot-de-passe-local` |
| `feature/reunions-conseils-famille` | `92e586213676` | Intégrée par #4 | `archive/2026-11-06/feature/reunions-conseils-famille` |
| `fix/priorites-rapport` | `d6722e11142b` | Ancienne branche déjà incluse dans main | `archive/2026-11-06/fix/priorites-rapport` |
| `fix/secretaire-sans-gestion-comptes` | `7204cf1d2664` | Brouillon #7, à reprendre | `archive/2026-11-06/fix/secretaire-sans-gestion-comptes` |
| `migration/projet-complet-autonome` | `cc957da0647f` | Intégrée par #2 | `archive/2026-11-06/migration/projet-complet-autonome` |
| `optimise/fiabilite-sauvegarde` | `16dcff9cc305` | Intégrée par #1 | `archive/2026-11-06/optimise/fiabilite-sauvegarde` |

Le tag de la branche de développement inclut également ce registre et le correctif CI
ajoutés pendant le rangement. Le commit observé correspond à l’inventaire initial.
`archive/2026-11-06/main-before-cleanup` conserve main avant consolidation.

## Travaux non finalisés à reprendre

- #6 : matrice des accès familiaux et récupération sécurisée ; documentation, aucun compte activé.
- #7 : séparation de la gestion des comptes ; compléter les permissions et leurs tests.
- #8 : lecture familiale des réunions ; compléter la matrice des rôles et les contrôles BAÚL.
- #9 : jetons d’invitation/récupération ; fondation sans route publique ni envoi d’e-mail.
- #10 et #11 : premières corbeilles réservations/réunions ; comparer au module unifié intégré par #12 avant de réutiliser ces versions.
- `feature/recuperation-mot-de-passe-local` : commande locale de récupération, à auditer avant intégration.

Les propositions en brouillon sont fermées comme archives, pas déclarées livrées.
Leurs descriptions et leurs commits restent consultables.

## Retrouver un travail archivé

```bash
git fetch origin --tags
git switch -c reprise/jetons archive/2026-11-06/feature/jetons-invitation-recuperation
```

Avant d’intégrer un ancien travail, comparer son contenu avec main actuel.
Créer ensuite une branche de travail courte et une proposition de fusion ciblée.
Supprimer la branche après fusion ; conserver un tag seulement pour un point de reprise utile.

