# FINCA MARIA — Architecture de partage familial

## Cap

FINCA MARIA doit pouvoir être utilisé aujourd’hui comme poste de travail local privé, puis devenir un espace familial en ligne où chaque héritier autorisé peut consulter la même information structurée sans exposer le BAÚL privé ni les fichiers de travail de Sofia.

Le passage au web ne doit pas obliger à reconstruire le produit. Il faut donc séparer dès maintenant :

1. le **poste de travail local** ;
2. les **données validées pour partage** ;
3. le **portail familial en ligne** ;
4. les **exports destinés aux tiers**.

## 1. Les quatre espaces

### A. Poste local — administration

Rôle : recevoir, trier, vérifier, corriger et rapprocher les informations.

Contient notamment :

- BAÚL privé ;
- originaux ;
- documents non encore vérifiés ;
- brouillons ;
- questions internes ;
- anomalies en cours d’analyse ;
- outils de classement et de publication.

Cet espace n’est pas le site familial.

### B. Couche de publication

Un élément ne devient partageable qu’après validation explicite.

États proposés :

- `prive_local` ;
- `a_verifier` ;
- `valide` ;
- `visible_famille` ;
- `export_tiers` ;
- `archive`.

Le simple fait qu’un fichier soit présent dans le BAÚL ne le rend jamais visible en ligne.

### C. Portail famille

Rôle : permettre aux héritiers autorisés de comprendre le patrimoine et son suivi.

Le portail doit présenter :

- campagnes agricoles ;
- productions ;
- travaux ;
- PAC ;
- San Juan ;
- factures et paiements validés ;
- documents validés ;
- CASA et FINCA ;
- anomalies ;
- questions ;
- réunions ;
- décisions ;
- chronologie ;
- exports familiaux ;
- historique des mises à jour.

La V1 familiale peut être principalement en lecture seule. La contribution pourra être ajoutée ensuite.

### D. Exports tiers

Peláez, expert agricole, avocat ou autre conseil ne doivent pas nécessairement avoir accès à tout le portail familial.

Les exports restent préparés volontairement selon leur destinataire.

## 2. Comptes et rôles

Avant toute vraie mise en ligne, le portail doit être protégé par authentification.

Le modèle est **multi-utilisateurs** : plusieurs administrateurs et plusieurs secrétaires peuvent exister en parallèle. Chaque personne utilise son propre compte.

### Administratrice projet

Rôle de pilotage et de construction du produit.

- pilote le poste local ;
- valide les règles du produit ;
- valide ou corrige les classements ;
- décide ce qui devient visible ;
- gère les comptes et les droits ;
- prépare les exports ;
- consulte l’historique complet.

### Administratrice secrétariat de la ferme

Rôle d’administration opérationnelle du secrétariat réel de la ferme.

- ajoute et contrôle les informations administratives ;
- valide des documents et rattachements ;
- met à jour campagnes, factures, PAC, San Juan et suivi ;
- prépare les éléments destinés à la famille ;
- consulte l’historique des modifications.

Il peut y avoir plusieurs comptes de ce niveau si l’organisation de la ferme le demande.

### Secrétaire

Il peut y avoir **autant de secrétaires que nécessaire**, chacune avec son propre compte.

Selon les droits attribués, une secrétaire peut :

- déposer des documents dans un sas ;
- saisir et mettre à jour les données autorisées ;
- préparer des rapprochements, questions et pièces ;
- consulter les modules nécessaires au secrétariat ;
- proposer une correction sans effacer l’historique.

Les droits peuvent être identiques entre plusieurs secrétaires ou adaptés à leurs responsabilités.

### Héritier

- consulte l’ensemble des informations marquées `visible_famille` ;
- consulte les pièces jointes publiées ;
- consulte les décisions et l’historique ;
- ne modifie pas les originaux.

### Contributeur familial — phase ultérieure

- peut proposer une information, un commentaire ou un document ;
- toute contribution entre dans un sas et doit être validée avant d’altérer la donnée de référence.

### Conseil / expert

- accès limité à un dossier ou à un export explicitement préparé ;
- aucun accès automatique au patrimoine documentaire complet.

### Règle de compte individuel

Aucun identifiant ne doit être partagé entre plusieurs personnes, y compris au secrétariat. Cela permet de savoir qui a déposé, saisi, corrigé, validé ou publié une information.

Les droits d’un compte doivent pouvoir être suspendus ou retirés sans supprimer l’historique de ses actions passées.

## 3. Principe de données

Chaque objet important doit avoir un identifiant stable.

Exemple conceptuel :

```json
{
  "id": "travail-2026-04-22-001",
  "type": "travail_agricole",
  "date": "2026-04-22",
  "titre": "Traitement foliaire",
  "statut_verification": "a_documenter",
  "visibilite": "visible_famille",
  "preuves": ["preuve-..."],
  "factures": ["facture-..."],
  "questions": ["question-..."],
  "updated_at": "..."
}
```

Les liens entre objets sont plus importants que leur simple rangement dans des dossiers.

## 4. Pièces et documents

Les originaux du BAÚL restent hors du dépôt GitHub.

Pour la future version en ligne :

- les pièces publiées doivent être stockées dans un stockage privé ;
- chaque pièce doit être liée à une donnée structurée ;
- l’accès doit nécessiter un compte autorisé ;
- les téléchargements doivent respecter le rôle de la personne ;
- les pièces non validées restent uniquement locales.

GitHub contient le code et la structure du produit, pas le coffre documentaire familial.

## 5. Traçabilité

Toute modification importante destinée au portail familial doit pouvoir garder :

- qui a créé l’information ;
- le rôle de cette personne au moment de l’action ;
- qui l’a validée ;
- quand elle a été publiée ;
- ce qui a changé ;
- l’état avant et après correction ;
- quelles preuves la soutiennent.

Une correction ne doit pas effacer silencieusement l’historique.

Le journal d’audit doit prévoir au minimum :

- `actorId` ;
- `actorRole` ;
- `action` ;
- `objectType` ;
- `objectId` ;
- `before` ;
- `after` ;
- `timestamp`.

## 6. Fonctionnement cible

Flux souhaité :

```text
DOCUMENT / PHOTO / MESSAGE
          ↓
        BAÚL
          ↓
  proposition de classement
          ↓
  validation humaine
          ↓
 donnée structurée + liens
          ↓
 décision de publication
          ↓
   PORTAIL FAMILLE
```

Si une information est corrigée dans le poste local, la version familiale ne change qu’après validation de la nouvelle version.

## 7. Socle ajouté en août 2026

Le produit possède maintenant :

- un accès direct au produit depuis les pochettes Azoth pour les interfaces déjà actives ;
- un BAÚL local avec contrôle anti-doublons ;
- un aperçu `FINCA MARIA — ESPACE FAMILLE` en lecture seule ;
- une séparation explicite entre coffre local et information destinée au partage ;
- un modèle de rôles multi-utilisateurs avec plusieurs administrateurs et plusieurs secrétaires ;
- les champs de traçabilité nécessaires au futur journal d’audit.

L’aperçu famille est un **prototype de présentation**, pas encore un espace en ligne sécurisé.

## 8. Étapes de construction

### Phase 1 — maintenant

- consolider les informations réelles ;
- entrer les photos et documents dans le BAÚL ;
- relier les preuves aux campagnes, travaux, CASA et anomalies ;
- faire évoluer le portail famille en parallèle du poste local ;
- conserver le modèle de droits multi-administrateurs et multi-secrétaires.

### Phase 2 — modèle partagé

- sortir les données métier du stockage navigateur local ;
- définir un schéma commun pour campagnes, travaux, documents, personnes, décisions et liens ;
- intégrer utilisateurs, rôles, permissions et journal d’audit au schéma commun ;
- produire un instantané familial à partir des données validées.

### Phase 3 — hébergement privé

- choisir l’hébergement ;
- créer une base de données ;
- ajouter un stockage de fichiers privé ;
- créer l’authentification ;
- créer les comptes individuels des administrateurs, secrétaires et héritiers ;
- tester les droits d’accès.

### Phase 4 — synchronisation contrôlée

- bouton « Publier à la famille » depuis le poste administrateur ;
- aperçu avant publication ;
- journal des publications ;
- possibilité de retirer une information du portail sans supprimer sa trace locale.

### Phase 5 — collaboration familiale

Seulement si cela devient utile :

- commentaires ;
- propositions de corrections ;
- dépôt familial dans un sas ;
- notifications ;
- validation des décisions de réunion.

## 9. Règles non négociables

1. Aucun fichier privé n’est publié automatiquement.
2. Aucun héritier n’a besoin de GitHub pour utiliser le futur portail.
3. Le portail doit fonctionner indépendamment d’Azoth Studio une fois exporté.
4. Le document reste la source, mais une donnée affichée doit montrer son statut de vérification.
5. Une information provisoire doit rester clairement provisoire.
6. Toute publication importante reste réversible.
7. L’outil doit rester compréhensible pour une personne qui n’a pas participé à sa construction.
8. Aucun compte administrateur ou secrétaire n’est partagé entre plusieurs personnes.
9. Toute action importante doit être attribuable à une personne et à une date.

## 10. Phrase de cap

**Azoth Studio construit et pilote. FINCA MARIA conserve, relie, explique et transmet. Le BAÚL protège les originaux ; le portail familial partage uniquement ce qui a été validé.**
