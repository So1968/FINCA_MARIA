# San Juan — flux Cliente 2015-2020 : rapprochements

Mise à jour : 23/08/2026

## Objet

Isoler strictement les opérations où la famille apparaît comme **Cliente** de S.C.A. Agrícola San Juan, sans les mélanger avec les `Facturas Recibidas` côté **Proveedor / Socio-Proveedor**.

Les références sont rapprochées par date, numéro de facture et libellé du compte coopérative. Les données issues d'anciennes extractions restent `[P-ANT/OCR]` lorsqu'un original n'a pas été relu dans la passe actuelle.

Règle : `Cliente = achat / produit / service possible`, à qualifier par la référence de facture ; ne jamais mélanger avec les repartos et liquidations fournisseur.

---

## 2015

### Facture 1329 Q — rapprochement fermé

`LISTADO DE DOCUMENTOS` côté Cliente :

- date : **30/04/2015** ;
- type : `FACTURA` ;
- document : **1329 Q** ;
- base OCR : **26,35 €**.

Extrait du compte coopérative :

- même référence : **1329 Q** ;
- libellé : **VENTA QUIMICA** ;
- montant : **28,99 €**.

Contrôle `[C]` : 26,35 × 1,10 = 28,99 € après arrondi.

Statut : `CLIENTE_1329Q = VENTA_QUIMICA — RAPPROCHEMENT_REFERENCE_MONTANT_FORT`.

Nature autorisée : **achat de produit chimique / fourniture coopérative**.

Achat ne prouve pas application sur la Finca.

### Facture 2784 P — second rapprochement Cliente

`LISTADO DE DOCUMENTOS` côté Cliente :

- date : **08/07/2015** ;
- type : `FACTURA` ;
- document : **2784 P** ;
- montant détaillé tronqué dans l'OCR disponible.

Extrait du compte coopérative :

- même référence : **2784 P** ;
- libellé : **VTA. ACEITE** ;
- montant visible dans l'extraction antérieure : **60,01 €**.

Statut : `CLIENTE_2784P = VTA_ACEITE — RAPPROCHEMENT_REFERENCE_FORT ; BASE_TVA_A_REEXTRAIRE`.

Nature autorisée : **achat / vente d'huile par la coopérative au client**, distinct d'un reparto de production.

Ne pas confondre cette vente d'huile au client avec les kilos d'huile issus de la campagne.

---

## 2016

### Facture 9211 P — achat coop documenté, raccord au listado encore ouvert

Extrait du compte coopérative :

- date : **03/11/2016** ;
- référence : **9211 P** ;
- libellé : **VTA. REPUESTO** ;
- montant : **18,39 €**.

Cette ligne est économiquement du côté achat / client.

Cependant, la version OCR actuellement récupérée du `LISTADO DE DOCUMENTOS` 2015 → 26/06/2020 est tronquée après les premières lignes 2015. La référence 9211 P n'a donc pas encore été retrouvée directement dans le listado Cliente.

Statut : `ACHAT_COOP_2016_9211P_DOCUMENTE — RAPPROCHEMENT_LISTADO_CLIENTE_A_FAIRE`.

Ne pas promouvoir comme correspondance listado tant que la ligne n'est pas retrouvée sur le document Cliente.

---

## 2017-2020 — limite documentaire explicitement verrouillée

Le `LISTADO DE DOCUMENTOS` côté Cliente couvre théoriquement **01/01/2015 → 26/06/2020**, mais toutes les copies textuelles actuellement retrouvées dans la bibliothèque sont **tronquées après les premières lignes 2015**.

Une recherche spécifique a été menée sur les anciens extraits de compte coopérative avec les libellés :

- `VENTA` ;
- `VTA.` ;
- `QUIMICA` ;
- `REPUESTO` ;
- `ABONO` ;
- ainsi que des recherches par année 2017, 2018, 2019 et 2020.

### Résultat de la passe

Le principal extrait ancien exploitable retrouvé (`CamScanner 14-08-2026 21.30_16` et copies OCR voisines) documente la fin de 2016 et va jusqu'au mouvement du **02/01/2017** :

- 03/11/2016 — **9211 P — VTA. REPUESTO — 18,39 €** ;
- 02/01/2017 — bascule vers la ligne Proveedor **n°296 — LIQUIDACION CPNA**.

Aucune série suffisamment complète d'opérations `VTA./VENTA` 2017-2020 n'a été retrouvée dans les extraits actuellement accessibles.

### Ce que cette absence signifie

Statut : `CORPUS_CLIENTE_2017_2020_INCOMPLET`.

Elle signifie uniquement : **les pièces actuellement récupérées ne permettent pas de reconstituer les achats Cliente 2017-2020**.

Elle ne signifie surtout pas :

- absence d'achats ;
- absence de produits ;
- absence de factures ;
- montant annuel nul.

Aucun total annuel Cliente 2016, 2017, 2018, 2019 ou 2020 n'est donc promu.

---

## Clé de méthode désormais validée

| Date | Sens | Référence | Libellé / nature | Montant | Statut |
|---|---|---|---|---:|---|
| 30/04/2015 | Cliente | 1329 Q | VENTA QUIMICA | 28,99 € | rapprochement fort |
| 08/07/2015 | Cliente | 2784 P | VTA. ACEITE | 60,01 € | rapprochement fort ; base/TVA à relire |
| 03/11/2016 | achat coop, Cliente probable | 9211 P | VTA. REPUESTO | 18,39 € | compte documenté ; listado à retrouver |

La méthode à appliquer ensuite est :

`ligne Cliente → numéro facture → même numéro dans extracto → libellé économique → facture détaillée si disponible → paiement / compensation`.

Cette chaîne reste totalement distincte de :

`Proveedor → reparto / liquidation → compensation agricole → retenue → paiement`.

---

## Pièces réellement manquantes pour fermer 2017-2020

Il faut obtenir au moins l'un des ensembles suivants :

1. le **`LISTADO DE DOCUMENTOS` Cliente complet 2015 → 26/06/2020**, non tronqué ;
2. les **extraits détaillés du compte coopérative** 2017, 2018, 2019 et janvier-juin 2020 ;
3. les factures Cliente individuelles correspondantes.

Une fois ces pièces obtenues, le croisement se fera par numéro de facture et non par estimation.

## Prochaine action exacte

Tant qu'aucune nouvelle pièce Cliente n'arrive, **ne pas refaire la même recherche en boucle**.

Poursuivre l'audit sur les couches qui disposent encore de données exploitables :

- Proveedor 2019-2022 ;
- listados annuels 2016 / 2018 à relecture directe ;
- raccordements campagnes / repartos / liquidations / paiements.
