# San Juan — campagne 2016/17 — repartos et liquidation

Mise à jour : 23/08/2026

## Objet

Réconcilier les pièces de la campagne 2016/17 avec le `Listado de Facturas Recibidas` 2017, sans additionner plusieurs fois les mêmes kilos.

Niveaux : `[P-ANT]` pièces primaires identifiées dans les audits antérieurs ; `[OCR]` lecture OCR ; `[C]` rapprochement/calcul.

Règle absolue : **des repartos successifs peuvent reprendre la même base physique. Les kilos ne sont pas additionnés entre repartos sans preuve contraire.**

---

## 1. Base physique commune documentée

L'ancien audit regroupe quatre pièces `CamScanner 14-08-2026 21.30_10.jpg` à `_13.jpg` dans la campagne 2016/17 avec :

- **1 722 kg d'olives** ;
- **390,26 kg d'huile** ;
- rendement calculable **22,66 %** ;
- plusieurs liquidations/repartos successifs.

Un extrait de vales séparé (`_14`) porte **1 056 kg** et reste **séparé** : aucun cumul n'est autorisé sans preuve que les deux groupes sont des apports distincts additionnables.

Statut : `[P-ANT] GROUPE_1722_39026_DOCUMENTE — VALES_1056_SEPARES`.

---

## 2. Premier reparto — période jusqu'au 28/04/2017

Un ancien récapitulatif San Juan indique :

- période : **01/11/2016 → 28/04/2017** ;
- concept : **Primer reparto 2016/2017** ;
- olives : **1 722 kg** ;
- prix olive : **0,2031** ;
- prix huile : **0,8960**.

L'audit de groupe conserve également pour une des pièces 2016/17 :

- base / `grossLiquidation` reprise : **312,20 €** ;
- net à percevoir : **342,67 €**.

Contrôle arithmétique `[C]` avec le mécanisme REAGP déjà documenté :

- base : 312,20 € ;
- compensation 12 % : **37,46 €** ;
- brut : **349,66 €** ;
- retenue 2 % : **6,99 €** ;
- net : **342,67 €**.

Le `Listado de Facturas Recibidas` annuel 2017 contient une ligne :

- **02/05/2017** ;
- document **1248**.

La proximité chronologique (fin de période 28/04 → facture 02/05) et la position dans la séquence annuelle rendent le rapprochement **doc 1248 = 1er reparto 2016/17 très plausible**, mais le numéro n'a pas encore été relu directement sur la pièce individuelle `_10`.

Statut : `RAPPROCHEMENT_FORT_NON_FERME — DOC1248_CANDIDAT_1ER_REPARTO ; NUMERO_SUR_PIECE_A_CONTROLER`.

---

## 3. Deuxième reparto — 06/06/2017

Pièce individuelle `CamScanner 14-08-2026 21.30_11.jpg` :

- date : **06/06/2017** ;
- campagne : **2016/17** ;
- période du récapitulatif : **01/11/2016 → 31/05/2017** ;
- olives : **1 722 kg** ;
- huile : **390,26 kg** ;
- rendement : **22,66 %** ;
- base : **234,16 €** ;
- compensation 12 % : **28,10 €** ;
- brut : **262,26 €** ;
- retenue 2 % : **5,25 €** ;
- net : **257,01 €**.

Le listado 2017 contient précisément une ligne au **06/06/2017**, mais le numéro de document est tronqué dans l'OCR disponible.

Statut : `2E_REPARTO_DATE_ET_MONTANTS_DOCUMENTES — NUMERO_LISTADO_A_REEXTRAIRE`.

---

## 4. Troisième reparto — 19/09/2017

Pièce individuelle `CamScanner 14-08-2026 21.30_12.jpg` :

- date : **19/09/2017** ;
- période : **01/11/2016 → 19/09/2017** ;
- olives : **1 722 kg** ;
- huile : **390,26 kg** ;
- rendement : **22,66 %** ;
- base : **234,16 €** ;
- compensation 12 % : **28,10 €** ;
- brut : **262,26 €** ;
- retenue : **5,25 €** ;
- net : **257,01 €**.

Le 2e et le 3e reparto reprennent donc **exactement la même base physique et les mêmes montants**.

Statut : `3E_REPARTO_DOCUMENTE — REPARTOS_NON_ADDITIFS_CONFIRME_ENCORE_UNE_FOIS`.

---

## 5. Liquidation finale 2016/17

Le récapitulatif ancien contient également une ligne `Liquidacion campana 2016/2017` après les repartos. L'OCR de cette ligne est partiellement brouillé et ne permet pas encore de promouvoir proprement toutes ses colonnes.

L'une des quatre pièces `_10` à `_13` est vraisemblablement cette liquidation finale ; par ordre documentaire, `_13` est un candidat logique, mais **cette attribution n'est pas promue sans lecture directe de son en-tête**.

Statut : `LIQUIDATION_FINALE_EXISTENCE_DOCUMENTEE_PAR_RECAP — PIECE_EXACTE_ET_MONTANTS_A_CONTROLER`.

---

## 6. Raccord avec le listado annuel 2017

État actuel :

| Date listado | N° listado | Raccord campagne 2016/17 | Statut |
|---|---:|---|---|
| 02/01/2017 | **296** | `LIQUIDACION CPNA`, montant 846,15 € dans le compte ; campagne exacte encore à verrouiller | raccord direct fort |
| 02/05/2017 | **1248** | très probablement **1er reparto 2016/17** (période finissant 28/04) | fort mais n° sur pièce individuelle à contrôler |
| 06/06/2017 | tronqué | **2e reparto 2016/17** | date + pièce + montants documentés |
| 19/09/2017 | ligne potentiellement hors coupure OCR du listado | **3e reparto 2016/17** | pièce primaire ancienne identifiée ; présence dans listado à vérifier |

Le doc296 du 02/01/2017 reste séparé : sa nature `LIQUIDACION CPNA` est forte, mais il ne doit pas être automatiquement assimilé à la liquidation finale 2016/17 tant que la campagne explicitement portée par la pièce n'est pas relue.

---

## 7. Conséquence méthodologique

La campagne 2016/17 fournit un **deuxième précédent massif** après 2014/15 :

- 2e reparto : 1 722 kg / 390,26 kg ;
- 3e reparto : 1 722 kg / 390,26 kg ;

Donc additionner les kilos des repartos aurait encore produit un faux double comptage.

La bonne unité physique de travail est le **groupe de production documenté**, pas la somme des lignes financières successives.

---

## 8. Prochaine action exacte

1. relire l'en-tête de `_10` pour confirmer le numéro de facture du 1er reparto et tester **1248** ;
2. relire le numéro de `_11` et vérifier la ligne 06/06 du listado ;
3. relire `_13` pour identifier la liquidation finale ;
4. ne fusionner le groupe de vales **1 056 kg** avec les **1 722 kg** qu'avec preuve de complémentarité ;
5. conserver les repartos comme étapes financières non additives.
