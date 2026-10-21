# FINCA MARIA — TRANSITION EXHAUSTIVE DU FIL DOCUMENTAIRE

**Date de gel : 23/08/2026**  
**Projet : AZOTH STUDIO / FINCA MARIA / Cortijo Alemanes**  
**Dépôt : `So1968/AZOTH_STUDIO`**  
**Branche de travail : `finca-maria`**

---

# 0. INSTRUCTION DE REPRISE POUR LE PROCHAIN FIL

Reprendre FINCA MARIA exactement à partir de ce document, sans refaire les analyses déjà verrouillées et sans perdre les règles de preuve.

**Prochaine action exacte :** poursuivre le croisement **San Juan campagne par campagne**, en séparant strictement :

1. `Proveedor / Socio-Proveedor` = flux où la famille apparaît comme fournisseur de la coopérative ;
2. `Cliente` = flux où la famille apparaît comme cliente de la coopérative ;
3. apports / vales / kilos ;
4. rendement et huile ;
5. avances / repartos ;
6. liquidation finale ;
7. paiement bancaire ;
8. achats de produits / services ;
9. prestataires et travaux ;
10. PAC / aides / fiscalité.

Ne pas transformer un chiffre OCR, un retrait bancaire, un brouillon familial ou un calcul en fait définitif. Toujours conserver le niveau de preuve.

---

# 1. RÈGLES DE TRAVAIL IMPÉRATIVES

## 1.1 Doublons

Directive explicite de Sofia : **« n'ouvre pas ce que tu as en double »**.

Pour chaque nouveau fichier :

- comparer d'abord au corpus connu ;
- utiliser les statuts **NOUVEAU / DOUBLON / VERSION DIFFÉRENTE** ;
- un doublon confirmé n'est **ni rouvert, ni ré-OCRisé, ni réanalysé, ni intégré une seconde fois** ;
- un fichier ressemblant à un autre mais dont le contenu diffère est `VERSION DIFFÉRENTE` ;
- suffixe `(1)` ou nom légèrement différent ≠ preuve automatique de nouveauté.

## 1.2 OCR

Directive actuelle : **OCR pour tous les documents uniques**, page par page quand nécessaire.

Le but n'est pas seulement de classer les PDF, mais d'en extraire les données utiles et de les rendre fonctionnelles dans FINCA MARIA.

Priorité de qualité :

- lecture visuelle native / contrôle de page lorsque le scan est lisible ;
- OCR comme outil d'extraction ;
- si OCR et image divergent, l'image contrôlée prime ;
- ne jamais forcer un chiffre illisible ;
- conserver explicitement `OCR_A_CONTROLER` lorsque nécessaire.

## 1.3 Règle de preuve

Toujours distinguer au minimum :

- `[P]` = pièce primaire ;
- `[P-ANT]` = pièce primaire identifiée dans un ancien lot / audit, original non rouvert dans la passe actuelle ;
- `[CR]` = compte rendu familial contemporain / approuvé ;
- `[D]` = déclaration, mémoire ou document familial secondaire ;
- `[OCR]` = donnée issue de l'OCR ;
- `[C]` = calcul / rapprochement ;
- `A_VERIFIER` / `A_CLARIFIER` = pas assez établi.

Principes absolus :

- facture ≠ preuve du détail technique de l'exécution ;
- achat de produit ≠ preuve d'application sur la Finca ;
- mouvement bancaire ≠ dépense de la Finca ;
- retrait en espèces ≠ paiement à une personne déterminée ;
- dépôt PAC ≠ acceptation PAC ≠ aide accordée ≠ paiement bancaire ;
- déclaration fiscale ≠ production ≠ liquidation coopérative ≠ paiement ;
- kilos figurant sur un document San Juan ≠ automatiquement production totale de la Finca ;
- brouillon de contrat ≠ contrat signé ;
- calcul exact ≠ fait officiel si l'hypothèse documentaire est incomplète.

## 1.4 Confidentialité

Ne jamais reproduire dans GitHub ou l'interface familiale courante :

- numéros complets de compte / IBAN ;
- DNI / NIF complets ;
- téléphones ;
- identifiants ou moyens de banque à distance ;
- cartes / codes de coordonnées ;
- données d'authentification ;
- références cadastrales complètes ou localisation fine lorsque non nécessaire.

Les originaux sensibles restent hors GitHub ; GitHub reçoit les analyses / métadonnées utiles et expurgées.

## 1.5 Principe général FINCA MARIA

**Reconstituer d'abord, comprendre ensuite, décider enfin.**

Le projet doit documenter et vérifier sans accusation prématurée.

---

# 2. OBJECTIF DU PRODUIT FINCA MARIA

FINCA MARIA est un outil autonome de mémoire, de pilotage et de protection du bien familial andalou. Il est fabriqué dans Azoth Studio mais doit pouvoir être transmis à la famille, un gestionnaire, un expert agricole, un avocat ou un autre tiers sans dépendre d'Azoth Studio.

Il couvre :

- terres et parcelles ;
- oliviers ;
- autres cultures / céréales ;
- campagnes et production ;
- coopérative San Juan ;
- prestataires / Vitines ;
- PAC / ASAJA / fiscalité agricole ;
- banque / compte commun ;
- maison, charges, travaux et énergie ;
- Baúl des preuves ;
- décisions familiales ;
- calendrier / présences / usage de la maison ;
- alertes et questions à clarifier ;
- exports famille / avocat.

Ce ne doit pas devenir un simple dépôt de PDF. Les documents doivent alimenter des historiques et chaînes fonctionnelles :

`fait → date → acteur → montant → preuve → parcelle/campagne → paiement → résultat → question ouverte`.

---

# 3. STRUCTURE DU DÉPÔT / LOGICIEL

Racine : `02_PRODUITS/FINCA_MARIA/`

Dossiers majeurs :

- `00_FICHE_MAITRE`
- `01_TABLEAU_DE_BORD`
- `02_TERRES_OLIVIERS`
- `03_CAMPAGNES_PRODUCTION`
- `04_FACTURES_PRESTATAIRES`
- `05_BAUL_PREUVES`
- `06_MAISON_REGLEMENT`
- `07_CALENDRIER_OCCUPATION`
- `08_DECISIONS_FAMILIALES`
- `09_QUESTIONS_A_CLARIFIER`
- `10_EXPORTS_FAMILLE_AVOCAT`

Fiche maître : `00_FICHE_MAITRE/FICHE_MAITRE_FINCA_MARIA.md`.

Le Baúl est le coffre documentaire central : chaque preuve reçoit une date, un type, un sujet, un emplacement, ce qu'elle montre, ses liens et ses questions.

---

# 4. ARCHITECTURE COMMUNE CLASSEURS PHYSIQUES / LOGICIEL

Principe : **même numérotation physique et logicielle**.

Un original papier = une seule place. Un document multi-sujets reçoit des renvois, pas des copies partout.

## 01 — CADASTRE & PROPRIÉTÉ

- 01.1 Maison / données cadastrales
- 01.2 Plans cadastraux
- 01.3 Parcelle 25
- 01.4 Parcelle 27
- 01.5 Surfaces / limites / régularisations

## 02 — TERRES & OLIVIERS

- 02.1 Parcelle 25
- 02.2 Parcelle 27
- 02.3 Comptage des oliviers
- 02.4 Historique exploitation
- 02.5 Travaux agricoles
- 02.6 Traitements / produits
- 02.7 PAC / ASAJA / documents agricoles
- 02.8 Plans / repérages terrain

## 03 — MAISON & CHARGES

- 03.1 Électricité / contrats
- 03.2 Électricité / factures
- 03.3 IBI / impôts
- 03.4 Travaux maison
- 03.5 Matériaux / achats
- 03.6 Eau / assurances / autres charges
- 03.7 Entretien / réparations
- 03.8 Gaz / butane

## 04 — BANQUE & COMPTE COMMUN

- 04.1 Contrats de compte
- 04.2 Extraits historiques
- 04.3 Extraits récents / certificats
- 04.4 Paiements / justificatifs
- 04.5 Notes / vérifications
- 04.6 Accès bancaire — CONFIDENTIEL
- 04.7 Clôtures
- 04.8 Conditions / commissions bancaires

## 05 — PRODUCTION & COOPÉRATIVE

- 05.1 Coopérative San Juan
- 05.2 Tickets d'apport / kilos
- 05.3 Rendements / huile
- 05.4 Liquidations / paiements
- 05.5 Campagnes anciennes
- 05.6 Campagne 2023/24
- 05.7 Campagne 2024/25
- 05.8 Campagne 2025/26
- 05.9 Prestataires agricoles

## 06 — FAMILLE & DÉCISIONS

- 06.1 Réunions familiales
- 06.2 Décisions Terre
- 06.3 Décisions Maison
- 06.4 Compte commun / répartition dépenses
- 06.5 Notaire / avocat / succession
- 06.6 Courriers
- 06.7 Questions à régler

## 07 — À CLASSER

- 07.1 Nouveaux documents
- 07.2 À identifier
- 07.3 À vérifier
- 07.4 Doublons à éliminer

Fichier de référence : `ARCHITECTURE_CLASSEURS_PHYSIQUES.md`.

---

# 5. INVENTAIRE DES PDF UNIQUES DU LOT ACTUEL

Les documents de transmission / synthèse Markdown ne sont **pas** des preuves familiales originales et ne sont pas comptés parmi les originaux.

## 5.1 Originaux uniques confirmés

1. `contrato deposito.pdf` → **04.1**
   - contrat bancaire / dépôt historique ;
   - ouverture 1996 ;
   - annexe 2009 ;
   - María Josefa apparaît en 2009 comme co-titulaire, disposition `indistintamente` ;
   - ne prouve pas l'auteur d'un retrait particulier.

2. `contrato luz.pdf` → **03.1**, renvoi 02
   - installation / contrat électricité 1997 ;
   - contient aussi une page agricole de 1999 ;
   - puissance max admissible manuscrite autour de 5,5 kW ; contrat 3,3 kW ; max souscription visible 4,0 kW ; facturation bimestrielle ;
   - page agricole 1999 : environ 11,39 ha total, 6,39 ha olivier et environ 5 ha de `veza` selon la pièce.

3. `entrega tarjeta de coordenadas maria josefa.pdf` → **04.6 CONFIDENTIEL**
   - mise en place / remise moyens de banque à distance le 15/02/2024 ;
   - preuve d'accès administratif seulement ;
   - aucun mouvement financier prouvé.

4. `extracto de cuenta.pdf` → **04.3**
   - compte mixte ;
   - 19/02/2020 : S.C.A. Agrícola San Juan **+590,91 €**, `LIQ CAMPAÑA 18/2019` ;
   - 08/05/2020 : `LIQ. HERENCIA MARIA SERRANO` **-3 085,50 €** ;
   - nombreuses lignes Endesa, commissions et autres prélèvements ;
   - ne jamais qualifier tout le relevé comme « Finca ».

5. `facturas 4.pdf` → **03.4**
   - 52 pages ;
   - travaux / matériaux maison principalement 2004-2015 ;
   - doubles scans internes connus : p.4/6, 5/7, 11/14, 15/18, 16/17, 23/24 ;
   - 2004 : travaux salle de bain dans le poulailler, note agrégée 602,30 € à ne pas additionner sans dédoublonnage aux tickets individuels ;
   - 05/05/2008 : deux portes métalliques **500 €** ;
   - 06/05/2008 : paiement Unicaja **500 €** au même bénéficiaire : rapprochement facture/paiement fort.

6. `notes.pdf` → **04.5**
   - 5 pages manuscrites ;
   - mouvements / retraits 1996-2016 ;
   - source secondaire ;
   - chaque ligne doit être corroborée par l'extrait primaire.

7. `recaudacion 2008-2024.pdf` → **03.3**
   - série IBI / impôts du bien ;
   - 41 pages.

8. `reunion skype.pdf` → **06.1**
   - réunions familiales 2020 ;
   - mentions de Pepe / Vitines, cadastre, taille de vieux oliviers, impôts, succession, notaire, avocat, charges ;
   - un compte rendu prouve qu'un point a été discuté / décidé, pas qu'il a été exécuté.

9. `solicitud liquidacion.pdf` → **04.7**
   - 18/07/2024 ;
   - clôture d'un compte collectif **distinct du compte historique** ;
   - trois co-titulaires ;
   - solde avant frais **72,68 €**, commissions **10,84 €**, net **61,84 €**.

10. `cartografia cadastral 1.pdf` → **01.2**
    - 10 pages ;
    - maison + parcelles 25 et 27 ;
    - régularisation cadastrale ;
    - orthophoto et plans.

11. `endesa.pdf` → **03.2**
    - 69 pages ;
    - factures / scans / duplications partielles, pas 69 factures uniques ;
    - période notamment 2013-2016 ;
    - puissance contrat 3,30 kW ;
    - à reconstruire : période → kWh → montant → débit bancaire, sans double comptage.

12. `unicaja 2.pdf` → **04.2**
    - 31 pages ;
    - extraits 1996-2016 ;
    - OCR complet réalisé ;
    - chevauchements de périodes à neutraliser ;
    - surlignages = indices, pas preuves.

13. `contrato gaz.pdf` → **03.8**
    - 6 pages ;
    - Repsol / Butano ;
    - révision 22/03/1996, mention `SIN DEFECTOS`, facture 5 000 pesetas ;
    - garantie 1996-2001 ;
    - révision 24/11/2006 ;
    - page service plus récente : total manuscrit autour de 190 € à conserver avec prudence.

14. `facturas.pdf` → **03.4**
    - 7 pages ;
    - nettoyage de 2 cheminées : **150 €** ;
    - serrure : **37,60 €**, mention `Pagado` ;
    - peinture / solvant ;
    - `Pintura de la Casa con Carmen`, 2016 : **53,5 h × 8 € = 428 €**, + 56 € = **484 €**, puis avances/remises 130 € et 300 € ;
    - les calculs `Mama debe 54`, `Carmen debe 246`, `Aclarar...` sont une note de rapprochement interne, pas une dette automatiquement certaine.

15. `unicaja 5.pdf` → **04.8**
    - 4 pages ;
    - conditions et commissions bancaires 2018-2020 ;
    - 21/12/2018 : 6 €/trimestre si solde moyen ≥30 000 €, 15 €/trimestre si inférieur ;
    - 15/10/2019 : tarifs annuels 24 / 60 / 84 € selon conditions ;
    - 14/01/2020 : 0,00 % jusqu'à 50 000 €, 0,01 % au-delà ;
    - grille 2020 : standard 84 €/an, réduction possible à 60 €/an ;
    - ce sont des conditions, pas la preuve des débits effectifs.

16. `unicaja banco 1.pdf` → **04.3**
    - 6 pages ;
    - certificat 09/04/2019 ;
    - solde certifié au 04/04/2019 environ **24 429,36 €** ;
    - solde maximal sur 04/04/2018-04/04/2019 environ **28 204,88 €** ;
    - extrait 01/04/2018-31/03/2019 : Endesa, Caser, TGSS, retraits, Junta, commissions, chèques ;
    - pages 4-5 = répétitions / copies ;
    - page 6 = avis SEPA 31/12/2013.

## 5.2 Doublons confirmés — NE PAS ROUVRIR

- `recaudacion 2008-2024(1).pdf` = doublon de `recaudacion 2008-2024.pdf` ;
- `contrato deposito(1).pdf` = doublon ;
- `contrato luz-1.pdf` = doublon ;
- `contrato luz(1).pdf` = doublon ;
- `entrega tarjeta…(1).pdf` = doublon ;
- `reunion skype(1).pdf` = doublon ;
- `solicitud liquidacion(1).pdf` = doublon.

Le lot complémentaire avait donc **6 doublons + 4 nouveaux** : gaz, facturas.pdf, unicaja 5, unicaja banco 1.

---

# 6. BANQUE — DÉPOUILLEMENT CONSOLIDÉ

## 6.1 Compte historique / contrat

- compte historique ouvert en **1996** au nom de María Serrano García ;
- annexe du **23/03/2009** : María Josefa devient **co-titulaire** avec disposition `indistintamente` ;
- cela établit la possibilité juridique d'opérer, **pas l'auteur d'une opération particulière**.

## 6.2 `unicaja 2.pdf` — OCR complet 1996-2016

31 pages OCRisées ; lignes agricoles stratégiques contrôlées.

### Subventions olivier

- 03/10/1996 — `SUB OLIVAR` : **35 182 ptas** ;
- 04/12/1996 — `SUB-OLIVAR` : **311 475 ptas** ;
- 10/09/1997 — `SUB. OLIVAR` : **22 413 ptas**.

### San Juan / coopérative

- 14/02/2000 — `C. SAN JUAN` : **460 328 ptas** ;
- 25/08/2003 — `COOPERATIVA` : **388,47 €** ;
- 14/01/2004 — `VALES S.C.A. SAN JUAN` : **9 689,21 €**, **contrôlé visuellement**.

### Aides publiques 2004

- 12/03/2004 — Junta de Andalucía / organisme FAGA : **255,88 €**, contrôlé visuellement ;
- 03/08/2004 — ligne FEDER : **366,74 €**, contrôlée visuellement.

### Autres aides OCR à vérifier visuellement avant usage définitif

- 24/10/2014 — Junta de Andalucía ≈ **1 794,15 €** ;
- 05/12/2014 — ≈ **1 701,70 €** ;
- 05/11/2015 — ≈ **1 553,10 €** ;
- 16/11/2015 — ≈ **802,95 €** ;
- 15/12/2015 — ≈ **824,58 €** ;
- 10/05/2016 — ≈ **141,92 €** ;
- août 2016 — ≈ **17,44 €**.

### Retraits / espèces

De nombreux `REINTEGRO EFECTIVO`, chèques et retraits existent. Exemples :

- retraits importants en pesetas 1997-2001 ;
- retraits de 1 500 €, 2 000 €, 2 500 €, 3 000 €, etc. 2004-2014 ;
- 12/09/2013 : OCR **5 500 €** ;
- 07/01/2014 : **2 500 €** ;
- 27/10/2015 : **1 500 €**.

**Aucune attribution à Vitines, Peláez, un membre de la famille ou à la Finca sans pièce concordante.**

Aucune ligne clairement lisible `Peláez` ou `Vitines` n'a été retrouvée dans l'OCR des 31 pages. Cela ne prouve pas absence de paiement : un paiement peut passer par chèque, espèce, libellé différent ou autre compte.

## 6.3 `extracto de cuenta.pdf` — 2020

Page couvrant début 2020 au 17/06/2020 :

- solde ouverture affiché : **22 423,43 €** ;
- solde final affiché : **19 124,88 €** ;
- 10/01 Endesa -66,40 € ;
- 31/01 Endesa -55,73 € ;
- 19/02 **S.C.A. Agrícola San Juan +590,91 €** ;
- 28/02 Endesa -65,56 € ;
- 17/03 maintenance -15 € ;
- 27/03 Endesa -57,14 € ;
- 04/05 Endesa -74,55 € ;
- 08/05 `LIQ. HERENCIA MARIA SERRANO` **-3 085,50 €** ;
- 08/05 commission transfert -9,26 € ;
- 01/06 Endesa -53,78 € ;
- 17/06 maintenance -15 € ;
- autres prélèvements restent à qualifier.

Ce relevé démontre clairement que le compte mélange agriculture, maison, succession et banque.

## 6.4 Aides agricoles consolidées ultérieures

Autres pièces bancaires indexées :

- 02/02/2009 — aide superficie olivar : **264,63 €** ;
- 2016 — lignes agricoles identifiées : **3 336,67 €** au total dans le lot ;
- 2017 — **3 407,80 €** provisoires, avec discordance OCR de 2 € sur une ligne ;
- 2018 — **3 410,02 €** ;
- 2019 — Pago Básico : **167,68 €** ;
- 19/02/2020 — San Juan : **590,91 €**, `LIQ CAMPAÑA 18/2019`.

Ces sommes sont des lignes agricoles identifiées, **pas le chiffre d'affaires annuel**.

## 6.5 Autres pièces bancaires historiques déjà indexées dans le projet

- `unicaja 6.pdf` : remises de chèques / pagarés 2012, 2015, 2016, 2018 ; restent non classées tant que l'origine économique n'est pas prouvée ;
- `unicaja 7.pdf` p.1 : **28/12/2010, transfert 45 000 € vers un compte familial en France + 90 € de frais** ; classé **MOUVEMENT_FAMILIAL / HORS_FINCA**, pas dépense Finca ;
- `unicaja adhesion maria josefa.pdf` : banque à distance 15/02/2024, confidentiel.

---

# 7. MAISON / CHARGES / CADASTRE

## 7.1 Cadastre maison et régularisation

`cartografia cadastral 1.pdf` :

- propriété rurale à Antequera ;
- construction / éléments bâtis total : **370 m²** ;
- surface graphique de la parcelle bâtie : **185 m²** ;
- deux niveaux résidentiels de **185 m²** chacun visibles dans le dossier ;
- année principale indiquée : **1900** ;
- procédure de régularisation autour de **2014** ;
- valeur cadastrale totale lue : environ **29 849,76 € avant → 60 152,76 € après** ;
- date d'altération visible autour du 30/06/2014.

La mention cadastrale de réforme / régularisation **ne prouve pas automatiquement des travaux physiques réalisés en 2014**.

Hypothèse uniquement : proximité temporelle entre régularisation cadastrale 2014 et forte hausse d'IBI en 2015. **Causalité non prouvée.**

## 7.2 IBI 2008-2024

Série actuelle :

- 2008 : **149,07 €**
- 2009 : **153,60 €**
- 2010 : **153,23 €**
- 2011 : **153,23 €**
- 2012 : **168,55 €**
- 2013 : **190,92 €**
- 2014 : **199,34 €**
- 2015 : **411,26 €**
- 2016 : **non retrouvé / à confirmer**
- 2017 : **430,39 €**
- 2018 : **439,96 €**
- 2019 : **449,52 €**
- 2020 : **459,09 €**
- 2021 : **468,65 €**
- 2022 : **478,21 €**
- 2023 : **511,90 €**
- 2024 : **511,90 €**

Point notable : saut 2014 → 2015.

## 7.3 Électricité

`contrato luz.pdf` : installation / abonnement 1997 ; usage domestique ; puissance contractuelle autour de 3,3 kW.

`endesa.pdf` :

- 69 pages = scans / factures / duplications, pas 69 factures uniques ;
- exemple de totaux lisibles :
  - septembre 2016 : **37,91 €** ;
  - août/septembre : **49,53 €** ;
  - juillet/août : **52,56 €** ;
  - juin/juillet : **42,51 €** ;
  - mai/juin : **48,00 €** ;
  - avril/mai : **49,05 €** ;
  - mars/avril : **53,62 €**.

Rapprocher les factures Endesa aux débits bancaires ; ne pas compter la facture et le débit comme deux dépenses.

## 7.4 Gaz / butane

Historique au moins :

- 22/03/1996 : révision Repsol / Butano, `SIN DEFECTOS`, facture **5 000 ptas** ;
- garantie 1996-2001 ;
- 24/11/2006 : révision périodique ;
- une page de service plus récente porte un total manuscrit autour de **190 €**, détail à manier prudemment.

## 7.5 Travaux maison

`facturas 4.pdf` et `facturas.pdf` alimentent l'historique : salle de bain, portes, cheminée, serrure, peinture, matériaux, main-d'œuvre.

Règle : les notes agrégées ne sont jamais additionnées aux tickets qui peuvent les composer sans contrôle anti-doublon.

---

# 8. TERRES / PARCELLES / OLIVIERS

## 8.1 Parcelles 25 et 27 — cadastre 2017

### Parcelle 25

- olivier : **2,0009 ha** ;
- terres arables : **3,4924 ha** ;
- pâture : **0,1384 ha** ;
- total : **5,6317 ha**.

### Parcelle 27

- olivier : **3,6657 ha** ;
- terres arables : **2,1977 ha** ;
- total : **5,8634 ha**.

### Total

- total p.25 + p.27 : **11,4951 ha** ;
- olivier documenté : **5,6666 ha** ;
- terres labourables : **5,6901 ha** ;
- pâture : **0,1384 ha**.

**Ne jamais confondre surface totale 11,4951 ha avec surface d'oliveraie 5,6666 ha.**

## 8.2 Autre description historique

Une description registrale ancienne reprise dans le dossier terres donne :

- total **11,3933 ha** ;
- olivier **6,9767 ha** ;
- monte alto **0,3130 ha** ;
- reliquat calculé en cereal secano ≈ **4,1036 ha**.

Cette donnée historique n'est pas identique à la page agricole 1999 de `contrato luz.pdf` ni au cadastre 2017. **Conserver les trois couches avec leur date et leur source ; ne pas les fusionner comme si elles décrivaient le même état.**

Un plan ancien porte aussi une zone `CEREAL — 9 554,5 m²`, qui n'est pas automatiquement toute la surface céréalière.

## 8.3 Comptage visuel des oliviers

Google Earth, image affichée datée **21/04/2023**, comptage réalisé 22/08/2026.

Corrections terrain de Sofia priment sur l'interprétation visuelle d'espèce.

- Parcelle 25 : **94 arbres visibles**, dont **2 frênes** identifiés par Sofia → **92 oliviers** ;
- Parcelle 27 : **186 oliviers** ;
- total courant : **278 oliviers**.

Ce chiffre remplace :

- l'ancienne estimation familiale ≈180 ;
- un premier comptage grossier 327 ;
- les 15/16 arbres témoins ou de surveillance, qui ne sont pas le total du verger.

Fichier méthode : `02_TERRES_OLIVIERS/METHODE_COMPTAGE_OLIVIERS_2026-08-22.md`.

Méthode : zooms séparés, contour, comptage couronne par couronne, contrôle des bordures, pas d'invention en zone ambiguë, seconde passe, corrections terrain prioritaires.

---

# 9. BAUX / JOSÉ LÓPEZ GALLEGO / VITINES

## 9.1 Bail du 12/02/2007

Parties : María Serrano García / José López Gallego.

- durée : **6 ans**, jusqu'au 11/02/2013 ;
- rente : **15 % de la production d'olives** ;
- `tierra de calma` : **0 %** ;
- dépenses liées à la propriété : propriétaire ;
- dépenses découlant de l'exploitation : **preneur / fermier** ;
- poursuite nécessitant un nouveau document ; pas de prorogation automatique selon la clause retrouvée.

Niveau : **preuve contractuelle primaire**.

## 9.2 Bail du 12/03/2014

Même logique :

- durée 6 ans ;
- fin **11/03/2020** ;
- **15 % olives** ;
- **0 % tierra de calma** ;
- charges d'exploitation au preneur ;
- nouvelle poursuite à constater par nouveau document, pas prorogation automatique.

Niveau : **preuve contractuelle primaire**.

## 9.3 Brouillon familial de mai 2020

Après l'échéance du bail, la famille prépare avec une avocate un projet de nouveau contrat.

Le brouillon évoque :

- ancien système 15 % olives ;
- totalité de la subvention à María selon la formulation familiale ;
- 0 % terres de culture dans l'ancien modèle ;
- manque de documents sur les terres de culture traitées directement par l'exploitant ;
- projet de porter à **40 % la part sur les olives** ;
- projet de **40 % sur les terres cultivées** ;
- projet de transfert des droits de subvention ;
- utilisation de données San Juan des années précédentes ;
- idée d'un cadre renouvelé à partir de 2020.

**Ce sont des intentions / propositions, pas la preuve d'un contrat signé à 40 %.**

## 9.4 Trou contractuel majeur

À ce jour : **aucun contrat signé postérieur au 11/03/2020 n'est retrouvé dans le corpus réconcilié**.

C'est une priorité documentaire car elle conditionne :

- qui paie les charges d'exploitation ;
- qui conserve la production ;
- quelles parts sur olives et céréales ;
- rôle des subventions ;
- justification des factures Agrícola Vitines postérieures.

## 9.5 Lien José López Gallego / Agrícola Vitines

Les brouillons de 2020 relient explicitement José López Gallego à **Agrícola Vitines S.C.** dans le projet familial.

Mais FINCA MARIA doit conserver les noms exacts de chaque pièce et **ne pas considérer automatiquement José López Gallego, Vitines et Agrícola Vitines comme une même entité juridique à toutes les dates** sans pièce établissant le lien.

---

# 10. VITINES — FACTURES ET POINTS DE CONTRÔLE

## 10.1 2024 — facture n°336

- date : **03/05/2024** ;
- Agrícola Vitines S.C. ;
- `Por trabajos realizados en finca` ;
- **1 518 € TTC** ;
- facture certaine ;
- détail technique insuffisant.

Une note manuscrite autour du 25/07/2024 totalise environ **2 565 €** et mentionne notamment :

- remorques de fumier ;
- ouvriers de taille / bois ;
- broyage / débroussaillage ;
- liquide au sol ;
- liquide arbre.

**NE PAS additionner 1 518 + 2 565.** Trois possibilités restent ouvertes : note détaillant la facture, travaux supplémentaires, ou séquences différentes.

Test arithmétique historique : 2 565 - 1 380 HT = 1 185 €, proche du montant 1 200 € rapporté plus tard ; écart 15 €. **Simple piste, aucune preuve de lien.**

## 10.2 Montant de 1 200 € rapporté en 2026

C.R. familial du 15/05/2026 : **1 200 € réglés à Vitines « l'année dernière »**, avec mention que tout n'était pas comptabilisé.

Statut : `REGLEMENT_RAPPORTE / OBJET_NON_ETABLI`.

Ne pas rattacher automatiquement :

- aux céréales ;
- à la note 2024 ;
- à une facture précise.

Aucune facture Vitines 2025 de 1 200 € ou preuve bancaire clairement rapprochée n'a été retrouvée.

## 10.3 Céréales — facture de ramassage manquante

C.R. 2026.09 du 15/05/2026 et C.R. 2026.12 du 19/06/2026 : action répétée **« Facture ramassage avoine ou autres céréales »**.

Il manque :

- date ;
- culture exacte ;
- parcelle / surface ;
- kilos ;
- montant ;
- payeur ;
- destination grain / paille ;
- vente éventuelle ;
- encaissement.

Statut : `FACTURE_DEMANDEE_A_VITINES / NON_RETROUVEE`.

## 10.4 2026 — facture n°378

- date facture : **04/04/2026** ;
- HT **4 950 €** ;
- TVA **495 €** ;
- TTC **5 445 €**.

C.R. familial n°2026.08, établi 14/05 et approuvé 15/05, décrit :

- facture pour ramassage des olives ;
- **1 traitement foliaire** ;
- **1 cuve 3 000 litres** ;
- **8 h de débroussaillage** ;
- **2 cuves liquide au sol**.

Règlements rapportés :

- 05/05/2026 : **2 500 €** ;
- 10/05/2026 : **2 945 €** ;
- total **5 445 €**.

Il faut encore :

- preuves de paiement ;
- ventilation financière de chaque poste ;
- dates exactes d'exécution ;
- produits, doses, volumes ;
- parcelles / zones ;
- personnes / heures ;
- origine des produits ;
- justificatif du poids de récolte.

Ancienne alerte sur des dates 22/04, 29/04, 01/05 postérieures à la facture : **rétrogradée** car ces dates ne sont pas retrouvées dans le C.R. primaire relu. Ne pas présenter l'anomalie comme établie.

---

# 11. CÉRÉALES / TERRES ARABLES

## 11.1 Constat structurel

La Finca n'est pas une exploitation de 11 ha d'oliviers. Les documents modernes donnent environ :

- **5,6666 ha olivier** ;
- **5,6901 ha terres labourables** ;
- **0,1384 ha pâture**.

La question des céréales est donc économiquement importante.

## 11.2 Avant le 11/03/2020

Les baux prévoient :

- 15 % sur olives ;
- **0 % de rente propriétaire sur tierra de calma** ;
- charges d'exploitation au fermier.

Il est donc cohérent de ne pas retrouver une quote-part céréalière analogue aux 15 % d'olives pendant les périodes contractuelles.

## 11.3 PAC / cultures retrouvées

- PAC 2019 : **AVENA** visible ;
- PAC 2024 : **TRITICALE**, rotation avec espèces améliorantes ; bloc OCR **2,17 ha**, affectation exacte à confirmer par recinto.

## 11.4 Semences janvier 2024

Deux factures au nom de López Gallego José, 03/01/2024 :

- **600 kg avoine — 165,00 €** ;
- **500 kg triticale — 148,50 €** ;
- total **1 100 kg / 313,50 €**.

Ce qui est prouvé : fourniture / factures.

Ce qui n'est **pas** prouvé :

- payeur final ;
- compte débité ;
- parcelle semée ;
- quantité effectivement semée ;
- travaux de labour / semis ;
- récolte ;
- vente ;
- acheteur ;
- encaissement.

Statut :

- `SEMENCES_2024 : FACTURES_DOCUMENTEES — 313,50 €`
- `PAIEMENT_SEMENCES_2024 : NON_ETABLI`
- `RECETTE_CEREALES_2024 : NON_RETROUVEE`

Aucune chaîne complète `semis → moisson → kg → acheteur → prix → encaissement` n'a encore été retrouvée.

## 11.5 Vrai trou post-2020

Après 11/03/2020 :

- bail antérieur terminé ;
- prorogation automatique exclue par le texte ;
- projet familial à 40 % documenté mais non prouvé comme signé ;
- projet de transfert de droits PAC évoqué mais exécution non encore prouvée ;
- cultures continuent ensuite.

Il faut donc reconstruire séparément :

1. droit d'exploiter ;
2. charges d'exploitation ;
3. droits PAC / subventions ;
4. récolte / vente des céréales.

---

# 12. SAN JUAN — HISTORIQUE ET CAMPAGNES

## 12.1 Archives anciennes — groupes documentaires

Ne pas appeler automatiquement ces groupes « production totale Finca ».

- 2007/08 : **4 468 kg olives**, **815,03 kg huile**, 18,24 % ;
- 2008/09 : **1 795 kg**, **316,49 kg huile**, 17,63 % ;
- 2009/10 : **1 114 kg / 231,27 kg huile** + **2 537 kg / 520,98 kg huile** — deux groupes, ne pas fusionner sans preuve ;
- 2010/11 : **1 405 kg**, **264,82 kg huile**, 18,85 % ;
- 2011/12 : **3 635 kg**, **824,64 kg huile**, 22,69 % ;
- 2012/13 : **2 174 kg / 390,25 kg huile** + groupe séparé **489 kg** ;
- 2013/14 : ligne **1 163 kg** + groupe **3 463 kg / 696,14 kg huile** ;
- 2017/18 : **4 008 kg**, **851,60 kg huile**.

Cas multi-groupes : ne pas additionner sans preuve qu'il s'agit d'apports distincts cumulables.

## 12.2 Quote-part 15 %

Périodes :

- 12/02/2007 → 11/02/2013 : **15 % prouvé par bail** ;
- 12/03/2014 → 11/03/2020 : **15 % prouvé par bail** ;
- 2020 → env. 2023/24 : continuité pratique du 15 % **déclarée/reconstituée**, pas même niveau de preuve ;
- à partir d'environ 2023/24 : passage vers **gestion familiale directe + prestations facturées**, donc ne plus appliquer automatiquement 100/15.

## 12.3 Récapitulatif San Juan 2017/18 → 2023/24

Kilos portés dans le récapitulatif :

- 2017/18 : **4 008 kg** ;
- 2018/19 : **1 590 kg** ;
- 2019/20 : **5 360 kg** ;
- 2020/21 : **1 225 kg** ;
- 2021/22 : **3 861 kg** ;
- 2022/23 : **684 kg** ;
- 2023/24 : **2 294 kg**.

Scénarios mathématiques `÷0,15` existants, **non officiels** :

- 2017/18 ≈ **26,72 t** ;
- 2018/19 ≈ **10,60 t** ;
- 2019/20 ≈ **35,73 t** ;
- 2020/21 ≈ **8,17 t** ;
- 2021/22 ≈ **25,74 t** ;
- 2022/23 ≈ **4,56 t**.

Pour 2020/21 à 2022/23, le 15 % n'est pas prouvé par un bail retrouvé ; les reconstructions sont donc particulièrement fragiles.

Autres reconstructions de travail :

- 2014/15 ≈ **10,37 t** ;
- 2015/16 ≈ **25,69 t**, mais **conflit** avec un groupe documentaire de **9 064 kg** ;
- 2016/17 ≈ **11,48 t** ;
- 2017/18 ≈ **26,72 t**.

## 12.4 Campagne 2023/24

Trois vales :

- 217 kg ;
- 1 562 kg ;
- 515 kg ;
- total **2 294 kg**.

Liquidation :

- huile **389,06 kg** ;
- rendement **16,96 %** ;
- valeur huile HT **2 854,62 €** ;
- prix moyen olive TTC indiqué **1,3937 €/kg** ;
- avances avant liquidation finale **1 945,28 €** ;
- solde final **998,09 €** ;
- achats coop rattachés **419,77 € TTC** ;
- minimum dépenses documentées avec facture Vitines n°336 : **1 937,77 € TTC**.

San Juan doit encore confirmer que les trois vales représentent toute la campagne.

## 12.5 Campagne 2024/25

Liquidation retrouvée :

- olives **6 551 kg** ;
- huile **1 357,37 kg** ;
- rendement **20,72 %** ;
- valeur huile HT **4 283,31 €** ;
- prix moyen olive TTC indiqué **0,7323 €/kg** ;
- avances **3 393,42 €** ;
- solde final **976,75 €** ;
- achats coop rattachés **1 211,63 € TTC minimum**.

## 12.6 Comparaison rendement 2023/24 + 2024/25

- olives documentées cumulées : **8 845 kg** ;
- huile : **1 746,43 kg** ;
- rendement pondéré Finca : **19,74 %** ;
- référence Málaga pondérée utilisée : **18,15 %** ;
- écart indicatif : **+1,59 point**.

2023/24 : 16,96 % vs référence Málaga 18,34 % → -1,38 pt.  
2024/25 : 20,72 % vs 18,00 % → +2,72 pts.

Ce sont des repères techniques, pas un bénéfice économique.

## 12.7 Campagne 2025/26 — conflit à ne surtout pas écraser

C.R. familial approuvé :

- **7 943 kg = premier ramassage** ;
- **6 541 kg = olives restant au sol / restant à ramasser**.

Une étude antérieure avait qualifié 6 541 kg comme ticket / livraison.

Statut : `CONFLIT_DE_NATURE`.

**INTERDICTION : ne jamais additionner 7 943 + 6 541 comme kilos livrés.**

Total final San Juan, rendement final, huile et valeur : encore inconnus.

---

# 13. SAN JUAN — LISTADOS 2015-2022 : DISTINCTION MAJEURE

## 13.1 Deux familles de documents

### `Listado de Facturas Recibidas`

En-tête `Proveedor / Socio-Proveedor` : la personne familiale est enregistrée comme **fournisseur de la coopérative**.

Cela peut correspondre à :

- fourniture de production ;
- autofacture ;
- liquidation partielle ;
- autre écriture fournisseur.

**Ne pas classer automatiquement comme achats de produits.**

### `LISTADO DE DOCUMENTOS` / filtre `Cliente`

La personne familiale est **cliente**.

Sens économique inverse : cela peut correspondre à des factures émises par San Juan au sociétaire pour :

- produits ;
- intrants ;
- services ;
- autres achats.

**PROVEEDOR ≠ CLIENTE.**

## 13.2 État OCR annuel

### 2015

- `Listado de Facturas Recibidas` : **5 enregistrements** ;
- dates lisibles : 02/01, 10/04, 15/06, 04/08, 31/10/2015 ;
- pied OCR `Núm. Registros: 5` et `Desglose de 1.126,15` ;
- **1 126,15 € non promu comme total annuel** avant contrôle du sens des colonnes ;
- second `Listado de Documentos` client couvre 01/01/2015 → 26/06/2020, exemple 30/04/2015 doc `1329 Q`, base ≈26,35 €.

### 2016

- unité documentaire annuelle repérée ;
- original à réextraire ;
- aucun total promu.

### 2017

- plusieurs écritures ;
- dates au moins 02/01, 02/05, 06/06 ;
- première ligne base ≈ **755,49 €**, taxe ≈ **90,6 €** ;
- total annuel non consolidé.

### 2018

- image probable, tournée / OCR très dégradé ;
- aucun montant retenu ;
- rotation + relecture nécessaires.

### 2019

- période 01/01 → 31/12/2019 ;
- **1 enregistrement** ;
- 02/01/2019 ;
- base ≈ **819,05 €**, taxe ≈ **98,29 €** ;
- TTC à contrôler.

### 2020

- listado retrouvé seulement **01/01 → 26/06/2020** ;
- dates au moins 02/01, 01/05, 05/05 ;
- second semestre à chercher ;
- ne jamais présenter comme année complète.

### 2021

- listado annuel présent ;
- premières dates visibles 02/01, 05/05 ;
- première base ≈ **677,00 €**, taxe ≈ **81,24 €** ;
- total non consolidé.

### 2022

- deux scans / pages ;
- période 01/01 → 31/12/2022 ;
- dates au moins 02/01, 05/05 ;
- première base ≈ **238,50 €**, taxe ≈ **28,38 €** ;
- total à contrôler.

## 13.3 Chaîne de reconstruction à appliquer

### Côté production / fournisseur

`apport / vale kilos → rendement / huile → factura recibida/autofacture fournisseur → avances/repartos → liquidation finale → paiement bancaire`

### Côté achats / client

`produit ou service → facture client → paiement direct ou compensation sur compte coopérative`

Ne jamais mélanger les deux sens dans un total annuel.

---

# 14. INTRANTS / PRODUITS SAN JUAN ET TRAVAUX 2024-2026

## 14.1 Campagne 2023/24 — achats coop

- 16/04/2024 : Cuprocol, Isabion, Stimufol — **241,07 € TTC** ;
- 01/07/2024 : Trioptim Plus, Epik — **103,82 € TTC** ;
- 04/09/2024 : Trioptim Plus, Epik, Fakir — **74,88 € TTC** ;
- total coop rattaché : **419,77 € TTC**.

Achat ≠ application.

## 14.2 Campagne 2024/25 — achats coop

- 05/11/2024 : Trioptim Plus, Agil, Terafit, Herbolex — **231,00 €** ;
- 19/02/2025 : Abono 20-5-10 + Fertilpack — **646,80 €** ;
- 02/04/2025 : Trioptim, Herbolex, Agil, Protibel — **162,45 €** ;
- 22/04/2025 : Trioptim, Isabion, Decibel, Corona — **128,47 €** ;
- 07/07/2025 : Trioptim, Mospilan Max — **42,90 €** ;
- sous-total 2025 : **980,63 €** ;
- total campagne avec 05/11/2024 : **1 211,63 € TTC**.

Il faut relier chaque produit à : date intervention → parcelle → dose → volume → exécutant → preuve.

---

# 15. PAC / ASAJA / PELÁEZ — CHRONOLOGIE

## 15.1 2019 — succession et double dossier

Deux demandes apparaissent dans le contexte du décès de María.

### Demande au nom de María Serrano

Un courrier ASAJA repris dans le compte rendu familial demande :

- déclaration d'héritiers ;
- renoncement de tous les héritiers à la demande PAC 2019 présentée au nom de María Serrano.

Le récit familial indique qu'elle avait été déposée dans l'urgence le jour du décès et aurait posé problème. **Ne pas transformer le récit en décision officielle tant que la notification administrative n'est pas retrouvée.**

### Demande au nom de María Josefa

`Solicitud Única — Campaña 2019`, dossier d'environ 15 pages/images identifié :

- demandeuse María Josefa ;
- `Declaración Responsable (Agricultor Activo)` ;
- `RESUMEN SUPERFICIES` ;
- culture **AVENA** ;
- `SIN VARIEDAD` ;
- page relative à l'indivision / communauté héréditaire.

Les surfaces détaillées restent à extraire / contrôler.

Le compte rendu du 12/11/2019 rapporte qu'ASAJA indiquait alors que la première demande n'avait pas été annulée et que **deux demandes étaient simultanément en cours**. Il fallait choisir / renoncer à l'une.

Question non fermée : **quelle demande a finalement été maintenue, retirée ou rejetée par l'administration ?**

## 15.2 2022 — refus PAC

Une réponse administrative retrouvée indique **refus complet de la PAC 2022** parce que la condition d'`agricultor activo` n'avait pas pu être justifiée.

Ce refus est autonome : une inscription fiscale agricole ne prouve pas automatiquement l'éligibilité PAC.

## 15.3 2024 — dossier détaillé

Dossier daté **05/04/2024** :

- polígono 185 ;
- parcelle 25 : recintos 1, 2, 3 visibles ;
- parcelle 27 : recintos 2, 3 visibles ;
- **OLIVO HOJIBLANCA** ;
- **TRITICALE** ;
- rotation avec espèces améliorantes ;
- surface OCR **2,17 ha** associée au bloc rotation / triticale, affectation exacte à confirmer ;
- aides visibles : **ABRS**, aide olivier avec difficultés spécifiques / haute valeur environnementale, rotation avec espèces améliorantes.

## 15.4 2026

Une démarche / déclaration **ASAJA Málaga datée du 12/03/2026** est documentée.

Donc : **PAC 2026 existe**.

Mais il manque encore ou faut relier :

- titulaire exact ;
- parcelles / recintos ;
- surfaces ;
- cultures ;
- lignes d'aide ;
- accusé de dépôt ;
- résolution ;
- paiement éventuel.

**Absence de détail 2026 ≠ absence de changement.**

## 15.5 Vraie question stratégique Peláez / gestoría

Ne pas demander vaguement « avez-vous fait la PAC ? ».

Demander :

- qui a préparé / présenté chaque millésime ;
- issue administrative finale du conflit 2019 ;
- pièces utilisées pour justifier l'`agricultor activo` ;
- explication documentaire du refus 2022 ;
- ce qui a changé dans la base d'éligibilité entre 2022 et 2024 ;
- dossier détaillé 2026 ;
- pièces sources : San Juan, revenus agricoles, contrats, factures, justificatifs d'activité ;
- accusés et décisions finales manquants.

Ne pas déduire que Peláez a déposé une déclaration uniquement parce qu'elle figure dans les archives.

---

# 16. FISCALITÉ AGRICOLE

Pièces identifiées :

- Modelo 100 exercice 2017 — présentation **18/05/2018** ;
- Modelo 100 exercice 2018 — présentation **18/05/2019**, rubrique explicite `ACTIVIDADES AGRÍCOLAS, GANADERAS Y FORESTALES...` ; montants agricoles à relire avant promotion ;
- Modelo 037 agricole — `alta en el censo...`, activité `AGRÍCOLA`, date **26/04/2019** visible mais portée exacte à confirmer ;
- Modelo 100 exercice 2019 — présentation **25/05/2020** ;
- Modelo 100 exercice 2022 — présentation enregistrée **22/02/2024**.

Manques utiles :

- exercices 2020 et 2021 ;
- exercices postérieurs à 2022 ;
- pièces agricoles sources ayant alimenté les déclarations.

Règle : **fiscalité et PAC ne sont pas interchangeables**.

---

# 17. STRATÉGIE TROIS AXES — VERSION À CONSERVER

## 17.1 Peláez

Objectif : vérifier ce qui a été transmis / déclaré chaque année.

À récupérer / rapprocher :

- fiscalité ;
- PAC ;
- aides ;
- documents agricoles ;
- factures ;
- San Juan ;
- parcelles ;
- paiements ;
- décisions / changements de titulaire ;
- pièces utilisées pour justifier l'activité agricole.

But : constituer désormais un dossier annuel complet et explicable.

## 17.2 Coopérative San Juan

Objectif : reconstituer **campagne par campagne** :

- apports et tickets ;
- kilos ;
- rendement ;
- huile ;
- `Proveedor` / factures reçues par la coop ;
- avances / repartos ;
- liquidation finale ;
- paiement ;
- compte `Cliente` et achats ;
- produits / services ;
- changements de titulaire / compte.

Ne jamais prendre une ligne isolée pour toute la campagne.

## 17.3 Vitines

Objectif : reconstruire les factures et les interventions réelles :

- date ;
- nature des travaux ;
- parcelle ;
- personnes / heures ;
- produits ;
- doses / volumes ;
- matériel ;
- facture ;
- paiement ;
- résultat ;
- lien avec San Juan et achats de produits.

Ne pas accuser ; demander les pièces qui permettent de comprendre.

---

# 18. COMMUNICATION FAMILIALE — POSITION ACTUELLE

Sofia **ne souhaite pas convoquer un conseil de famille** à ce stade.

But : simplement informer la famille du travail en cours et inviter à transmettre documents, souvenirs, informations ou idées utiles.

Message stratégique retenu en substance :

- Peláez : reprendre historique déclaratif / administratif ;
- San Juan : reconstituer campagnes, kilos, rendements, liquidations et paiements ;
- Vitines : reprendre factures et détail des travaux ;
- objectif : croiser **ce qui a été déclaré, ce qui a été produit, ce qui a été facturé** ;
- ne pas tirer de conclusions trop vite.

---

# 19. PHOTOS / VIDÉOS / HISTORIQUE TERRAIN

Éléments historiques mentionnés dans les transmissions précédentes, à distinguer des PDF actuels :

- photo WhatsApp `WhatsApp Image 2026-06-25 at 15.51.27.jpeg` ;
- plusieurs vidéos antérieures ;
- vidéo `1000026074.mp4`, métadonnée autour du 23/11/2025 16:57 UTC, olives visibles ;
- Baúl indexe deux vidéos terrain du **11/11/2025 à 16h44 et 17h04**.

Ce sont des preuves visuelles / terrain potentielles ; elles ne doivent pas être confondues avec les documents administratifs.

---

# 20. FICHIERS CLÉS CRÉÉS / MIS À JOUR DANS GITHUB AU COURS DE CE FIL

## Banque / OCR

- `05_BAUL_PREUVES/00_A_CLASSER/ARRIVAGE_2026-08-23_PDF/DEPOUILLEMENT_DETAILLE_LOT_02.md`
- `05_BAUL_PREUVES/07_BANQUE_COMPTE_COMMUN/OCR_UNICAJA_2_1996_2016.md`
- `05_BAUL_PREUVES/07_BANQUE_COMPTE_COMMUN/INDEX_BANQUE_COMPTE_COMMUN.md` — mis à jour avec les lignes 1996-2004 contrôlées / consolidées.

## Contrats / prestataires

- `04_FACTURES_PRESTATAIRES/CONTRATS_JOSE_LOPEZ_GALLEGO_2007_2014_2020.md`
- `04_FACTURES_PRESTATAIRES/PRESTATAIRES_FACTURES.md`
- `04_FACTURES_PRESTATAIRES/RAPPROCHEMENT_VITINES_2024_2025_1200.md`
- `04_FACTURES_PRESTATAIRES/DEMANDE_VITINES_CEREALES_ET_1200_2026.md`

## PAC / fiscalité / terres

- `02_TERRES_OLIVIERS/CHRONOLOGIE_PAC_2019_2026.md`
- `02_TERRES_OLIVIERS/COMPARAISON_PAC_2024_2026.md`
- `02_TERRES_OLIVIERS/FISCALITE_AGRICOLE_2017_2022.md`
- `02_TERRES_OLIVIERS/CEREALES_TERRES_ARABLES_FLUX_2007_2026.md`
- `02_TERRES_OLIVIERS/CONTROLE_PAIEMENT_SEMENCES_CEREALES_2024.md`
- `02_TERRES_OLIVIERS/INTRANTS_TRAVAUX_2024_2026.md`
- `02_TERRES_OLIVIERS/METHODE_COMPTAGE_OLIVIERS_2026-08-22.md`
- `02_TERRES_OLIVIERS/CADASTRE_PARCELLES_25_27_MAISON_2014_2022.md`

## San Juan / production

- `03_CAMPAGNES_PRODUCTION/FACTURES_SAN_JUAN_2015_2022_AUDIT.md`
- `03_CAMPAGNES_PRODUCTION/SENS_ECONOMIQUE_LISTADOS_SAN_JUAN_2015_2022.md`
- `03_CAMPAGNES_PRODUCTION/HISTORIQUE_SAN_JUAN_2007_2018.md`
- `03_CAMPAGNES_PRODUCTION/MODELE_QUOTE_PART_15_POURCENT_2007_2024.md`
- `03_CAMPAGNES_PRODUCTION/FLUX_AGRICOLES_BANQUE_1996_2020.md` — consolidé avec les lignes 1996-2004 ;
- `03_CAMPAGNES_PRODUCTION/CAMPAGNES_PRODUCTION.md`
- `03_CAMPAGNES_PRODUCTION/PERFORMANCE_PRODUCTION_ECONOMIE_2023_2025.md`
- `03_CAMPAGNES_PRODUCTION/CAMPAGNE_2025_2026_POINTS_A_VERROUILLER.md`

## Maison / Baúl / architecture

- `06_MAISON_REGLEMENT/HISTORIQUE_CHARGES_MAISON.md`
- `06_MAISON_REGLEMENT/ELECTRICITE_ENDESA_2013_2016.md`
- `05_BAUL_PREUVES/INDEX_PREUVES.md`
- `ARCHITECTURE_CLASSEURS_PHYSIQUES.md`

---

# 21. COMMITS / TRAÇABILITÉ DE CE FIL

Commits de travail récents connus sur la branche `finca-maria` :

- `2602f452b6d20f7f7be1ca7e1785bb9428223afb` — dépouillement détaillé lot 02 ;
- `5bbbd06bc071bc0444d74166feadf6ca7b2a28f7` — OCR / analyse supplémentaire ;
- `7f4d31771dfe4f4b0850fe561c4784adcdb4b071` — mise à jour OCR Unicaja 2 ;
- `b8431d1a9ef1fe14f9b07a75f7d0350b43288405` — contrats López Gallego / Vitines ;
- `75ee4933a2ef3642e462ad71b10a40d4bbb59dbb` — chronologie PAC 2019-2026 ;
- `caf40d30ab6db5c808c35367ab44252a45ea2c4e` — audit San Juan 2015-2022 approfondi ;
- `27a64bfc3772f9044ed355893c4d492db886ac6c` — sens économique `Proveedor` / `Cliente` ;
- `896bb5e17f534195c78a54f6f2acb95619c0dae8` — consolidation flux agricoles bancaires 1996-2020 ;
- `b24ec3b647e40c40adc5cb363880a6ef42202196` — index Banque aligné sur OCR consolidé.

Commits du lot documentaire antérieur à conserver dans la traçabilité :

- `7870454185e92f2e222daa0e38093b074b6878a3` — cadastre ;
- `87e90c76bb3b0d82f80d049b5bfa105d0bb36ec6` — Endesa ;
- `de2c6bbf3a74903b03f4213472dc375b615ceb80` — addendum arrivage ;
- `6813d76328f5ca46c3aaa44f7687a326fa3027ba` — méthode comptage ;
- `94cb9849b7c8b25a325f31aec717e447e7f13f0f` — historique charges maison ;
- `b9c95d982172dfbe3f37fa8e3cf164df955e4b46` — index Baúl ;
- `55ca16d64079eb8461f26c401bfc6b23ebd58068`, `4b00ac4497f8a2b809b302f71424eb38c48bba9e`, `a4cfd8147d7c323749356c1cc0cc6f321243192a`, `1e2c43468cb9e2d2848e7c90e8d3a3f73528cad7` — intégration des nouveaux documents du lot complémentaire ;
- `b18d553cbb7da8b62c92da57f4212bfb6548a525`, `3514bc38208179ad2fe68f3251a7a39d4ecc9427` — mises à jour d'index / historiques associés.

---

# 22. QUESTIONS OUVERTES PRIORITAIRES

## Niveau 1 — à fermer en premier

1. **San Juan :** retrouver / obtenir historique officiel `Proveedor` + `Cliente` séparé, campagne par campagne.
2. **San Juan 2016 :** réextraire l'original du listado annuel.
3. **San Juan 2018 :** remettre le scan dans le bon sens et relire.
4. **San Juan 2020 :** trouver le second semestre ou confirmer qu'il n'est pas dans le lot.
5. **San Juan :** relier les kilos 2017/18-2023/24 aux factures/autofactures, avances, liquidations et paiements.
6. **Contrat post-11/03/2020 :** retrouver la pièce signée qui organise réellement l'exploitation après le bail 2014.
7. **PAC 2019 :** décision finale indiquant quelle demande a survécu au double dossier de succession.
8. **PAC 2026 :** récupérer détail recintos / cultures / surfaces / aides / accusé / décision / paiement.
9. **Vitines 2024 :** relation exacte facture 1 518 € ↔ note ≈2 565 €.
10. **Vitines 2025 / 1 200 € :** retrouver facture ou justificatif et objet réel.
11. **Vitines 2026 :** ventilation facture 5 445 €, dates, produits, parcelles, poids et paiements.
12. **Céréales :** facture ramassage avoine/autres céréales demandée en 2026.
13. **Céréales 2024 :** identifier qui a payé les 313,50 € de semences et ce qu'est devenue la récolte.

## Niveau 2

14. retrouver IBI 2016 ;
15. reconstituer Endesa ligne par ligne sans doublons ;
16. poursuivre `facturas 4.pdf` au niveau exhaustif page par page / rapprochements bancaires ;
17. fiscalité : retrouver 2020, 2021, post-2022 ;
18. relire le Modelo 037 pour qualifier exactement la date 26/04/2019 ;
19. relire le montant agricole du Modelo 100 2018 avant usage ;
20. confirmer par San Juan la complétude des campagnes 2023/24 et 2024/25 ;
21. fermer le conflit 2025/26 sur 7 943 / 6 541.

---

# 23. PROCHAINE PASSE — ORDRE DE TRAVAIL CONSEILLÉ

**Ne pas repartir au hasard dans tous les PDF.**

Ordre recommandé :

### Étape A — San Juan 2015-2022

Pour chaque année :

`date → type de listado → rôle Proveedor/Cliente → n° doc → base → TVA → total → nature → pièce source → statut`

Puis relier aux campagnes et éviter les doubles entre listado et factures individuelles.

### Étape B — San Juan production

Pour chaque campagne :

`vale / ticket → kilos → rendement → huile → avances → liquidation → paiement banque`

### Étape C — Peláez / PAC

Pour chaque millésime :

`dépôt → titulaire → parcelles → recintos → cultures → aides demandées → décision → paiement → source fiscale / agricole`

### Étape D — Vitines

Pour chaque facture :

`facture → détail des travaux → dates → parcelles → produits → heures → paiements → preuve d'exécution → résultat`

### Étape E — résultat économique

Seulement quand A-D sont suffisamment verrouillés :

`recettes production + aides - coûts réellement attribuables`, avec bases HT/TTC homogènes.

Ne pas fabriquer un « bénéfice » avant cette étape.

---

# 24. ÉTAT DE CONFIANCE — CE QUI EST DÉJÀ SOLIDE

Sont considérés comme points forts / suffisamment établis pour guider le travail :

- existence et contenu général des deux baux 2007 et 2014 ;
- 15 % olives / 0 % tierra de calma / charges d'exploitation au preneur pour ces périodes ;
- fin écrite du second bail au 11/03/2020 et nécessité d'un nouveau document pour poursuivre ;
- absence actuelle de contrat signé post-2020 retrouvé ;
- présence importante de terres arables ;
- parcelles 25 et 27, surfaces cadastrales 2017 ;
- comptage visuel courant 278 oliviers avec 2 frênes exclus en parcelle 25 ;
- relation bancaire ancienne avec San Juan, y compris 9 689,21 € en 2004 contrôlés visuellement ;
- paiement San Juan 590,91 € le 19/02/2020 avec concept campagne 18/2019 ;
- distinction `Proveedor` / `Cliente` dans les listados San Juan ;
- PAC 2022 refusée pour agriculteur actif non justifié ;
- dossier PAC 2024 détaillé avec Hojiblanca + triticale ;
- existence d'une démarche PAC 2026 ;
- facture Vitines 2024 de 1 518 € ;
- facture Vitines 2026 de 5 445 € ;
- campagnes 2023/24 et 2024/25 avec kilos / huile / rendement documentés ;
- conflit non résolu 2025/26 : 7 943 premier ramassage vs 6 541 restant au sol selon C.R. ;
- compte bancaire mixte ;
- architecture commune classeurs / logiciel ;
- règle de ne pas réouvrir les doublons.

---

# 25. POINTS À NE SURTOUT PAS DÉFORMER DANS LE PROCHAIN FIL

- **278 oliviers** = comptage visuel actuel, pas recensement GPS définitif.
- **11,4951 ha** = total parcelles 25+27, pas surface d'oliviers.
- **5,6666 ha** = surface olivier cadastrale 2017.
- **15 %** est prouvé par contrats seulement sur les périodes couvertes ; ne pas l'étendre automatiquement après mars 2020.
- le projet **40 %** de 2020 est un brouillon, pas un contrat signé.
- les `Facturas Recibidas` San Juan côté `Proveedor` ne sont pas automatiquement des achats de produits.
- les `Listado de Documentos` côté `Cliente` ne sont pas automatiquement des recettes.
- **590,91 € 2020** est un paiement de liquidation campagne 18/2019, pas la valeur complète de la campagne.
- **998,09 €** et **976,75 €** sont des soldes finaux après avances, pas le chiffre d'affaires des campagnes.
- **1 518 €** et **≈2 565 €** Vitines 2024 ne s'additionnent pas sans preuve.
- **1 200 €** rapportés en 2026 : objet non établi.
- **5 445 €** Vitines 2026 : montant certain, détail technique encore incomplet.
- **7 943 + 6 541 ne doivent jamais être additionnés** tant que la nature du second chiffre n'est pas résolue.
- les retraits d'espèces ne sont attribués à personne sans preuve.
- accès bancaire ≠ auteur de mouvements.
- régularisation cadastrale 2014 ≠ preuve automatique de travaux 2014.
- hausse IBI 2015 proche de la régularisation = hypothèse de lien seulement.
- aucune absence de document ne doit être transformée en accusation.

---

# 26. PHRASE DE REPRISE ULTRA-COURTE

Si le prochain fil doit démarrer avec une seule instruction, utiliser :

> **Reprends FINCA MARIA depuis `00_FICHE_MAITRE/TRANSITION_FIL_DOCUMENTAIRE_2026-08-23.md` sur la branche `finca-maria`. Ne réouvre aucun doublon. Continue exactement à la section 23, Étape A : San Juan 2015-2022, en conservant toutes les règles de preuve et de confidentialité.**

---

# 27. RÈGLE FINALE

Cette transition est un **gel de continuité**, pas une conclusion sur la gestion passée.

Ce qui est prouvé reste prouvé. Ce qui est hypothétique reste hypothétique. Ce qui manque reste une question à documenter.

**FINCA MARIA protège le bien en organisant la mémoire, les preuves, les règles et les usages — pas en comblant les trous par des suppositions.**
