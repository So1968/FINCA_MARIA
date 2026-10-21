# Audit et séparation de FINCA MARIA — 21 octobre 2026

## État final de la séparation Git

Le dépôt FINCA_MARIA est privé. Le transfert complet est fusionné par la [PR 2](https://github.com/So1968/FINCA_MARIA/pull/2),
avec 323 fichiers et un arbre identique à l’extraction testée. Le retrait des anciennes sources est fusionné par la
[PR AZOTH_STUDIO 13](https://github.com/So1968/AZOTH_STUDIO/pull/13). Le studio conserve uniquement la fiche de suivi et son lien externe.

Les contrôles complets ont réussi dans FINCA_MARIA : https://github.com/So1968/FINCA_MARIA/actions/runs/39657460315
Le contrôle du studio après fusion a également réussi : https://github.com/So1968/AZOTH_STUDIO/actions/runs/39657873720

La variante GPS `f27d196` a été retrouvée dans l’historique GitHub. Ses huit fichiers propres sont conservés,
avec leurs empreintes, dans `archives/variante-gps-2026-10-01/`. Leur activation reste un chantier distinct.
Le serveur de production et les installations du PC ne sont pas mis à jour par cette réorganisation des dépôts.

## Décision et périmètre

Décision de Sofia : développer, tester et déployer le logiciel dans `So1968/FINCA_MARIA`.
AZOTH_STUDIO conserve uniquement une fiche de suivi ; la gestion centralisée de l’avancement viendra plus tard.

Source contrôlée : `So1968/AZOTH_STUDIO`, branche `finca-maria-final-optimized`, commit
`4318312590f461bb8458b2078214b0a61b889b08`. Ancien prototype autonome :
`So1968/FINCA_MARIA`, commit `db5cdb907a1b430348e6540a1fe431bbc0519b95`.
Le manifeste `PROVENANCE.json` répertorie les chemins et empreintes des sources extraites.

## Constats et corrections

| ID | Priorité | Constat initial et preuve | Résultat dans l’extraction |
| --- | --- | --- | --- |
| F01 | P1 | `app/vite.config.js:readIndex` et la configuration preview remplaçaient un index illisible par une liste vide. Essai reproduit : statut 200/0 document puis import 200 avec écrasement de l’index. | Résolu par lecture explicite de l’index ; statut/import 500 avec message, conservation octet pour octet de l’index abîmé et des originaux. Test HTTP automatisé. |
| F02 | P2 | `scripts/ouvrir-cortijo-local.sh` acceptait n’importe quel HTTP 200 sur le port 5173. Reproduit avec un faux serveur sans FINCA. | Résolu sous Linux : vérification de l’application et du chemin de la copie, port strict, refus d’un autre service ou d’une autre copie. Tests avec faux serveurs. Lanceur PowerShell adapté mais non exécuté sous Windows. |
| F03 | P2 | Le point d’entrée et les modules FINCA étaient intégrés au portail AZOTH ; plusieurs emplacements contenaient code et dossiers métier. | Résolu : FINCA_MARIA autonome fusionné dans son dépôt privé ; anciennes sources retirées du main AZOTH_STUDIO, qui conserve uniquement la fiche de suivi. Constructions, essais navigateur et contrôles GitHub des deux dépôts réussis. |
| F05 | P1 | Le premier contrôle GitHub de l’extraction (`39655533021`) a refusé Vite 8.3.0 pour des vulnérabilités publiées, dont GHSA-9jrq-w75r-8gcw. | Résolu par mise à jour ciblée vers Vite 8.3.5 et régénération du verrou ; audit npm sans vulnérabilité signalée et contrôles GitHub réussis. |
| F04 | P2 | `server/src/server.js:saveReservation` vérifie les conflits par `SELECT ... FOR UPDATE`, tandis que le schéma ne contient pas de contrainte d’exclusion des périodes. Deux premières réservations concurrentes peuvent ne verrouiller aucune ligne existante. | Risque étayé par lecture du code, non corrigé dans cette extraction et non reproduit sur PostgreSQL. Prochain contrôle : soumettre deux réservations simultanées du même logement, puis ajouter une protection transactionnelle ou une contrainte en base et refaire ce test. |

## Ce qui est conservé

- Interface terre/maison, dossiers, actions, analyse et comptage d’oliviers.
- Application familiale isolée et filtres des données autorisées.
- Serveur, droits, schéma PostgreSQL, sauvegardes chiffrées et contrôles de restauration existants.
- Dossier documentaire privé ; pièces uniques de l’ancien pack familial.
- Ancienne API et anciens traitements documentaires comme archives identifiées, sans exécution automatique.
- Clés du stockage navigateur de la version complète, à adresse et navigateur identiques.

Huit doublons de fichiers strictement identiques du pack sont représentés par une seule copie ;
chaque source reste recensée dans le manifeste. Les anciennes démos ne sont pas déployées.
L’ancien prototype public reste accessible par son commit : son interface et son format de sauvegarde
ne sont pas supposés interchangeables avec ceux de la version complète.

## Vérifications réellement effectuées

- Construction de la version complète avant séparation.
- Tests existants de navigation et de cohérence ; nouveaux tests de lecture d’index, import HTTP et refus d’un mauvais serveur.
- Construction autonome principale et construction familiale, avec analyse du bundle familial.
- Navigateur Chromium à 1366×1000 et 360×800 : accueil à la racine, rubriques Terre et Maison,
  cinq vues directes, absence d’erreur JavaScript sur les parcours et absence de débordement horizontal sur le parcours Maison.
- Portail studio reconstruit après retrait : accueil et ancien lien FINCA fonctionnent,
  sans téléchargement de composants métier Finca et sans action de création de FINCA.

La pile Docker/PostgreSQL n’a pas été relancée localement dans cet environnement.
Le workflow transféré a ensuite exécuté avec succès les contrôles complets sur le commit
`b497dc7d951849613c5a89cc12c9e5043ec06972` : constructions Docker, validation Compose,
authentification, API, isolation familiale, BAÚL, sauvegarde et restauration.
Preuve : https://github.com/So1968/AZOTH_STUDIO/actions/runs/39655928375

Le nettoyage du studio est enregistré dans la PR 13 ; son workflow est également réussi :
https://github.com/So1968/AZOTH_STUDIO/actions/runs/39656137381
Le serveur réel, ses secrets, ses comptes et ses volumes n’ont pas été modifiés.
Les originaux du BAÚL du PC ne font pas partie des fichiers Git et n’ont pas été déplacés.

## Ordre de finalisation

1. Propriétaire GitHub : rendre `So1968/FINCA_MARIA` privé. Cible publique observée le 21 octobre 2026 ; les dossiers privés ne doivent pas y être copiés en l’état.
2. Mainteneur : transférer l’arbre extrait sur une branche de ce dépôt, avec son ancien `main` comme parent,
   puis valider les tests. Ne pas importer tout l’historique AZOTH, qui contient d’autres projets.
3. Mainteneur : fusionner l’extraction dans FINCA_MARIA, puis le nettoyage du studio.
4. Administrateur du serveur : changer seulement la source Git du déploiement en conservant les volumes existants,
   puis vérifier les comptes et la restauration. Une nouvelle ressource Compose peut créer d’autres volumes : contrôler leurs noms effectifs avant la bascule.

Le commit `f27d196` signalé sur le PC a été retrouvé dans l’historique GitHub : ses fichiers GPS uniques sont rapatriés en archive dans FINCA_MARIA. Son module GPS n’est pas activé dans la version courante et les éventuelles modifications non commitées du PC ne sont pas accessibles. Aucune ancienne branche n’est supprimée et aucun historique n’est réécrit.
