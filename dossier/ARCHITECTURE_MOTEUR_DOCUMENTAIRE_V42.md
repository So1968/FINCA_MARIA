# FINCA MARIA V42 — Architecture du moteur documentaire

## Objectif

FINCA MARIA ne doit pas seulement stocker les documents du BAÚL. Le logiciel doit les lire, les qualifier, les rapprocher des autres pièces et vérifier automatiquement s’ils répondent déjà à une question ou s’ils invalident une ancienne hypothèse.

Règle centrale : aucun document ne doit alimenter une conclusion, une anomalie ou une question du board tant qu’il n’a pas été analysé et relié aux autres pièces pertinentes.

## Pipeline obligatoire

1. Réception du document dans le BAÚL.
2. Calcul de l’empreinte SHA-256.
3. Détection des doublons exacts.
4. Conservation de l’original intact.
5. Détection du type de document.
6. Extraction du texte natif lorsqu’il existe.
7. Lecture visuelle du document.
8. OCR uniquement lorsque le texte natif ou la lecture visuelle sont insuffisants.
9. Extraction structurée des faits : dates, noms, organismes, références, parcelles, recintos, surfaces, kilos, montants, rendements, numéros de dossier, signatures, statuts de dépôt, etc.
10. Qualification de chaque fait : [P] prouvé, [D] déclaré, [C] calculé/reconstitué, [H] hypothèse.
11. Rapprochement avec les pièces déjà connues.
12. Détection des contradictions, doublons logiques et informations devenues obsolètes.
13. Comparaison automatique avec les questions et anomalies ouvertes du board.
14. Proposition de fermeture, reformulation ou maintien des questions.
15. Revue humaine uniquement lorsqu’une ambiguïté subsiste ou lorsqu’une conclusion sensible est proposée.

## Principe de non-répétition

Une question ne doit plus rester ouverte si une pièce déjà analysée y répond de manière suffisante.

Exemple : si un document PAC prouve le dépôt, le board ne doit plus demander « Qui a déposé la PAC ? » comme si l’existence du dépôt était inconnue. Il doit soit fermer la question, soit la reformuler uniquement sur le point encore non résolu : titulaire, parcelles, surfaces, compte de versement, etc.

## Architecture cible serveur

BAÚL entrant
→ stockage original sécurisé
→ service d’analyse documentaire
→ moteur OCR/extraction
→ base de faits structurés
→ moteur de rapprochement
→ mise à jour contrôlée du board
→ journal d’audit

Le service documentaire doit être séparé du navigateur. Les décisions de sécurité, de rôles et de validation sont appliquées côté serveur.

## Données à enregistrer pour chaque document

- identifiant interne ;
- empreinte SHA-256 ;
- nom original ;
- type MIME ;
- date d’import ;
- utilisateur ayant importé ;
- catégorie proposée et validée ;
- texte natif extrait ;
- texte OCR éventuel ;
- niveau de confiance ;
- champs structurés ;
- faits extraits ;
- qualification [P]/[D]/[C]/[H] ;
- liens vers les autres pièces ;
- questions auxquelles le document répond ;
- contradictions détectées ;
- statut de validation humaine ;
- historique des modifications.

## Règles de sécurité

- le document original est immuable ;
- aucune OCR ne remplace l’original ;
- toute valeur extraite reste traçable vers la page et le document source ;
- aucune donnée sensible n’est envoyée à un service externe sans validation explicite ;
- les services OCR/IA doivent être auto-hébergés ou explicitement approuvés ;
- aucun secret dans Git ;
- accès au moteur documentaire via authentification et rôles ;
- journalisation des imports, lectures, validations et suppressions ;
- sauvegardes indépendantes du stockage documentaire et de la base de métadonnées.

## Déploiement Coolify

Prévoir à terme un service serveur dédié au traitement documentaire, distinct du frontend FINCA MARIA.

Ce service devra :
- être sur réseau Docker privé ;
- ne pas exposer de port public direct ;
- accéder au stockage BAÚL et à la base de données ;
- traiter les documents en file d’attente ;
- pouvoir être redémarré sans perdre les tâches ;
- disposer de limites CPU/RAM ;
- produire des logs exploitables ;
- ne jamais contenir de secret en dur.

Ne pas ajouter ce service au compose de production tant que son implémentation n’est pas fonctionnelle et testée.

## État V42 au 18/08/2026

Déjà disponible :
- import BAÚL ;
- empreinte SHA-256 ;
- contrôle de doublons ;
- aperçu des documents ;
- validation humaine du classement ;
- règle documentaire formalisée dans le code et la documentation.

À construire :
- moteur OCR serveur ;
- extraction structurée ;
- rapprochement automatique avec les questions ;
- fermeture/reformulation automatique proposée du board ;
- journal d’audit serveur ;
- base partagée des faits et documents ;
- file de traitement documentaire.

## Critère de réussite

Un nouveau document importé doit pouvoir conduire automatiquement à une proposition du type :

« Ce document répond à la question X. Preuve trouvée page Y. La question peut être fermée. Il reste uniquement le point Z à vérifier. »

Le logiciel doit donc empêcher FINCA MARIA de redemander demain une information déjà présente dans le BAÚL aujourd’hui.
