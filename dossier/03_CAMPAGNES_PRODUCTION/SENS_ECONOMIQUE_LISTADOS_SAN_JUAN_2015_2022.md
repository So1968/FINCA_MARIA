# Sens économique des listados San Juan 2015-2022

Mise à jour : 23/08/2026

## Pourquoi cette distinction est importante

Les scans OCRisés contiennent au moins **deux familles de documents différentes** qui ne doivent pas être mélangées :

1. `Listado de Facturas Recibidas` ;
2. `LISTADO DE DOCUMENTOS` avec filtre `Cliente`.

Le sens des flux n'est donc pas le même.

## 1. `Listado de Facturas Recibidas`

Dans les années 2015, 2017, 2019, 2020, 2021 et 2022, les documents affichent un filtre du type :

`Desde Proveedor ... hasta ...`

et le nom de María Serrano García puis, après la succession, María Josefa de los Rios Serrano apparaît dans la colonne **Proveedor / Socio-Proveedor**.

### Lecture autorisée

Du point de vue du logiciel de la coopérative, la personne familiale est ici enregistrée comme **fournisseur**.

Cela signifie que ces `Facturas Recibidas` sont des factures que **la coopérative enregistre comme reçues d'un fournisseur / sociétaire**, et non des factures d'achat de produits que la famille aurait nécessairement reçues de San Juan.

### Ce que cela peut représenter

Dans une coopérative agricole, ce type d'écriture peut être lié à la fourniture de production agricole, à des auto-factures / liquidations ou à d'autres écritures fournisseur.

**Mais l'intitulé seul ne permet pas de conclure que chaque ligne correspond directement à des kilos d'olives ou à une liquidation finale de campagne.** Il faut lier chaque ligne à la facture source / liquidation / apport.

Statut : `SENS_FOURNISSEUR_CONFIRME_PAR_ENTETE — NATURE_ECONOMIQUE_DETAILLEE_A_RATTACHER`.

### Indice fiscal REAGP — compensation agricole de 12 %

Une vérification externe sur les sources fiscales officielles espagnoles apporte un indice important, sans remplacer les pièces San Juan.

Le **Régimen Especial de la Agricultura, Ganadería y Pesca (REAGP)** prévoit, pour les produits naturels issus d'exploitations agricoles ou forestières, une **compensation forfaitaire de 12 %** du prix de vente. Le régime à 12 % est en vigueur depuis le 01/09/2012 et figure notamment dans la Ley 37/1992, art. 130.5, ainsi que dans les manuels IVA de l'Agencia Tributaria. L'acquéreur est normalement celui qui reverse cette compensation au producteur.

L'Agencia Tributaria indique en outre que, dans le **Libro Registro de Facturas Recibidas**, les opérations pour lesquelles un acheteur verse une compensation à un fournisseur relevant du REAGP sont enregistrées comme opérations de compensation agricole ; le pourcentage est porté comme type fiscal et le montant de compensation dans la colonne de quota supporté.

Cela est **compatible** avec la structure observée dans les listados San Juan côté `Proveedor`.

Contrôle arithmétique des valeurs OCR déjà extraites :

- 2017 : base ≈ **755,49 €** ; compensation / colonne fiscale ≈ **90,6 €** → environ **12 %** ;
- 2019 : base ≈ **819,05 €** ; montant ≈ **98,29 €** → environ **12 %** ;
- 2021 : base ≈ **677,00 €** ; montant **81,24 €** → **12 %** exactement ;
- 2022 : base OCR ≈ **238,50 €** et montant **28,38 €** ne donnent pas exactement 12 %. Cette ligne devient une **cible prioritaire de contrôle visuel** : une lecture de base à 236,50 € donnerait exactement 28,38 € à 12 %, mais **236,50 € n'est pas promu comme correction sans relecture du scan**.

Conséquence de méthode : les colonnes auparavant décrites prudemment comme `TVA / taxe` doivent être lues provisoirement comme **colonne fiscale / compensation à qualifier**. Le motif de 12 % renforce fortement l'hypothèse d'écritures liées à des livraisons agricoles par le sociétaire fournisseur, mais ne prouve pas à lui seul :

- que la marchandise est nécessairement de l'olive ;
- que la ligne correspond à toute une campagne ;
- qu'il s'agit d'une liquidation finale ;
- que les kilos figurent dans le même document ;
- que le montant a été payé par banque à la même date.

Statut renforcé : `PROVEEDOR_REAGP_COMPATIBLE — LIVRAISON_AGRICOLE_PROBABLE — PRODUIT_ET_CAMPAGNE_A_RATTACHER`.

Sources fiscales de contrôle : Agencia Tributaria, Manual IVA 2015 et documentation REAGP ; Ley 37/1992 art. 130 ; documentation AEAT du Libro Registro de Facturas Recibidas. Ces sources expliquent le mécanisme fiscal mais **ne constituent pas une preuve de la nature de chaque ligne San Juan**.

## 2. `LISTADO DE DOCUMENTOS` 2015 → 26/06/2020

Un autre document porte au contraire :

`Desde Cliente '0377' hasta 0377`

et liste des documents de type `FACTURA`, avec par exemple :

- 30/04/2015 — facture `1329 Q` ;
- 08/07/2015 — facture `2784 P`.

### Lecture autorisée

Ici, la personne familiale apparaît comme **cliente** de la coopérative.

Ces documents sont donc dans le sens économique inverse : ils peuvent correspondre à des **factures émises par la coopérative au client / sociétaire**, notamment achats de produits, fournitures ou services coopératifs.

Là encore, la nature précise doit être contrôlée sur chaque facture.

Statut : `SENS_CLIENT_CONFIRME_PAR_ENTETE — NATURE_PAR_FACTURE_A_EXTRAIRE`.

## Conséquence majeure pour FINCA MARIA

Il est interdit de mettre tous ces documentos dans une seule colonne `achats San Juan`.

Le modèle doit séparer au minimum :

| Sens | Document | Rôle famille dans le logiciel coop | Usage d'audit |
|---|---|---|---|
| Coop reçoit | `Listado de Facturas Recibidas` | **Proveedor / Socio-Proveedor** | livraisons agricoles / recettes / production / liquidation possibles ; REAGP 12 % compatible ; nature à confirmer |
| Coop émet | `Listado de Documentos` / factures client | **Cliente** | achats / intrants / services possibles, nature à confirmer |

## Lien avec les kilos de campagne

Les kilos disponibles dans un autre récapitulatif San Juan (2017/18 → 2023/24) ne doivent pas être automatiquement associés aux montants des `Facturas Recibidas`.

Pour construire une campagne complète, il faut relier séparément :

`apports / vales kilos → rendement / huile → facture ou autofacture fournisseur → compensation REAGP éventuelle → avances / repartos → liquidation finale → paiement bancaire`

et, de l'autre côté :

`achats produits / services → facture client → éventuel paiement / retenue sur compte coopérative`.

## Ce que la distinction peut expliquer

Elle ouvre une piste importante : certaines sommes présentes dans les listados `Facturas Recibidas` pourraient correspondre à des **revenus ou écritures liées à la production agricole**, alors que les `Listado de Documentos` peuvent correspondre à des **dépenses / achats coopérative**.

Le motif fiscal proche de 12 % sur plusieurs années rend cette piste plus solide, mais chaque ligne doit toujours être vérifiée et rattachée à sa pièce source avant d'établir un résultat économique annuel.

## Questions à poser à San Juan

Demander explicitement :

1. à quoi correspondent les `Facturas Recibidas` où la famille est enregistrée comme `Proveedor / Socio-Proveedor` ;
2. si les colonnes à environ 12 % correspondent bien aux **compensaciones REAGP** ;
3. s'il s'agit de reçus / auto-factures de production, de liquidations partielles, d'autres règlements ou d'un autre mécanisme ;
4. comment les relier aux apports d'olives et aux campagnes ;
5. à quoi correspondent les documents où la famille est enregistrée comme `Cliente` ;
6. si les achats / intrants sont réglés directement, prélevés sur un compte coopérative ou compensés avec les liquidations ;
7. obtenir l'historique séparé `fournisseur` et `client` pour 2015-2022.

## Règle FINCA MARIA

**PROVEEDOR ≠ CLIENTE. FACTURA RECIBIDA PAR LA COOP ≠ FACTURE ÉMISE AU SOCIÉTAIRE.**

Le motif REAGP à 12 % est un **indice de qualification**, pas un droit de transformer une écriture fournisseur en production d'olives sans pièce concordante.

Aucun total annuel ne doit mélanger les deux sens de flux.
