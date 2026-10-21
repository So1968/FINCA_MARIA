# San Juan — clés de rapprochement Proveedor 2019-2022

Mise à jour : 23/08/2026

## Objet

Préparer les recherches de pièces concordantes pour les `Listados de Facturas Recibidas` 2019-2022, sans transformer les calculs en données officielles.

Règle : les valeurs `[C]` ci-dessous servent uniquement de clés de recherche dans les extraits / liquidations. Elles ne remplacent jamais le scan original.

---

## 2019

`Listado de Facturas Recibidas` :

- période : 01/01/2019 → 31/12/2019 ;
- **1 enregistrement** ;
- date : **02/01/2019** ;
- document : **286** ;
- base OCR : **819,05 €** ;
- compensation OCR : **98,29 €**.

Contrôle `[C]` :

- 819,05 × 12 % = **98,29 €** après arrondi ;
- base + compensation = **917,34 €** ;
- retenue 2 % théorique sur 917,34 € = **18,35 €** ;
- net théorique = **898,99 €**.

L'OCR du listado contient d'ailleurs une séquence compatible avec `18,35` dans la colonne de retenue, mais le scan doit être contrôlé avant promotion.

### Non-raccord à préserver

Le paiement bancaire du **19/02/2020**, S.C.A. Agrícola San Juan, **590,91 €**, concept `LIQ CAMPAÑA 18/2019`, ne correspond ni au brut calculé 917,34 € ni au net calculé 898,99 €.

Conclusion autorisée : **les deux éléments concernent l'univers San Juan / campagne 18/19, mais aucune identité d'écriture n'est prouvée**.

Ne pas fusionner document 286 et paiement 590,91 € sans référence coopérative concordante ou explication d'avances / compensations.

Statut : `DOC286_MECANISME_12_PCT_COHERENT — RAPPROCHEMENT_PAIEMENT_NON_ETABLI`.

---

## 2020

Le listado retrouvé couvre seulement **01/01/2020 → 26/06/2020**.

Dates visibles au moins :

- 02/01/2020 ;
- 01/05/2020 ;
- 05/05/2020.

Les montants / numéros sont trop tronqués dans l'extraction actuellement disponible pour créer des clés fiables.

Statut : `2020_PERIODE_PARTIELLE — AUCUN_TOTAL_ANNUEL — SECOND_SEMESTRE_A_CHERCHER`.

---

## 2021

Première ligne du listado annuel :

- date : **02/01/2021** ;
- base OCR : **677,00 €** ;
- compensation OCR : **81,24 €**.

Contrôle `[C]` :

- 677,00 × 12 % = **81,24 €** exactement ;
- brut théorique = **758,24 €** ;
- retenue 2 % théorique = **15,16 €** ;
- net théorique = **743,08 €**.

Ces valeurs sont des **clés de recherche**, pas des montants officiels promus.

Aucune pièce concordante par numéro de document / montant n'a encore été retrouvée dans les extractions disponibles.

Statut : `2021_MECANISME_12_PCT_COHERENT — REFERENCE_DOCUMENT_A_REEXTRAIRE`.

---

## 2022

Première ligne du listado :

- date : **02/01/2022** ;
- document : **259** ;
- base OCR actuelle : **238,50 €** ;
- compensation OCR actuelle : **28,38 €**.

### Incohérence OCR ciblée

- 12 % de 238,50 € = **28,62 €**, pas 28,38 € ;
- **28,38 € correspond exactement à 12 % de 236,50 €**.

Hypothèse `[C/OCR]` : la base pourrait être **236,50 €** et l'OCR avoir confondu un `6` avec un `8`.

**Interdiction de corriger la base sans contrôle visuel du scan.**

Statut : `2022_DOC259 — BASE_238_50_OCR ; 236_50_CIBLE_DE_CONTROLE_VISUEL ; AUCUNE_CORRECTION_EFFECTUEE`.

---

## 2018 — rappel séparé

L'OCR retourné du scan annuel permet désormais de lire de façon robuste la date **05/06/2018** après inversion du texte. Une séquence ressemblant à **761** apparaît comme numéro candidat, mais aucune pièce concordante assez forte n'est actuellement retrouvée.

Statut : `2018_DATE_05_06_2018_OCR_RECONSTRUITE — NUMERO_761_CANDIDAT_NON_PROMU`.

---

## Clés de recherche actuelles

| Année | Référence / date | Base | 12 % | Brut calculé | Net théorique | État |
|---|---|---:|---:|---:|---:|---|
| 2019 | doc 286 — 02/01/2019 | 819,05 € | 98,29 € | 917,34 € | 898,99 € | chercher liquidation / compte ; ne pas confondre avec 590,91 € |
| 2020 | 02/01, 01/05, 05/05 | — | — | — | — | extraction insuffisante / année incomplète |
| 2021 | 02/01/2021 | 677,00 € | 81,24 € | 758,24 € | 743,08 € | référence doc à retrouver |
| 2022 | doc 259 — 02/01/2022 | 238,50 € OCR | 28,38 € OCR | incohérent | — | contrôler si base réelle 236,50 € |

## Prochaine action exacte

1. rechercher les références / montants calculés dans les extraits de compte coopérative ;
2. retrouver les numéros de documents manquants 2020 et 2021 ;
3. contrôler visuellement le document 259 de 2022 ;
4. ne relier le paiement bancaire 590,91 € de 2020 à une écriture précise qu'avec une référence concordante.
