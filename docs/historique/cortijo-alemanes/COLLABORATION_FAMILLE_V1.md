# FINCA MARIA — Collaboration famille V1

## But

Faire de CORTIJO le poste de pilotage familial : chacun doit pouvoir savoir ce qu'il a à faire, à quelle date, qui prévenir, quel texte utiliser, puis enregistrer ce qui s'est réellement passé.

## Fonctions disponibles en local

- équipe familiale avec nom, email, téléphone et WhatsApp ;
- attribution d'une démarche à une personne ;
- date cible et statut de mission ;
- agenda opérationnel commun à l'application ;
- création libre de missions et travaux terrain ;
- champ « qui prévenir » et date « prévenir à partir du » ;
- boutons téléphone, email préparé et WhatsApp ;
- export calendrier `.ics` avec rappels J-7, J-3 et J-1 ;
- notifications navigateur lorsque CORTIJO est ouvert et que l'utilisateur les autorise ;
- réponse enregistrée avec date, canal, personne ayant répondu et personne ayant saisi ;
- création automatique d'un repère de mémoire après une réponse ;
- création automatique d'une mission de suivi lorsqu'une suite est notée ;
- export / import du paquet « Travail famille » en JSON avec fusion par identifiant.

## Règle de preuve

Une réponse orale reste une déclaration datée. Elle ne devient pas une preuve documentaire parce qu'elle a été saisie dans CORTIJO. Lorsqu'un document est signalé comme reçu, il doit encore être rapproché et validé dans le BAÚL.

## Règle de confidentialité

Les réponses, coordonnées, missions et documents privés ne doivent pas être envoyés sur GitHub. GitHub contient le logiciel et ses structures, pas les données privées de la famille.

## Limite actuelle

La version V1 n'est pas encore une base partagée en temps réel. Chaque navigateur possède son stockage local. Pour travailler à plusieurs immédiatement, un membre exporte `CORTIJO_TRAVAIL_FAMILLE_YYYY-MM-DD.json` et l'autre l'importe ; l'application fusionne les éléments identifiés sans effacer volontairement le reste.

## Phase suivante — partage multi-appareils sécurisé

Quand la famille valide l'ergonomie, ajouter un stockage partagé privé avec :

1. authentification individuelle ;
2. rôles simples : famille / lecture seule / professionnel invité ;
3. synchronisation des missions, réponses, agenda et contacts ;
4. journal « qui a modifié quoi et quand » ;
5. notifications email réelles côté serveur ;
6. rappels programmés indépendants du navigateur ;
7. liens WhatsApp préremplis (l'envoi automatique WhatsApp nécessiterait une intégration officielle dédiée) ;
8. conservation des pièces lourdes dans le BAÚL ou un stockage privé séparé ;
9. possibilité de révoquer un accès sans toucher aux données ;
10. sauvegarde / export complet de la base familiale.

La synchronisation ne doit pas être construite en utilisant le dépôt GitHub comme base de données privée.
