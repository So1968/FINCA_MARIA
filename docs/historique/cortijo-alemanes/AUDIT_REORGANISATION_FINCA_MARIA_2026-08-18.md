# FINCA MARIA — Audit de réorganisation

Date : 18/08/2026
Branche de travail : `renommage-finca-maria`

## Principe directeur

On ne reconstruit pas FINCA MARIA.

On part de l'existant, on l'inventorie, on identifie les doublons et les briques partielles, puis on réorganise sans casser les fonctions déjà opérationnelles.

Le renommage CORTIJO ALEMANES → FINCA MARIA est un changement de nom du produit, pas une refonte fonctionnelle.

## Architecture fonctionnelle validée

### TIERRAS

Espace dédié aux terres et à l'exploitation agricole :

- parcelles ;
- oliviers ;
- campagnes ;
- productions ;
- coopérative San Juan ;
- PAC / SIGPAC ;
- travaux agricoles ;
- prestataires ;
- factures ;
- paiements ;
- terrain ;
- GPS ;
- oliviers repères ;
- anomalies agricoles ;
- comparaisons de campagnes.

### CASA

Espace dédié à la maison et à ses usages :

- état du bâti ;
- fissures ;
- travaux ;
- sécurité ;
- pièces ;
- équipements ;
- inventaire ;
- capacité d'accueil ;
- calendrier d'occupation ;
- règlement ;
- jardin / patio / extérieurs ;
- décisions liées à la maison.

### Règle de séparation

TIERRAS et CASA gardent des historiques et des tableaux de bord distincts.

Ils peuvent partager les mêmes briques transversales, mais leurs événements métier ne doivent pas être mélangés dans une seule chronologie principale.

## Briques transversales communes

- BAÚL ;
- recherche documentaire ;
- comptes utilisateurs ;
- rôles et permissions ;
- journal d'audit ;
- traçabilité des modifications ;
- sauvegardes ;
- démarches ;
- exports ;
- provenance des données ;
- détection des contradictions ;
- versionnage des données sensibles.

## Ce qui existe déjà et doit être conservé

### BAÚL

Le composant d'import existe déjà avec :

- import local ;
- contrôle SHA-256 des fichiers ;
- détection de doublons ;
- import par lot ;
- file de documents en attente ;
- aperçu rapide ;
- proposition de catégorie ;
- proposition de nom logique ;
- validation humaine obligatoire.

Conclusion : ne pas recréer une nouvelle boîte d'arrivée. Renforcer celle-ci.

### Démarches

Le bureau des démarches existe déjà avec :

- interlocuteur ;
- script prêt à lire ;
- canal ;
- date de contact ;
- réponse obtenue ;
- personne ayant saisi la réponse ;
- prochaine étape ;
- document reçu ou non ;
- historique des réponses ;
- missions ;
- assignations ;
- équipe ;
- rappels ;
- export calendrier.

Conclusion : construire la vue globale « qui attend quoi de qui ? » à partir de cette base, pas à côté.

### Mémoire projet

Le portail mémoire existe déjà avec :

- chronologie ;
- recherche ;
- types de repères ;
- contrats ;
- productions ;
- vidéos ;
- décisions ;
- localisation de la source ;
- statut de preuve.

Conclusion : cette mémoire doit devenir plus dynamique et être reliée au BAÚL, sans remplacer le BAÚL.

### Terrain

Le projet possède déjà :

- vue Terrain ;
- registre des oliviers repères ;
- O01 à O15 ;
- périmètre María ;
- comptage visuel des oliviers ;
- mode GPS ;
- parcours guidé ;
- outil mobile terrain ;
- export JSON / KML.

Conclusion : ne pas recréer le terrain. Le rattacher progressivement à TIERRAS et au moteur de données commun.

### Multi-administrateurs / traçabilité

La règle produit est déjà documentée :

- un compte = une personne ;
- pas de mot de passe partagé ;
- rôles distincts ;
- auteur + date de modification ;
- conservation avant / après pour les corrections sensibles ;
- lecture héritiers distincte de l'administration ;
- BAÚL privé non exposé automatiquement.

Conclusion : le besoin est déjà cadré mais pas encore implémenté techniquement.

## Briques existantes mais encore partielles

### Recherche documentaire globale

Le BAÚL sait gérer ses imports mais FINCA MARIA ne possède pas encore un catalogue unifié capable de répondre simplement à :

> « Trouve-moi le contrat »

Cible : recherche par contenu, OCR, type, date, personne, campagne, parcelle, TIERRAS/CASA et emplacement physique.

### Historique des démarches

L'historique existe par démarche, mais il manque une vue chronologique globale des démarches et réponses.

### Provenance des données

Les pièces et reconstructions existent, mais le graphe source → extraction → calcul → conclusion n'est pas encore un mécanisme transversal du logiciel.

### Indice de confiance

Des statuts existent déjà, mais ils ne sont pas encore harmonisés dans tout le logiciel.

Cible commune :

- [P] Prouvé ;
- [D] Déclaré ;
- [C] Calculé / reconstitué ;
- [H] Hypothèse ;
- contradictoire ;
- à vérifier.

### Contradictions

Le registre d'anomalies existe. Il doit devenir le point de réception des contradictions détectées automatiquement entre documents et données.

### Sauvegardes

Le principe est validé mais il manque encore une vue de contrôle : emplacement, date de dernière sauvegarde, empreinte, état de restauration / vérification.

## Briques réellement manquantes

### Authentification réelle

L'équipe existe aujourd'hui surtout comme donnée locale. Il faut encore :

- authentification ;
- sessions ;
- comptes individuels ;
- désactivation de compte ;
- gestion de rôles ;
- permissions effectives.

### Journal d'audit persistant

À enregistrer au minimum :

- `actorId` ;
- rôle ;
- action ;
- objet ;
- identifiant objet ;
- état avant ;
- état après ;
- date et heure ;
- résultat ;
- motif pour les opérations sensibles.

### Persistance commune

Une partie importante de l'application utilise encore `localStorage`.

Le passage multi-utilisateurs exigera une base persistante commune avant ouverture des comptes familiaux.

### Validation renforcée des opérations sensibles

À prévoir pour :

- suppression d'une preuve ;
- changement d'une donnée historique sensible ;
- modification des droits ;
- publication d'une pièce privée ;
- export juridique ;
- correction d'un total de production validé.

## Optimisations validées à intégrer sans doublonner

1. Graphe de provenance des données.
2. Empreinte numérique des preuves — déjà partiellement présente via SHA-256 BAÚL.
3. Versionnage des données sensibles.
4. Indice de confiance harmonisé.
5. Détection des contradictions.
6. Boîte d'arrivée intelligente — à renforcer à partir du BAÚL existant.
7. Lien physique parcelle / olivier / média / intervention / facture.
8. Mode terrain hors connexion + synchronisation.
9. Double validation des opérations sensibles.
10. Vue « Qui attend quoi de qui ? ».
11. Comparateur de campagnes.
12. Détection automatique des pièces manquantes.
13. Sauvegardes vérifiées.
14. Exports ciblés famille / expert / avocat / Peláez.
15. Traçabilité complète des actions dans le logiciel.

## Règles documentaires

- Les originaux et preuves privées ne vont pas dans Git.
- Git conserve le code, la structure, les règles, les scripts et les index non sensibles.
- Les documents peuvent rester sur plusieurs stockages physiques.
- FINCA MARIA doit savoir les retrouver sans obliger l'utilisateur à connaître leur chemin.
- Un même fichier présent sur plusieurs supports doit être reconnu par empreinte comme la même pièce.
- La recherche doit fonctionner même si le nom de fichier d'origine est mauvais.

## Ordre de réorganisation recommandé

### Phase A — sécuriser le renommage

1. Repérer les chemins actifs encore basés sur `CORTIJO_ALEMANES`.
2. Ne conserver l'ancien nom que pour l'historique ou la compatibilité technique temporaire.
3. Tester BAÚL, scripts, exports, raccourcis et build.

### Phase B — clarifier l'interface

1. Faire apparaître TIERRAS et CASA comme deux univers métier séparés.
2. Garder BAÚL et Démarches comme briques transversales.
3. Corriger les textes visibles qui disent encore « Cortijo » alors que le produit s'appelle FINCA MARIA.

### Phase C — consolider les données

1. Catalogue documentaire commun.
2. Provenance.
3. Statuts de confiance communs.
4. Contradictions.
5. Pièces manquantes.
6. Comparateur de campagnes.

### Phase D — multi-utilisateurs et sécurité

1. Base persistante commune.
2. Authentification.
3. Permissions.
4. Audit log.
5. Validation sensible.
6. Sauvegardes vérifiées.

## Règle finale

Avant de créer une nouvelle fonction :

1. vérifier si une brique existe déjà ;
2. la renforcer si possible ;
3. créer seulement ce qui manque réellement ;
4. tester ;
5. tracer la modification.

> FINCA MARIA se consolide. Elle ne repart pas de zéro.
