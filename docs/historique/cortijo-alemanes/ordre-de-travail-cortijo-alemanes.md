# Ordre de travail — FINCA MARIA

Date : 16/05/2026

## Objectif

Transformer les besoins validés dans le fichier de continuité en premières briques concrètes de l’outil FINCA MARIA.

Référence principale :

- docs/cortijo-alemanes/continuite-cortijo-alemanes.md

Règle de travail :

Ne pas refaire toute l’architecture.
Construire progressivement, brique par brique.

---

## 1. Priorité V1

La V1 doit permettre de créer un outil utilisable pour suivre :

- les campagnes San Juan ;
- la PAC / subventions ;
- le dossier Peláez ;
- les travaux agricoles ;
- les documents et preuves ;
- les factures ;
- les réunions ;
- les décisions ;
- les questions à poser ;
- les tâches assignées ;
- les relances ;
- les anomalies.

---

## 2. Pages principales à prévoir

Créer ou prévoir les pages suivantes :

- Tableau de bord Finca Maria
- Campagnes San Juan
- PAC / Subventions
- Travaux agricoles
- Cycle végétatif
- Dossier Peláez
- Documents / preuves
- Factures
- Réunions
- Relevé de décisions
- Questions à poser
- Tâches assignées
- Relances
- Anomalies / points suspects
- Coffre de preuves
- Exports

---

## 3. Tableau de bord

Le tableau de bord doit afficher :

- les urgences actuelles ;
- les tâches en retard ;
- les questions sans réponse ;
- les documents à transmettre à Peláez ;
- les anomalies détectées ;
- les campagnes en cours ;
- les documents récemment ajoutés ;
- les prochaines échéances PAC ;
- les prochaines réunions.

---

## 4. Première brique à développer

Commencer par une V1 simple en données locales ou mockées.

Brique prioritaire :

### Questions / tâches / relances

Cette brique doit permettre :

- créer une question ;
- assigner une personne ;
- fixer une date de création ;
- fixer une date attendue ;
- choisir un statut ;
- relier à PAC, Peláez, San Juan, facture, réunion ou document ;
- générer les rappels J+1, J+2, J+3, pause J+4, J+5, J+6, J+7 ;
- afficher l’historique des relances.

Statuts :

- À poser
- Posée
- En attente
- Relancée
- Réponse partielle
- Réponse complète
- Bloquée
- À discuter en réunion
- À escalader
- Terminée

---

## 5. Deuxième brique à développer

### Documents / preuves

Cette brique doit permettre :

- ajouter un document ;
- choisir son type ;
- indiquer sa source ;
- le relier à une campagne, une PAC, une facture, une réunion ou une tâche ;
- indiquer ce que le document prouve ;
- indiquer s’il doit être transmis à Peláez ;
- indiquer s’il doit créer une question ou une tâche.

Types de documents :

- Ticket d’apport
- Facture
- Liquidation / reparto
- Document PAC
- Accusé de dépôt
- Paiement
- Photo terrain
- Vidéo terrain
- Message WhatsApp
- Mail
- Document Peláez
- Document cadastral / SIGPAC
- Compte rendu
- Autre

---

## 6. Troisième brique à développer

### Factures

Cette brique doit permettre :

- ajouter une facture manuellement ;
- importer une facture ;
- renseigner date, fournisseur, montant, objet ;
- relier la facture à un travail agricole ;
- relier la facture à une campagne ;
- relier la facture au dossier Peláez ;
- marquer la facture comme payée, non payée, transmise, à vérifier ou litige.

Statuts :

- À classer
- Classée
- À vérifier
- Montant à contrôler
- Doublon possible
- Transmise à Peláez
- Payée
- Non payée
- Litige / question

---

## 7. Quatrième brique à développer

### Anomalies / points suspects

Cette brique doit faire remonter :

- facture sans travail agricole lié ;
- travail agricole sans facture ;
- paiement sans facture ;
- document PAC manquant ;
- facture transmise sans vérification ;
- ticket d’apport isolé ;
- production anormalement basse ;
- doublon possible ;
- document incomplet ;
- preuve absente.

Chaque anomalie doit avoir :

- date de détection ;
- type ;
- élément concerné ;
- gravité ;
- question à poser ;
- responsable ;
- statut ;
- commentaire.

---

## 8. Cinquième brique à développer

### Réunions / décisions

Cette brique doit permettre :

- créer une réunion ;
- ajouter ordre du jour ;
- noter participants ;
- importer ou coller un compte rendu ;
- extraire décisions ;
- extraire questions ouvertes ;
- créer des tâches à partir des décisions ;
- créer des relances si une action est assignée.

---

## 9. Critères de validation

Une brique est considérée comme valide si :

- elle ne casse pas l’existant ;
- elle respecte le fichier de continuité ;
- elle permet une saisie simple ;
- elle affiche les données de façon lisible ;
- elle relie les informations entre elles ;
- elle ne mélange pas les campagnes, la PAC, les factures et les réunions ;
- elle garde une trace des décisions et relances.

---

## 10. Règle importante

FINCA MARIA ne doit pas être seulement joli.

L’outil doit aider à :

- classer ;
- prouver ;
- rapprocher ;
- relancer ;
- détecter les anomalies ;
- préparer les dossiers Peláez, famille ou avocat ;
- reconstituer ce qui s’est réellement passé sur l’exploitation.

---

## 11. Prochaine action technique

Créer dans l’application une première interface simple pour :

- Questions
- Tâches
- Relances
- Anomalies

Puis tester visuellement avant d’ajouter les autres modules.

