# FINCA MARIA — BAÚL et CASA

Date de création : 21/05/2026

Ce document complète les fichiers de continuité et d’ordre de travail de FINCA MARIA.

- Référence principale : `docs/cortijo-alemanes/continuite-cortijo-alemanes.md`
- Ordre de travail : `docs/cortijo-alemanes/ordre-de-travail-cortijo-alemanes.md`

Règle de méthode : ces briques s’ajoutent à l’existant. Elles ne remplacent pas l’architecture déjà validée.

---

## 1. BAÚL — Coffre intelligent

BAÚL est le coffre intelligent de FINCA MARIA.

Il doit être pensé avec le vocabulaire propre de FINCA MARIA : agricole, familial, administratif, documentaire, immobilier et transmissible.

### 1.1 Rôle de BAÚL

BAÚL doit permettre de :

- importer des documents ;
- reconnaître le type de document ;
- proposer un classement ;
- extraire les informations utiles ;
- relier les documents aux modules de l’outil ;
- créer une question si une information manque ;
- créer une tâche si une action est nécessaire ;
- détecter une anomalie ;
- préparer des exports pour Peláez, la famille ou un conseil extérieur.

BAÚL ne doit pas être un simple stockage. Il doit transformer les documents en informations exploitables.

### 1.2 Types de documents reconnus

BAÚL doit pouvoir recevoir et classer :

- PDF ;
- photos de factures ;
- tickets coopérative San Juan ;
- documents PAC ;
- accusés de dépôt ;
- liquidations / repartos ;
- comptes rendus de réunion ;
- mails ;
- captures WhatsApp ;
- relevés bancaires ;
- documents Peláez ;
- documents cadastraux / SIGPAC ;
- photos terrain ;
- vidéos terrain ;
- devis ;
- factures de travaux maison ;
- documents de location ;
- inventaires maison ;
- diagnostics ;
- plans.

### 1.3 Reconnaissance intelligente

À l’import, BAÚL doit essayer de reconnaître :

- est-ce une facture ?
- est-ce un ticket d’apport San Juan ?
- est-ce un document PAC ?
- est-ce un accusé de dépôt ?
- est-ce une liquidation / reparto ?
- est-ce un compte rendu de réunion ?
- est-ce une preuve photo / vidéo ?
- est-ce un relevé bancaire ?
- est-ce un document Peláez ?
- est-ce un document cadastral / SIGPAC ?
- est-ce un document lié à la maison ?
- est-ce un devis ou une facture de travaux ?
- est-ce un document de location ?

Règle : l’outil peut proposer un classement, mais la validation humaine reste obligatoire.

### 1.4 Questions automatiques après import

Après chaque import, BAÚL doit poser :

- Ce document prouve quoi ?
- À quelle campagne est-il lié ?
- Est-il lié à la PAC ?
- Est-il lié à Peláez ?
- Est-il lié à un travail agricole ?
- Est-il lié à une facture ?
- Est-il lié à une réunion ?
- Est-il lié à CASA ?
- Faut-il créer une question ?
- Faut-il créer une tâche ?
- Faut-il créer une anomalie ?
- Faut-il le transmettre à Peláez ?
- Faut-il l’intégrer à un export ?

### 1.5 Liens avec les autres modules

BAÚL doit être relié à :

- Campagnes San Juan ;
- PAC / Subventions ;
- Travaux agricoles ;
- Factures ;
- Paiements ;
- Réunions ;
- Décisions ;
- Questions ;
- Tâches ;
- Relances ;
- Anomalies ;
- Coffre de preuves ;
- CASA ;
- Exports.

### 1.6 Entrées d’interface BAÚL

À prévoir dans l’interface :

- Importer un document ;
- Documents à classer ;
- Documents reconnus ;
- Documents à vérifier ;
- Documents liés à Peláez ;
- Documents liés à San Juan ;
- Documents liés à PAC ;
- Documents liés à CASA ;
- Anomalies détectées depuis les documents.

---

## 2. CASA — Maison et location intelligente

CASA est l’entrée de FINCA MARIA dédiée à la maison, aux pièces, au matériel, à l’inventaire permanent, aux travaux à prévoir et à la capacité d’accueil.

### 2.1 Fiche maison

CASA doit permettre de décrire :

- nom de la maison ;
- adresse / localisation ;
- statut : familiale, louable, travaux, à vérifier ;
- surface approximative ;
- nombre d’étages ;
- accès ;
- extérieurs ;
- stationnement ;
- eau ;
- électricité ;
- chauffage ;
- climatisation ;
- photos générales ;
- documents liés dans BAÚL.

### 2.2 Description des pièces

Chaque pièce doit avoir une fiche :

- nom de la pièce ;
- type : chambre, salon, cuisine, salle de bain, terrasse, cave, garage, réserve, extérieur ;
- surface approximative ;
- état général ;
- nombre de couchages possibles ;
- mobilier présent ;
- matériel présent ;
- photos ;
- travaux à prévoir ;
- commentaires.

### 2.3 Inventaire permanent

CASA doit contenir un inventaire vivant de ce qui se trouve dans la maison :

- objet ;
- catégorie ;
- pièce où il se trouve ;
- quantité ;
- état ;
- photo ;
- valeur estimée ;
- propriétaire / origine ;
- date d’ajout ;
- date de vérification ;
- statut.

Catégories possibles :

- meubles ;
- literie ;
- électroménager ;
- vaisselle ;
- outils ;
- matériel agricole léger ;
- linge de maison ;
- décoration ;
- équipement extérieur ;
- produits d’entretien ;
- matériel de sécurité ;
- autre.

Statuts possibles :

- présent ;
- à remplacer ;
- cassé ;
- manquant ;
- prêté ;
- à acheter ;
- à vérifier.

### 2.4 Capacité intelligente d’accueil

CASA doit distinguer :

- capacité confortable ;
- capacité normale ;
- capacité maximale ;
- capacité exceptionnelle.

Le calcul doit tenir compte :

- des lits doubles ;
- des lits simples ;
- des canapés convertibles ;
- des matelas disponibles ;
- des places au sol possibles ;
- des salles de bain ;
- de la surface disponible ;
- du confort minimum ;
- des règles de sécurité.

L’outil doit pouvoir dire :

- ce groupe peut venir maintenant ;
- ce groupe peut venir seulement après travaux ;
- ce groupe est trop nombreux ;
- la maison est louable sous conditions ;
- la maison n’est pas louable tant que certains points ne sont pas réglés.

### 2.5 Location intelligente

Quand un groupe veut séjourner dans la maison, CASA doit permettre de saisir :

- nombre d’adultes ;
- nombre d’enfants ;
- nombre de nuits ;
- besoin de lits séparés ou non ;
- acceptation ou non des matelas au sol ;
- besoin bébé / lit parapluie ;
- accessibilité particulière ;
- animaux ;
- niveau de confort souhaité.

L’outil doit proposer :

- capacité OK / limite / impossible ;
- répartition proposée par pièce ;
- couchages utilisés ;
- matelas nécessaires ;
- matériel à prévoir ;
- points de vigilance ;
- estimation possible de prix ou de conditions.

### 2.6 Vision globale maison

CASA doit afficher une vision globale :

- maison habitable : oui / non / partiellement ;
- maison louable : oui / non / sous conditions ;
- capacité confortable actuelle ;
- capacité maximale actuelle ;
- capacité après travaux ;
- pièces utilisables ;
- pièces à éviter / condamner ;
- points urgents ;
- points bloquants pour la location ;
- dernière vérification.

### 2.7 Classification des travaux

Les travaux à prévoir doivent être classés par priorité :

- P0 — Danger / sécurité immédiate ;
- P1 — Urgent pour habiter ;
- P2 — Important pour louer ;
- P3 — Confort / amélioration ;
- P4 — Esthétique / embellissement.

Exemples P0 :

- électricité dangereuse ;
- fuite importante ;
- toiture menaçante ;
- escalier dangereux ;
- gaz / chauffe-eau à vérifier ;
- risque incendie ;
- ouverture cassée non sécurisée.

Exemples P1 :

- eau chaude ;
- sanitaires ;
- cuisine utilisable ;
- fenêtres / portes qui ferment ;
- literie minimale ;
- nettoyage profond ;
- humidité importante.

Exemples P2 :

- nombre de couchages correct ;
- salle de bain fonctionnelle ;
- linge de maison suffisant ;
- vaisselle suffisante ;
- sécurité des accès ;
- inventaire d’entrée / sortie ;
- photos propres ;
- règlement intérieur.

Exemples P3 :

- meubles plus pratiques ;
- rangements ;
- ventilation ;
- éclairage agréable ;
- matelas supplémentaires ;
- équipement bébé ;
- coin extérieur.

Exemples P4 :

- décoration ;
- peinture non urgente ;
- ambiance des pièces ;
- textiles ;
- plantes ;
- petits éléments de charme.

### 2.8 Fiche travail maison

Chaque travail maison doit contenir :

- titre du travail ;
- pièce concernée ;
- priorité : P0, P1, P2, P3 ou P4 ;
- type : sécurité, habitabilité, location, confort, esthétique ;
- description ;
- photo liée ;
- document lié dans BAÚL ;
- devis lié ;
- facture liée ;
- coût estimé ;
- responsable ;
- échéance ;
- statut ;
- impact sur la capacité d’accueil ;
- impact sur la location.

Statuts possibles :

- à constater ;
- à chiffrer ;
- devis demandé ;
- à faire ;
- en cours ;
- fait ;
- à vérifier ;
- bloquant location ;
- non prioritaire.

Règle : CASA doit permettre de savoir rapidement si la maison est habitable, louable, sous quelles conditions, combien de personnes peuvent y séjourner réellement, et quels travaux bloquent ou améliorent la location.

---

## 3. Priorité d’intégration interface

Après la frise annuelle et l’entretien agricole, intégrer dans l’interface FINCA MARIA :

- BAÚL — Coffre intelligent ;
- CASA — Maison et location intelligente ;
- Vision globale maison ;
- Travaux maison P0 à P4 ;
- Capacité d’accueil intelligente ;
- Reconnaissance des documents.

Objectif : FINCA MARIA doit réunir la traçabilité agricole, administrative, documentaire et immobilière du lieu, sans mélanger les modules mais en les reliant entre eux.
