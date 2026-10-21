# San Juan 2015-2022 — matrice Proveedor / Cliente

Mise à jour : 23/08/2026

## Objet

Matrice de reconstruction normalisée pour poursuivre le dépouillement San Juan sans mélanger les deux sens économiques.

Règle :

`date → sens Proveedor/Cliente → n° document → base → compensation/TVA → brut/total → nature → pièce source → niveau de preuve → campagne correspondante → rapprochement éventuel`

Cette matrice ne remplace pas les originaux. Elle rassemble uniquement les valeurs déjà extraites et les rapprochements autorisés par le corpus.

## Niveaux utilisés

- `[P]` : pièce primaire contrôlée dans la passe actuelle ;
- `[P-ANT]` : pièce primaire identifiée dans un ancien lot / audit, original non rouvert dans la passe actuelle ;
- `[OCR]` : lecture OCR à contrôler ;
- `[C]` : calcul / rapprochement ;
- `[D]` : synthèse / déclaration familiale secondaire ;
- `A_RATTACHER` : campagne ou nature non établie ;
- `A_CONTROLER_VISUELLEMENT` : chiffre ou colonne à relire sur le scan.

## Règles désormais fortes

1. `Proveedor / Socio-Proveedor` et `Cliente` sont deux sens économiques opposés.
2. Les pièces Proveedor anciennes documentent le schéma :
   `base → compensation agricole 12 % → brut → retenue 2 % → net`.
3. Un `reparto` successif n'est **pas** automatiquement une nouvelle quantité d'olives. La campagne 2014/15 prouve que trois repartos peuvent reprendre exactement les mêmes kilos.
4. On ne transforme jamais un calcul `÷ 0,15` en production officielle.
5. On ne relie une écriture à une campagne que par date, référence, concept ou pièce concordante.

---

# 2015

## Proveedor / Socio-Proveedor

Source : `Listado de Facturas Recibidas` annuel 2015 — `[P-ANT/OCR]`.

Le listado comporte **5 enregistrements** : 02/01, 10/04, 15/06, 04/08 et 31/10/2015.

| Date | Sens | N° doc / pièce candidate | Base | Compensation | Brut / total | Nature | Preuve | Campagne | Rapprochement |
|---|---|---|---:|---:|---:|---|---|---|---|
| 02/01/2015 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | fournisseur agricole / nature exacte inconnue | `[P-ANT/OCR]` | A_RATTACHER | **ouvert** |
| 10/04/2015 | Proveedor | **1233** | **192,20 €** | **23,06 €** `[C]` | **215,26 €** | `1ER. REPARTO CPÑA 14/15` | `[P-ANT]+[C]` | **2014/15** | concordance date + pièce + compte forte ; n° dans listado à contrôler |
| 15/06/2015 | Proveedor | **2142** | **160,17 €** | **19,22 €** `[C]` | **179,39 €** | `2° REPARTO CPÑA 14/15` | `[P-ANT]+[C]` | **2014/15** | concordance date + pièce + compte forte |
| 04/08/2015 | Proveedor | **2957** | **192,20 €** | **23,06 €** `[C]` | **215,26 €** `[C]` | `3ER. REPARTO CPÑA 14/15` | `[P-ANT]+[C]` | **2014/15** | concordance date + pièce forte ; ligne compte complète à relire |
| 31/10/2015 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | fournisseur agricole / nature exacte inconnue | `[P-ANT/OCR]` | A_RATTACHER | **ouvert** |

Pied OCR : `Núm. Registros: 5` et `Desglose de 1.126,15`.

**1 126,15 € n'est pas promu comme total annuel** : portée exacte du `Desglose` à contrôler.

### Base physique 2014/15 — règle anti-double comptage

Les pièces 1233, 2142 et 2957 reprennent toutes :

- **1 556 kg olives** ;
- **320,34 kg huile** ;
- **20,59 %**.

Donc : **1 556 + 1 556 + 1 556 est faux**. Les repartos successifs reprennent ici la même base physique.

Voir `CAMPAGNE_2014_2015_REPARTOS_1233_2142_2957.md`.

## Cliente

Source : `LISTADO DE DOCUMENTOS` couvrant 01/01/2015 → 26/06/2020 — `[P-ANT/OCR]`.

| Date | Sens | N° doc | Base | TVA / taxe | Total | Nature | Preuve | Rapprochement |
|---|---|---|---:|---:|---:|---|---|---|
| 30/04/2015 | Cliente | **1329 Q** | ≈ **26,35 €** | ≈10 % `[C]` | **28,99 €** | **VENTA QUIMICA** | `[P-ANT/OCR]+[C]` | même référence dans le compte coop — fort |
| 08/07/2015 | Cliente | **2784 P** | A_REEXTRAIRE | A_REEXTRAIRE | **60,01 €** | **VTA. ACEITE** | `[P-ANT/OCR]` | même référence dans le compte coop — fort |

Ces achats ne sont jamais additionnés aux flux Proveedor.

---

# 2016

## Listado annuel

L'unité annuelle 2016 est localisée comme page 10 du lot `21.17`, mais son texte complet n'est pas encore récupéré dans cette passe.

Statut : `LISTADO_2016_LOCALISE — LIGNES_A_REEXTRAIRE`.

## Chaîne Proveedor de campagne 2015/16

Trois repartos sont désormais identifiés :

| Date | N° | Nature | Kg olives | Kg huile | Base | Compensation | Brut | Retenue | Net | Statut |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| 14/04/2016 | **1194** | 1er reparto 15/16 | **9 064** `[OCR]` | A_REVOIR | A_REVOIR | A_REVOIR | **742,21 €** | **14,84 €** compte | **727,37 €** `[C/OCR]` | identité documentaire très forte |
| 06/06/2016 | **2040** | 2e reparto 15/16 | **A_REEXTRAIRE** | **A_REEXTRAIRE** | A_REEXTRAIRE | A_REEXTRAIRE | **556,67 €** | **11,13 €** | **545,54 €** `[C]` | pièce identifiée + compte concordant |
| 19/09/2016 | **2946** | 3e reparto 15/16 | **3 854** | **828,37** | **497,03 €** | **59,64 €** `[C]` | **556,67 €** | **11,13 €** | **545,54 €** | chaîne très forte |

### Règle sur 9 064 / 3 854

Les **9 064 kg** du n°1194 et les **3 854 kg** du n°2946 sont deux bases présentes dans des repartos de la même campagne.

**NE PAS ADDITIONNER.**

Le précédent 2014/15 prouve que les repartos peuvent répéter une même base physique. Le fait que 2040 et 2946 aient exactement le même brut et la même retenue renforce encore la prudence.

La synthèse familiale 2020 retient **3 854 kg** dans une colonne décrite comme `15 % Maria` et calcule **25 693,33 kg** à 100 %. Statut : `[D/C]`, pas preuve primaire.

Voir `CAMPAGNE_2015_2016_REPARTOS_1194_2040_2946.md`.

## Cliente 2016

Une opération de compte coopérative est repérée :

- **03/11/2016 — facture 9211 P — `VTA. REPUESTO` — 18,39 €**.

Statut : `ACHAT_COOP_DOCUMENTE — RACCORDEMENT_AU_LISTADO_CLIENTE_A_FAIRE`.

---

# 2017

## Proveedor / Socio-Proveedor

| Date | Sens | N° doc | Base | Compensation | Brut / total | Nature | Preuve | Campagne | Rapprochement |
|---|---|---|---:|---:|---:|---|---|---|---|
| 02/01/2017 | Proveedor | **296** | **755,49 €** | ≈ **90,66 €** `[C]` | **846,15 €** | **LIQUIDACION CPNA** | `[P-ANT/OCR]+[C]` | campagne exacte à verrouiller | **date + réf + montant + libellé compte : fort** |
| 02/05/2017 | Proveedor | **1248** `[OCR]` | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | fournisseur agricole, nature précise inconnue | `[P-ANT/OCR]` | A_RATTACHER | ouvert |
| 06/06/2017 | Proveedor | référence tronquée | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | fournisseur agricole, nature précise inconnue | `[P-ANT/OCR]` | A_RATTACHER | ouvert |

### Groupe campagne 2016/17 séparé

Pièces individuelles anciennes :

- **1 722 kg olives** ;
- **390,26 kg huile** ;
- rendement calculable ≈ **22,66 %** ;
- pièce du 19/09/2017 : base **234,16 €**, compensation **28,10 €**, brut **262,26 €**, retenue **5,25 €**, net **257,01 €**.

Un extrait de vales séparé porte **1 056 kg** ; il reste distinct.

Statut : `[P-ANT] GROUPE_2016_17_DOCUMENTE — PAS_DE_FUSION_AUTOMATIQUE`.

---

# 2018

Le scan annuel probable 2018 est la page 8 du lot `21.17`, retournée / OCRisée à l'envers.

Reconstruction OCR de travail :

- **05/06/2018** : date robuste après inversion ;
- numéro **761** : candidat de lecture, **non promu** ;
- séquences compatibles avec **02/01/2018** et **27/05/2018**, moins sûres ;
- montants non fiables.

Statut : `2018_ATTRIBUTION_FORTEMENT_SOUTENUE — DOC761_CANDIDAT — RELECTURE_VISUELLE_NECESSAIRE`.

### Groupe campagne 2017/18

Deux pièces individuelles anciennes regroupées :

- **4 008 kg olives** ;
- **851,60 kg huile** ;
- rendement calculé `[C]` ≈ **21,25 %** ;
- base reprise dans l'audit : **596,13 €** ;
- net : **654,32 €**.

Un ancien récapitulatif décrit les mêmes kilos comme **Primer reparto 2017/2018**, période jusqu'au 17/05/2018.

Aucune référence n'est encore suffisamment concordante pour relier ce groupe au candidat n°761.

Voir `CAMPAGNE_2017_2018_REPARTO_4008KG.md`.

---

# 2019

## Proveedor / Socio-Proveedor

Le listado annuel indique **1 enregistrement**.

| Date | Sens | N° doc | Base | Compensation | Brut calculé | Retenue calculée | Net calculé | Nature | Rapprochement |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| 02/01/2019 | Proveedor | **286** | **819,05 €** | **98,29 €** | **917,34 €** `[C]` | **18,35 €** `[C]` | **898,99 €** `[C]` | fournisseur agricole / REAGP cohérent | aucune pièce concordante ferme |

Le paiement bancaire du **19/02/2020 — 590,91 € — `LIQ CAMPAÑA 18/2019`** prouve un paiement de campagne 18/19, mais **ne correspond pas arithmétiquement** au doc 286. Ne pas les fusionner.

Contexte campagne : **1 590 kg** dans le récapitulatif San Juan.

---

# 2020

## Proveedor / Socio-Proveedor

Le listado retrouvé couvre seulement **01/01/2020 → 26/06/2020**.

| Date | Sens | N° doc | Base | Compensation | Total | Nature | Preuve | Campagne | Rapprochement |
|---|---|---|---:|---:|---:|---|---|---|---|
| 02/01/2020 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | fournisseur agricole probable | `[P-ANT/OCR]` | A_RATTACHER | — |
| 01/05/2020 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | idem | `[P-ANT/OCR]` | A_RATTACHER | — |
| 05/05/2020 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | idem | `[P-ANT/OCR]` | A_RATTACHER | — |

**Interdiction de produire un total annuel 2020** tant que le second semestre n'est pas retrouvé ou confirmé absent.

## Cliente

Le `LISTADO DE DOCUMENTOS` multiannuel s'arrête au **26/06/2020**. Les lignes 2016-2020 sont encore à extraire intégralement.

Statut : `CLIENTE_2016_2020_EXISTENCE_SERIE_CONFIRMED — LIGNES_A_EXTRAIRE`.

Contexte campagne : **5 360 kg** dans le récapitulatif San Juan. Le bail signé expire le **11/03/2020**, donc la campagne chevauche la rupture contractuelle.

---

# 2021

## Proveedor / Socio-Proveedor

| Date | Sens | N° doc | Base | Compensation | Brut `[C]` | Retenue `[C]` | Net `[C]` | Nature | Rapprochement |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| 02/01/2021 | Proveedor | A_EXTRAIRE | **677,00 €** | **81,24 €** | **758,24 €** | **15,16 €** | **743,08 €** | fournisseur agricole / REAGP cohérent | référence à retrouver |
| 05/05/2021 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | idem | ouvert |

81,24 € représente exactement **12 %** de 677,00 €.

Contexte : 2020/21 = **1 225 kg** ; 2021/22 = **3 861 kg** dans le récapitulatif. Après 11/03/2020, aucun bail signé retrouvé ne prouve une quote-part 15 %.

---

# 2022

## Proveedor / Socio-Proveedor

| Date | Sens | N° doc | Base | Compensation | Total brut OCR/calcul | Nature | Preuve | Rapprochement |
|---|---|---|---:|---:|---:|---|---|---|
| 02/01/2022 | Proveedor | **259** | **238,50 € OCR** | **28,38 € OCR** | **266,88 €** `[C]` sur OCR brut | fournisseur agricole probable | `[P-ANT/OCR]` | **contrôle visuel prioritaire** |
| 05/05/2022 | Proveedor | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | A_EXTRAIRE | idem | `[P-ANT/OCR]` | ouvert |
| autres lignes | Proveedor | TRONQUE | TRONQUE | TRONQUE | TRONQUE | non exploitable | `[OCR]` | ouvert |

### Anomalie OCR ciblée doc 259

- 12 % de 238,50 € = **28,62 €**, pas 28,38 € ;
- 28,38 € = exactement 12 % de **236,50 €**.

Donc **236,50 € est uniquement une cible de contrôle visuel**, pas une correction.

Contexte : 2021/22 = **3 861 kg** ; 2022/23 = **684 kg**. Aucun lien direct aux lignes 2022 n'est encore établi.

---

# Tableau campagnes à rapprocher des écritures fournisseur

| Campagne | Kilos documentés / récapitulés | Huile / rendement | 15 % contractuel | Paiement identifié | Statut actuel |
|---|---:|---:|---|---|---|
| 2014/15 | **1 556 kg** sur les 3 repartos côté compte propriétaire ; reconstruction ≈10,37 t `[C]` | **320,34 kg / 20,59 %** | oui | mouvements coop des repartos | **repartos 1233/2142/2957 raccordés ; kilos non additifs** |
| 2015/16 | **9 064 kg** n°1194 `[OCR]` et **3 854 kg** n°2946 | 828,37 kg / 21,49 % sur n°2946 | oui | mouvements coop 1194/2040/2946 | **conflit de portée, pas d'identité ; ne pas additionner** |
| 2016/17 | **1 722 kg** groupe pièces + **1 056 kg** vales séparés | **390,26 kg**, rendement ≈22,66 % sur groupe 1 722 | oui | non consolidé | groupes distincts, listados partiellement non raccordés |
| 2017/18 | **4 008 kg** | **851,60 kg / ≈21,25 % `[C]`** | oui | non consolidé | groupe 1er reparto isolé ; listado 2018 non raccordé |
| 2018/19 | **1 590 kg** | — | oui | **590,91 € le 19/02/2020**, `LIQ CAMPAÑA 18/2019` | paiement campagne prouvé ; doc286 non rattaché |
| 2019/20 | **5 360 kg** | — | bail jusqu'au 11/03/2020 seulement | non identifié | chevauche rupture contractuelle |
| 2020/21 | **1 225 kg** | — | non prouvé après 11/03/2020 | non identifié | non rattaché |
| 2021/22 | **3 861 kg** | — | non prouvé | non identifié | non rattaché |
| 2022/23 | **684 kg** | — | non prouvé | non identifié | non rattaché |

---

# État de la passe actuelle

## Fermé / fortement avancé

- séparation **Proveedor / Cliente** ;
- mécanisme Proveedor `+12 % / -2 %` ;
- 2015 : repartos **1233 / 2142 / 2957** identifiés sur les trois dates intermédiaires ;
- 2015 Cliente : **1329 Q = VENTA QUIMICA**, **2784 P = VTA. ACEITE** ;
- 2015/16 : identité des repartos **1194 / 2040 / 2946** ;
- preuve méthodologique que les kilos de repartos ne sont pas additifs ;
- 2017 : **doc296 = LIQUIDACION CPNA** ;
- 2017/18 : groupe **4 008 / 851,60** isolé et cohérent ;
- 2019 : doc **286** et clé arithmétique calculée ;
- 2022 : anomalie OCR du doc **259** ciblée sans correction arbitraire.

## Ouvert

1. 2015 : références des lignes **02/01** et **31/10** ;
2. 2016 : texte complet du listado annuel et kilos/huile du n°2040 ;
3. 2017 : nature du **doc1248** et de la ligne 06/06 ;
4. 2018 : relecture visuelle, candidat `761` non promu ;
5. Cliente : extraction exhaustive **2016 → 26/06/2020** ;
6. 2020 : second semestre ;
7. 2021 : références de documents ;
8. 2022 : contrôle visuel `238,50 ? / 28,38`.

# Prochaine extraction exacte

1. **2016** — récupérer la ligne complète du n°2040 et le listado page 10 ;
2. **2018** — tourner l'image, lire dates / références / montants, tester `761` ;
3. **Cliente 2015→26/06/2020** — extraire toutes les références et les chercher dans le compte coop ;
4. **2017** — chercher doc1248 et la ligne 06/06 dans les pièces individuelles / compte ;
5. **2022** — contrôle visuel ciblé du doc259 ;
6. ne calculer aucun résultat économique annuel avant verrouillage anti-doublon.
