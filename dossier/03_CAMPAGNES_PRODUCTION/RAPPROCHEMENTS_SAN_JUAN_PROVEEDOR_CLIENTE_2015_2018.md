# San Juan — rapprochements Proveedor / Cliente 2015-2018

Mise à jour : 23/08/2026

## Objet

Cette fiche complète la matrice `MATRICE_SAN_JUAN_2015_2022_PROVEEDOR_CLIENTE.md` avec des rapprochements de références entre :

- les `Listados de Facturas Recibidas` côté **Proveedor / Socio-Proveedor** ;
- les `Listado de Documentos` côté **Cliente** ;
- les factures / liquidations individuelles San Juan ;
- les extraits du compte coopérative.

Les originaux n'ont pas été ré-OCRisés. Les rapprochements ci-dessous utilisent des extractions antérieures déjà indexées. Ils restent donc `[P-ANT/OCR]` lorsqu'un original n'a pas été relu dans la passe actuelle.

Règle : une concordance de date + numéro de document + montant peut qualifier la nature d'une écriture, mais ne prouve pas la complétude de la campagne.

---

## 1. Côté Proveedor — mécanisme désormais documenté

Les pièces individuelles anciennes montrent explicitement le schéma :

`base imposable → compensation agricole 12 % → total base + compensation → retenue 2 % → net`

Une liquidation 2016/17 porte :

- base : **234,16 €** ;
- compensation régime agricole à 12 % : **28,10 €** ;
- total base + compensation : **262,26 €** ;
- retenue 2 % : **-5,25 €** ;
- total net : **257,01 €** ;
- mention d'inclusion dans le régime spécial agricole.

Statut : `[P-ANT/OCR] MECANISME_FOURNISSEUR_AGRICOLE_DOCUMENTE`.

Cela renforce fortement l'interprétation des colonnes des `Listados de Facturas Recibidas` : les écritures Proveedor ne sont pas des achats d'intrants par la famille.

---

## 2. 2015 — trois lignes Proveedor raccordées par date + deux achats Cliente

Le listado annuel 2015 contient cinq dates : **02/01, 10/04, 15/06, 04/08, 31/10/2015**.

Les deux dates extrêmes, 02/01 et 31/10, restent sans référence concordante fiable dans le corpus actuellement exploitable.

### 2.1 Proveedor — 10/04/2015 — document n°1233

Pièce individuelle : `1ER. REPARTO CPÑA 14/15`.

- date : **10/04/2015** ;
- document : **1233** ;
- campagne : **2014/15** ;
- olives : **1 556 kg** ;
- huile : **320,34 kg** ;
- rendement : **20,59 %** ;
- base imposable : **192,20 €**.

Compte coopérative :

- `S/FRA N°1233.1ER. REPARTO CPÑA` : **215,26 €** ;
- retenue : **4,31 €** ;
- net : **210,95 €**.

Calcul `[C]` : 192,20 + 12 % = 215,26 € ; retenue 2 % ≈ 4,31 €.

Statut : `RAPPROCHEMENT_FORT_PAR_DATE_ET_PIECE — NUMERO_DANS_LISTADO_A_CONTROLER`.

### 2.2 Proveedor — 15/06/2015 — document n°2142

Pièce individuelle : `2° REPARTO CPÑA 14/15`.

- date : **15/06/2015** ;
- document : **2142** ;
- olives : **1 556 kg** ;
- huile : **320,34 kg** ;
- rendement : **20,59 %** ;
- base : **160,17 €**.

Compte coopérative :

- `S/FRA N°2142.2° REPARTO CPÑA` : **179,39 €** ;
- retenue : **3,59 €** ;
- net calculé `[C]` : **175,80 €**.

Statut : `RAPPROCHEMENT_FORT_PAR_DATE_ET_PIECE — NUMERO_DANS_LISTADO_A_CONTROLER`.

### 2.3 Proveedor — 04/08/2015 — document n°2957

Pièce individuelle : `3ER. REPARTO CPÑA 14/15`.

- date : **04/08/2015** ;
- document : **2957** ;
- olives : **1 556 kg** ;
- huile : **320,34 kg** ;
- rendement : **20,59 %** ;
- base : **192,20 €**.

Le compte coopérative contient la référence `S/FRA N°2957.3ER. REPARTO CPÑA` et sa retenue associée.

Statut : `RAPPROCHEMENT_FORT_PAR_DATE_ET_PIECE — LIGNE_COMPTE_COMPLETE_A_REEXTRAIRE`.

### 2.4 Conséquence capitale : les kilos des repartos ne s'additionnent pas

Les trois repartos 1233 / 2142 / 2957 reprennent **exactement les mêmes 1 556 kg d'olives et 320,34 kg d'huile**.

Ils représentent des étapes financières successives, pas trois récoltes distinctes.

Statut : `PRECEDENT_DOCUMENTAIRE_FORT — REPARTOS_NON_ADDITIFS_SUR_KILOS`.

Voir `CAMPAGNE_2014_2015_REPARTOS_1233_2142_2957.md`.

### 2.5 Cliente — document 1329 Q, 30/04/2015

`LISTADO DE DOCUMENTOS` côté Cliente :

- date : **30/04/2015** ;
- document : **1329 Q** ;
- base OCR : environ **26,35 €**.

Compte coopérative :

- même référence **1329 Q** ;
- libellé : **VENTA QUIMICA** ;
- montant : **28,99 €**.

Calcul `[C]` : 26,35 × 1,10 = 28,99 € après arrondi.

Statut : `CLIENTE_1329Q_VENTA_QUIMICA — RAPPROCHEMENT_REFERENCE_MONTANT_FORT`.

### 2.6 Cliente — document 2784 P, 08/07/2015

`LISTADO DE DOCUMENTOS` côté Cliente :

- date : **08/07/2015** ;
- document : **2784 P**.

Compte coopérative :

- même référence **2784 P** ;
- libellé : **VTA. ACEITE** ;
- montant : **60,01 €**.

Statut : `CLIENTE_2784P_VTA_ACEITE — RAPPROCHEMENT_REFERENCE_FORT ; BASE_TVA_A_REEXTRAIRE`.

Ces deux exemples prouvent concrètement que `Cliente` est un sens économique distinct du `Proveedor`.

---

## 3. 2016 — chaîne Proveedor 1194 / 2040 / 2946

Le scan annuel 2016 du lot 21.17 est localisé dans le Baúl privé mais n'est pas encore relu directement dans cette passe. En revanche, les trois repartos de campagne sont désormais identifiés par pièces individuelles et/ou extrait du compte.

### 3.1 Premier reparto — n°1194 — 14/04/2016

- concept : `1ER. REPARTO CPÑA 15/16` ;
- **9 064 kg** d'olives dans l'ancienne extraction ;
- brut : **742,21 €** ;
- retenue compte : **14,84 €** ;
- net calculable : **727,37 €**.

La concordance date + référence + concept + brut + net est très forte.

Statut : `RAPPROCHEMENT_TRES_FORT_9064KG = REPARTO_1194`.

### 3.2 Deuxième reparto — n°2040 — 06/06/2016

La pièce individuelle est repérée : `CamScanner 14-08-2026 21.30_23.jpg`.

- date : **06/06/2016** ;
- n° **2040** ;
- concept : `2° REPARTO CPÑA 15/16` ;
- période débute au **01/11/2015** ;
- kilos / huile / rendement encore tronqués dans l'extraction récupérée ;
- brut compte : **556,67 €** ;
- retenue : **11,13 €** ;
- net de l'opération : **545,54 €**.

Statut : `REPARTO_2040_PIECE_IDENTIFIEE + FINANCIER_DOCUMENTE — KILOS_HUILE_A_REEXTRAIRE`.

### 3.3 Troisième reparto — n°2946 — 19/09/2016

- **3 854 kg** olives ;
- **828,37 kg** huile ;
- **21,49 %** ;
- base **497,03 €** ;
- compensation 12 % calculable **59,64 €** ;
- brut **556,67 €** ;
- retenue **11,13 €** ;
- net **545,54 €**.

Statut : `CHAINE_2946_TRES_FORTE`.

### 3.4 Lecture actuelle du conflit 9 064 / 3 854

Le conflit n'est plus un conflit d'identité documentaire : **9 064 kg appartient très probablement au 1er reparto n°1194** et **3 854 kg au 3e reparto n°2946**.

La question devient : quelle base de kilos chaque reparto reprend-il ?

Le précédent 2014/15 prouve que des repartos successifs peuvent répéter la même base de kilos. De plus, 2040 et 2946 ont exactement le même brut et la même retenue.

**Interdiction de faire 9 064 + 3 854.**

Voir `CAMPAGNE_2015_2016_REPARTOS_1194_2040_2946.md`.

---

## 4. 2017 — premier raccord direct listado → liquidation

`Listado de Facturas Recibidas` 2017, première ligne :

- date : **02/01/2017** ;
- document : **296** ;
- base OCR : **755,49 €** ;
- compensation OCR : environ **90,6 €**.

Calcul `[C]` :

- 755,49 × 12 % = **90,66 €** ;
- brut = **846,15 €**.

Compte coopérative :

- même date **02/01/2017** ;
- même référence **N°296** ;
- libellé : **LIQUIDACION CPNA** ;
- montant : **846,15 €**.

Statut : `PROVEEDOR_2017_DOC296 = LIQUIDACION_CPNA — RAPPROCHEMENT_DATE_REFERENCE_MONTANT_FORT`.

Le listado contient également :

- **02/05/2017 — document 1248** ;
- **06/06/2017 — autre ligne dont la référence reste tronquée**.

Aucun rapprochement assez fort n'est encore retrouvé pour ces deux lignes. Ne pas leur attribuer artificiellement une nature.

---

## 5. Campagne 2016/17 — groupe primaire distinct

Un groupe de pièces individuelles San Juan documente la campagne 2016/17 :

- **1 722 kg** olives ;
- **390,26 kg** huile ;
- rendement calculable ≈ **22,66 %** ;
- une pièce du 19/09/2017 porte base **234,16 €**, compensation 12 % **28,10 €**, brut **262,26 €**, retenue **5,25 €**, net **257,01 €**.

Un extrait de vales séparé porte **1 056 kg** et reste distinct.

Statut : `[P-ANT] GROUPE_2016_17_DOCUMENTE — NE_PAS_FUSIONNER_AUTOMATIQUEMENT_AVEC_VALES`.

Les lignes civiles du listado 2017 ne sont pas encore toutes rattachées à ce groupe.

---

## 6. 2018 — attribution annuelle renforcée, raccord encore ouvert

Le scan `CamScanner 14-08-2026 21.17_8.jpg` est retourné / OCRisé à l'envers.

Après inversion du texte OCR :

- la date **05/06/2018** ressort de façon robuste ;
- un numéro ressemblant fortement à **761** apparaît comme candidat de document ;
- d'autres séquences semblent compatibles avec **02/01/2018** et **27/05/2018**, mais restent moins sûres.

Aucune pièce de compte concordante assez forte n'a encore été retrouvée pour le candidat `761`.

Statut : `2018_ATTRIBUTION_OCR_FORTEMENT_SOUTENUE — DOC761_CANDIDAT_NON_PROMU — MONTANTS_A_RELECTURE_VISUELLE`.

---

## 7. Campagne 2017/18 — groupe 4 008 kg isolé

Deux pièces individuelles déjà regroupées dans l'audit ancien documentent :

- **4 008 kg** olives ;
- **851,60 kg** huile ;
- rendement calculé `[C]` ≈ **21,25 %** ;
- base reprise par l'audit : **596,13 €** ;
- net : **654,32 €**.

Un ancien récapitulatif décrit ces mêmes kilos comme **Primer reparto 2017/2018**, période allant jusqu'au 17/05/2018.

Le mécanisme 12 % + retenue 2 % retombe arithmétiquement sur le net de 654,32 €, ce qui renforce la cohérence fournisseur.

Mais **aucun numéro de document n'est encore raccordé au listado 2018 retourné**.

Voir `CAMPAGNE_2017_2018_REPARTO_4008KG.md`.

---

## 8. Reconstruction de l'ordre du lot 21.17

Le rapport V40 répartit les 12 images du lot en :

- 2022 : 2 fichiers ;
- 2021 : 1 ;
- 2020 : 2 ;
- 2019 : 2 ;
- 2017 : 1 ;
- 2016 : 1 ;
- 2015 : 2 ;
- année à vérifier : 1.

Les pages déjà identifiées donnent :

- 1–2 : 2022 ;
- 3 : 2021 ;
- 5 : 2020 ;
- 6 : 2019 ;
- 8 : année à vérifier, très probablement 2018 ;
- 9 : 2017 ;
- 11 : listado Proveedor 2015 ;
- 12 : listado Cliente multiannuel démarrant en 2015.

Par élimination ordonnée `[C]`, la reconstruction la plus cohérente est :

- **4–5 = 2020** ;
- **6–7 = 2019** ;
- **8 = 2018 probable** ;
- **10 = 2016**.

Cette reconstruction n'est pas une preuve primaire.

---

## 9. Conséquence méthodologique

La séparation Proveedor / Cliente est désormais confirmée non seulement par les en-têtes, mais par des exemples référencés :

- **Proveedor** : 1233 / 2142 / 2957 / 1194 / 2040 / 2946 / 296 → repartos / liquidation ;
- **Cliente** : 1329 Q → `VENTA QUIMICA` ; 2784 P → `VTA. ACEITE` ;
- achat coop 2016 déjà repéré : 9211 P → `VTA. REPUESTO`, raccord au listado Cliente encore ouvert.

Règle de poursuite :

`Proveedor → numéro facture → reparto/liquidation → compensation → retenue → mouvement/paiement`

`Cliente → numéro facture → vente coop / produit / service → paiement ou compensation`

Aucun total annuel ne mélange ces deux sens.

## Prochaine action exacte

1. obtenir la ligne complète de la pièce **2040** pour ses kilos / huile / rendement ;
2. relire directement le listado **2016** page 10 ;
3. tourner / relire visuellement le listado **2018** et tester le candidat n°761 ;
4. extraire toutes les lignes Cliente du document 12, de 2015 au 26/06/2020 ;
5. utiliser les numéros de document comme clé de rapprochement avec les extraits coopérative ;
6. garder 02/01/2015 et 31/10/2015 ouverts tant qu'aucune référence concordante n'est retrouvée.
