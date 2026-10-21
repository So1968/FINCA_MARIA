# FINCA MARIA — Multi-administrateurs et traçabilité

## Décision

Finca Maria doit fonctionner avec plusieurs comptes administrateurs individuels.

Le cas de départ prévoit au minimum deux fonctions d’administration :

- une **administratrice projet**, responsable de la construction du produit, de ses règles et de la publication ;
- une **administratrice secrétariat de la ferme**, responsable du secrétariat courant, des pièces administratives et du suivi opérationnel.

Ces deux fonctions doivent pouvoir travailler sur la même donnée de référence sans utiliser un compte partagé.

## Règles obligatoires

1. Un compte = une personne.
2. Aucun mot de passe administrateur ne doit être partagé entre plusieurs personnes.
3. Toute modification importante doit conserver une trace de l’auteur et de la date.
4. Toute correction sensible doit pouvoir conserver l’état avant et après.
5. Les droits de lecture des héritiers restent distincts des droits d’administration.
6. Le BAÚL privé n’est jamais exposé automatiquement aux comptes héritiers.
7. La publication vers l’espace familial reste une action explicite.

## Traçabilité minimale

Chaque événement d’administration important doit pouvoir enregistrer :

- `actorId` : compte ayant réalisé l’action ;
- `actorRole` : rôle utilisé ;
- `action` : création, modification, validation, publication, archivage, etc. ;
- `objectType` : document, campagne, facture, travail, décision, question, anomalie, etc. ;
- `objectId` : identifiant stable de l’objet ;
- `before` : état précédent lorsque nécessaire ;
- `after` : nouvel état ;
- `timestamp` : date et heure.

## Droits de départ

### Administratrice projet

Peut notamment :

- administrer les modules Cortijo ;
- définir et faire évoluer les règles du produit ;
- valider ou corriger les classements ;
- gérer les comptes et droits ;
- décider ce qui devient visible à la famille ;
- préparer les exports.

### Administratrice secrétariat de la ferme

Peut notamment :

- ajouter et contrôler les informations administratives ;
- valider des documents et rattachements ;
- mettre à jour campagnes, factures, PAC et suivi ;
- préparer les éléments destinés à la famille ;
- consulter l’historique des modifications.

Les permissions exactes pourront être affinées plus tard sans remettre en cause le principe de deux comptes administrateurs distincts.

## Héritiers

La V1 en ligne doit privilégier un accès en lecture aux informations marquées comme visibles famille.

Les héritiers ne doivent pas pouvoir :

- modifier les originaux ;
- publier un document privé ;
- effacer une preuve ;
- modifier une donnée de référence sans passer par un futur mécanisme de contribution contrôlée.

## Prochaine brique technique

Avant la mise en ligne publique ou familiale réelle :

1. choisir et brancher un système d’authentification ;
2. créer les comptes administrateurs individuels ;
3. brancher une base commune persistante ;
4. enregistrer les événements de traçabilité ;
5. appliquer les permissions par rôle ;
6. seulement ensuite ouvrir les comptes héritiers.

Cette architecture doit rester compatible avec le poste local actuel : le BAÚL privé et les originaux ne sont pas déplacés vers le web par défaut.
