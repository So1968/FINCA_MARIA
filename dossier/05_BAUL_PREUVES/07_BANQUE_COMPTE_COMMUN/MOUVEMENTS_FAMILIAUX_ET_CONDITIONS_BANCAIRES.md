# Mouvements familiaux et conditions bancaires — FINCA MARIA

## Objet

Cette fiche isole deux catégories qui ne doivent pas être confondues avec les dépenses de la Finca :

1. les **mouvements familiaux / personnels identifiables** ;
2. les **conditions tarifaires de la banque**.

Les numéros de compte, identifiants personnels, adresses, coordonnées et références d'authentification ne sont pas reproduits.

## 28/12/2010 — transfert familial vers la France

Le document `unicaja 7.pdf`, page 1, est un ordre de virement international / SEPA daté du **28/12/2010**.

Éléments lisibles sur l'original :

- montant transféré : **45 000,00 €** ;
- destination : **compte familial en France** ;
- frais bancaires portés sur le formulaire : **90,00 €** ;
- le document contient l'identité du bénéficiaire et des coordonnées bancaires complètes : elles restent volontairement masquées dans FINCA MARIA.

### Qualification

- `45 000,00 €` : **MOUVEMENT_FAMILIAL / HORS_FINCA** ;
- `90,00 €` : **FRAIS_DE_TRANSFERT_ASSOCIES** ;
- ce virement ne doit pas être compté comme dépense de maison, dépense agricole ou coût d'exploitation.

La pièce prouve l'ordre de transfert et son montant. Elle ne permet pas, à elle seule, d'expliquer l'origine économique antérieure des fonds.

## `unicaja 5.pdf` — conditions de rémunération et de maintenance 2018-2020

Les quatre pages ont été relues visuellement sur les scans originaux.

### 21/12/2018 — nouvelle grille de maintenance

Communication annonçant une modification applicable à partir de février 2019 :

- solde moyen trimestriel **≥ 30 000 €** : commission indiquée **6,00 € par trimestre** ;
- solde moyen trimestriel **< 30 000 €** : commission indiquée **15,00 € par trimestre**.

Il s'agit d'une **grille tarifaire**, pas de la preuve qu'une commission déterminée a effectivement été débitée.

### 15/10/2019 — modification de la commission de maintenance

Communication annonçant une entrée en vigueur en décembre 2019. Tarifs annuels visibles :

- certaines situations avec encours élevés : **24,00 € / an** ;
- situations intermédiaires / avec conditions de relation bancaire : **60,00 € / an** ;
- comptes sans certaines conditions ou inactifs selon les cas décrits : jusqu'à **84,00 € / an**.

La pièce détaille des conditions de solde, d'activité et de relation bancaire. FINCA MARIA conserve seulement les montants utiles, sans reproduire les données du compte.

### 14/01/2020 — modification du taux créditeur

Communication annonçant une application à partir du **14/03/2020** :

- solde moyen jusqu'à **50 000 €** : taux nominal annuel créditeur **0,00 %** ;
- part du solde moyen dépassant **50 000 €** : **0,01 %**.

Cette pièce décrit la rémunération contractuelle du compte. Elle ne constitue ni un revenu agricole ni une recette de la Finca.

### 2020 — nouvelle modification de la maintenance

Communication indiquant une application au **01/09/2020** :

- commission standard annoncée : **84,00 € / an** ;
- tarif réduit annoncé dans certaines conditions de détention / relation bancaire : **60,00 € / an**.

Là encore, il s'agit d'une **condition bancaire annoncée**, pas d'un débit prouvé.

## `unicaja banco 1.pdf` — extrait janvier-avril 2019

La pièce confirme de manière très nette le caractère **mixte** du compte :

- retraits d'espèces ;
- prélèvements Endesa ;
- mouvements de sécurité sociale / administration ;
- aide agricole Junta de Andalucía ;
- commissions bancaires.

Le solde figurant sur l'extrait au **09/04/2019** est **20 949,19 €**. Cette valeur est un solde bancaire à une date donnée ; elle ne doit pas être présentée comme « argent de la Finca » sans ventilation de l'origine des fonds.

## Règles de pilotage

Dans le logiciel :

- `MOUVEMENT_FAMILIAL` reste séparé de `MAISON`, `AGRICULTURE`, `FISCAL` et `SUCCESSION` ;
- une **grille tarifaire** n'est jamais transformée automatiquement en frais réellement payés ;
- un **solde de compte** ne devient pas automatiquement un actif de la Finca ;
- un transfert familial identifiable n'est pas utilisé pour reconstituer les dépenses d'exploitation.
