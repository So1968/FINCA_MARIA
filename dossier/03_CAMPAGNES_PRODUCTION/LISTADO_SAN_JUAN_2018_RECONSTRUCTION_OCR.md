# San Juan — Listado de Facturas Recibidas 2018 — reconstruction OCR prudente

Mise à jour : 23/08/2026

## Objet

Documenter la lecture du scan retourné `CamScanner 14-08-2026 21.17_8.jpg` sans transformer une inversion OCR en preuve visuelle définitive.

Niveau : `[P-ANT/OCR]` pour l'existence du scan et son texte OCR ; `[C]` pour la reconstruction par inversion.

---

## 1. Pourquoi le scan était illisible

L'image est tournée / inversée. L'OCR brut restitue notamment :

- `8102/60/50` ;
- `BLOZISO/LZ` ;
- `BLOZ/LO/ZO` ;
- une séquence `167 0 167`.

En renversant l'ordre des caractères, les dates deviennent lisibles ou quasi lisibles.

---

## 2. Dates reconstruites

### 05/06/2018 — robuste

`8102/60/50` inversé donne directement **05/06/2018**.

Cette date est considérée comme la reconstruction OCR la plus forte de la page.

### 27/05/2018 — probable

La séquence `BLOZISO/LZ`, lue à l'envers et en tenant compte des confusions de glyphes d'une image retournée (`B≈8`, `L≈1/7`, `O≈0`, `Z≈2`), est compatible avec **27/05/2018**.

Statut : `DATE_PROBABLE_A_CONTROLER_VISUELLEMENT`.

### 02/01/2018 — probable à forte

La séquence `BLOZ/LO/ZO` est compatible après inversion avec **02/01/2018**.

Statut : `DATE_PROBABLE_FORTE_A_CONTROLER_VISUELLEMENT`.

---

## 3. Document n°761 — candidat fort sur la ligne du 05/06

Après inversion du texte OCR, la séquence apparaît sous la forme :

`... NIF ... 761 0 761 ...`

Dans les listados lisibles des autres années, cette position correspond aux colonnes `Factura / Canal / Documento`.

Conclusion autorisée :

- **05/06/2018 — document 761** est un **candidat OCR fort**.

Conclusion interdite :

- présenter 761 comme numéro définitivement contrôlé sur l'image ;
- lui attribuer un montant ou une nature sans pièce concordante.

Aucune facture/liquidation portant la référence 761 n'a encore été retrouvée de façon suffisamment forte dans les autres extractions.

Statut : `DOC761_CANDIDAT_FORT_OCR — NON_PROMU_COMME_PREUVE_VISUELLE`.

---

## 4. Nombre d'écritures probable

Le scan laisse apparaître trois couples de dates correspondant vraisemblablement à **trois écritures** :

1. 02/01/2018 ;
2. 27/05/2018 ;
3. 05/06/2018.

Cette structure reste `[C/OCR]` jusqu'à rotation et relecture visuelle de l'original.

---

## 5. Lien avec la campagne 2017/18

Un groupe documentaire San Juan distinct est déjà établi pour la campagne 2017/18 :

- **4 008 kg d'olives** ;
- **851,60 kg d'huile** ;
- rendement calculé ≈ **21,25 %** ;
- un récapitulatif ancien le décrit comme `Primer reparto 2017/2018` ;
- période du premier reparto : **01/11/2017 → 17/05/2018**.

La date probable **27/05/2018** du listado serait chronologiquement compatible avec l'émission d'une facture/reparto après la fin de période du 17/05.

Mais : **aucun numéro de facture commun n'est encore retrouvé**, donc ce rapprochement reste une hypothèse `[C]`.

Le candidat **761 du 05/06/2018** n'est pas automatiquement le premier reparto.

---

## 6. Ce qui est désormais acquis / non acquis

### Acquis au niveau OCR

- le scan appartient très probablement à l'année **2018** ;
- **05/06/2018** est lisible après inversion ;
- **02/01/2018** et **27/05/2018** sont des reconstructions plausibles ;
- `761` apparaît à l'emplacement d'un numéro de facture/document sur la ligne 05/06.

### Non acquis

- montants ligne par ligne ;
- base / compensation / retenue ;
- numéro des lignes 02/01 et 27/05 ;
- nature exacte des trois écritures ;
- raccord du listado au groupe 4 008 / 851,60 ;
- total annuel.

---

## 7. Prochaine action exacte

1. tourner physiquement / numériquement l'image originale ;
2. relire les trois lignes : date, facture, document, base, compensation, retenue, total ;
3. rechercher chaque numéro dans les pièces `21.30` et les extraits du compte coopérative ;
4. tester le rapprochement du 27/05 avec le `Primer reparto 2017/2018` ;
5. ne produire aucun total 2018 tant que ces contrôles ne sont pas faits.
