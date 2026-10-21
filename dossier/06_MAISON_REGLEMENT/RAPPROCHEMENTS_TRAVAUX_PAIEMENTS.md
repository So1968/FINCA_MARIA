# Rapprochements travaux / paiements — Maison FINCA MARIA

## Objet

Cette fiche relie les factures et justificatifs de travaux de la maison aux preuves de paiement disponibles. Elle ne force aucun rapprochement : un lien n'est considéré comme confirmé que lorsque le montant, la date et le bénéficiaire concordent suffisamment.

## Statuts

- `CONFIRME` : facture et paiement concordants.
- `PROBABLE` : concordance forte mais pièce ou libellé incomplet.
- `FACTURE_SANS_PAIEMENT_RETROUVE` : facture/reçu présent, aucun mouvement bancaire identifié à ce stade.
- `PAIEMENT_SANS_FACTURE_RETROUVEE` : mouvement bancaire présent, justificatif de dépense non retrouvé.
- `REGROUPEMENT_MANUSCRIT` : total secondaire à ne pas additionner aux justificatifs individuels déjà compris dedans.
- `DOUBLON_A_NEUTRALISER` : scan répété, aucun montant supplémentaire à compter.
- `AVOIR_RETOUR` : retour de marchandise / avoir ; montant à soustraire et jamais à compter comme dépense positive.
- `HORS_MAISON_A_VERIFIER` : pièce présente dans le lot mais lien avec la maison non établi.
- `RETRAIT_ESPECES_CONTEMPORAIN` : retrait bancaire proche dans le temps d'un chantier, mais sans preuve suffisante pour l'affecter à ce chantier.

## Rapprochements actuellement établis

| Date facture | Objet / fournisseur | Montant | Paiement lié | Statut | Source |
|---|---|---:|---|---|---|
| 05/05/2008 | Juan Román Córdoba Jiménez — deux portes / ouvrages métalliques | 500,00 € | justificatif Unicaja du 06/05/2008, même bénéficiaire, 500,00 € | CONFIRME | `facturas 4.pdf` |
| 09/06/2004 | carrelage / pièces pour salle de bain | 217,00 € | tampon `pagado` sur justificatif ; mouvement bancaire distinct non encore identifié | FACTURE_SANS_PAIEMENT_RETROUVE | `facturas 4.pdf` |
| 14/06/2004 | fournitures électriques / bâtiment, María Serrano — Alemanes | ~93,60 € | aucun débit bancaire relié avec certitude à ce stade | FACTURE_SANS_PAIEMENT_RETROUVE | `facturas 4.pdf` |
| 02/08/2004 | éléments décoratifs / carrelage | 59,28 € | tampon `pagado` ; mouvement bancaire distinct non encore identifié | FACTURE_SANS_PAIEMENT_RETROUVE | `facturas 4.pdf` |
| 2004 | « obra del cuarto de Baño en el gallinero » — total manuscrit | ~602,30 € | total de regroupement, pas une dépense supplémentaire | REGROUPEMENT_MANUSCRIT | `facturas 4.pdf` |

## Dépouillement — `facturas.pdf` (7 pages)

Lot court consacré principalement à entretien / serrurerie / peinture. Les quatre premières pages portent de l'information ; les pages suivantes sont vides ou sans donnée exploitable dans le scan actuel.

| Page | Date lisible | Objet | Montant visible | Statut / remarque |
|---:|---|---|---:|---|
| 1 | non lisible / non portée | nettoyage de **2 cheminées**, Cortijo de Alemanes ; reçu signé par Francisco Javier Fernández Acuña (lecture du nom à confirmer sur original) | **150,00 €** | reçu manuscrit ; aucun débit bancaire exact de 150,00 € relié avec certitude |
| 2 | non portée | **serrure / cerradura** | **37,60 €** | mention `Pagado` ; aucun débit bancaire exact de 37,60 € retrouvé |
| 3 | non portée | peinture `Verde Mayo 750` + dissolvant | **29,40 € + 3,20 € = 32,60 €** | aucun débit bancaire exact de 32,60 € retrouvé |
| 4 | non portée | proposition de commande, **3 unités de peinture** | **87,00 €** | proposition de commande : ne pas traiter comme facture payée sans autre preuve |

### Résultat du premier balayage bancaire — `facturas.pdf`

Recherche effectuée dans les OCR des principaux relevés Unicaja reçus (`unicaja 2`, `extracto de cuenta`, `unicaja 4`, `unicaja 6`, `unicaja banco 1`, résumés annuels).

- Aucun débit exact de **37,60 €**, **32,60 €** ou **87,00 €** n'a été retrouvé avec un libellé permettant un rapprochement fiable.
- Des montants de **150,00 €** existent ailleurs dans l'historique bancaire, mais ils correspondent à d'autres dates / opérations et ne peuvent pas être attribués au nettoyage des cheminées sans date ni bénéficiaire concordant.

Conclusion : les trois dépenses restent `FACTURE_SANS_PAIEMENT_RETROUVE` à ce stade. La mention `Pagado` prouve seulement que le justificatif porte une indication de paiement, pas que le paiement est identifié dans le relevé bancaire.

## Dépouillement — `facturas 2.pdf` (28 pages)

### Série 2010 — pages 1 à 9

Les pages 1 à 9 sont des factures manuscrites de matériaux au nom de María Serrano / Alemanes, principalement datées d'avril 2010. Les objets visibles comprennent notamment plâtre / mortier, sacs, silice grise, croisillons, ciment, portes / éléments de construction et matériaux divers. Plusieurs totaux sont absents ou trop peu lisibles pour être consolidés sans vérification sur le scan original. **Aucun montant n'est inventé.**

### Série de travaux / matériaux — octobre 2015

| Page | Date | Objet résumé | Montant visible | Statut / remarque |
|---:|---|---|---:|---|
| 10 | 20/10/2015 | intervention / temps de marteau ou outillage, Ricardo (Alemanes) | **≈9,00 €** | tampon `PAGADO`; lecture du détail à confirmer |
| 11 | 23/10/2015 | petites fournitures plomberie / raccords | **9,50 €** | justificatif de fourniture |
| 12 | 21/10/2015 | abrazaderas / tacos / fournitures | **31,30 €** | total manuscrit lisible |
| 13 | 21/10/2015 | raccords, tubes, barres et éléments plomberie / bâtiment | **106,20 €** | total manuscrit lisible |
| 14 | 20/10/2015 | 2 sacs / produits de finition (`capa fina`) | **7,90 €** | total manuscrit lisible |
| 15 | 23/10/2015 | abrazaderas, grilles de ventilation, petites fournitures | **13,85 €** | total manuscrit lisible |
| 16 | 13/10/2015 | barres / tuiles / rouleaux ou matériaux divers | **100,50 €** | total manuscrit lisible ; détail à contrôler |
| 17 | 16/10/2015 | 40 blocs | **4,00 €** | 40 × 0,10 € |
| 18 | 15/10/2015 | briques/blocs, tuiles, ciment et matériaux | **132,10 €** | total manuscrit lisible |
| 19 | 13/10/2015 | tube flexible / plomberie | **7,00 €** | montant lisible |
| 20 | 13/10/2015 | tube / plomberie + sacs de ciment | **109,88 €** | total manuscrit lisible |
| 21 | 19/10/2015 | **ABONO / retour** de 20 tuiles planes ; achat d'un sac de finition sur la même pièce | **-12,60 €** pour le retour ; **+3,95 €** achat visible | `AVOIR_RETOUR` ; ne pas compter 12,60 € comme dépense |
| 22 | 09/10/2015 | gros ensemble de matériaux : tuiles, mortier, blocs, lavabo / salle de bain, tubes, etc. | **506,97 €** | total manuscrit lisible |
| 23 | 09/10/2015 | plomberie / évacuation : raccord, robinetterie, plateau/élément douche, coude PVC | **≈18,90 €** d'après les lignes visibles | total manuscrit difficile à lire ; à vérifier avant consolidation |
| 24 | 28/10/2015 | matériaux / transport ou éléments de chantier, libellé manuscrit peu lisible | **15,00 €** | objet à confirmer |
| 25 | 28/10/2015 | **DEVOLUCIÓN — 4 sacs de ciment** | **-14,00 €** | `AVOIR_RETOUR` |
| 26 | sans date propre | feuille de calcul / totalisation avec tampons `PAGADO` | chiffres agrégés visibles, dont **421,35 €**, **655,30 €**, **1 076,65 €** | `REGROUPEMENT_MANUSCRIT` : ne jamais additionner à nouveau aux justificatifs détaillés |
| 27 | 03/05/2016 | reçu manuscrit, objet de bâtiment / couverture peu lisible | **24,00 €** | tampon `pagado`; lien maison probable mais objet exact à confirmer |
| 28 | 13/10/2015 | ticket de joaillerie / réparation | **4,00 €** | `HORS_MAISON_A_VERIFIER` : aucune preuve que cette dépense concerne la finca |

### Balayage bancaire ciblé — octobre 2015

Les montants **506,97 / 132,10 / 109,88 / 106,20 / 100,50 €** n'ont pas été retrouvés comme débits bancaires exacts et individualisés dans les OCR des relevés reçus.

En revanche, le compte historique montre deux mouvements d'espèces contemporains du chantier :

- **16/10/2015 : retrait / opération de 500,00 €** ;
- **22/10/2015 : retrait d'espèces de 1 500,00 €**.

Ces retraits se situent au milieu de la séquence d'achats du 9 au 28 octobre 2015, mais **ils ne prouvent pas que ces espèces ont servi à payer les matériaux**. Ils sont donc classés `RETRAIT_ESPECES_CONTEMPORAIN`, pas `CONFIRME` ni `PROBABLE`.

La feuille de totalisation page 26 porte des tampons `PAGADO` et un total agrégé visible de **1 076,65 €**. Elle peut être cohérente avec un règlement en espèces d'une partie du chantier, mais sans bénéficiaire bancaire ni détail de caisse correspondant, ce lien reste une hypothèse documentaire et n'est pas retenu comme rapprochement bancaire.

### Conclusion provisoire — chantier octobre 2015

- Le **chantier et les achats sont bien documentés** par de multiples reçus datés.
- Plusieurs pièces portent des mentions `PAGADO`.
- Le compte montre des **retraits d'espèces importants pendant la même période**.
- Aucun élément reçu ne permet encore d'attribuer un retrait précis à une facture précise.

La bonne formulation dans FINCA MARIA est donc : **travaux documentés / paiement indiqué sur certaines pièces / source bancaire exacte non établie**.

## `facturas 4.pdf` — inventaire exhaustif V1 terminé

Le fichier dédié `INVENTAIRE_FACTURAS_4.md` classe désormais **les 52 pages** du PDF.

Résultat structurel :

- 6 pages sont des doublons internes neutralisés : **4/6, 5/7, 11/14, 15/18, 16/17, 23/24** ;
- la page 21 est un `REGROUPEMENT_MANUSCRIT`, pas une dépense supplémentaire ;
- la page 51 est un justificatif bancaire, pas une seconde facture ;
- la page 52 est la facture de 500 € reliée au paiement de la page 51 ;
- aucune valeur trop pâle n'a été promue en montant certain.

Le contrôle restant sur ce lot n'est donc plus un problème de classement : il s'agit seulement de **relire visuellement certaines dates et certains montants pâles** pour obtenir une comptabilité exacte des pages uniques.

## État des trois lots

### `facturas.pdf`

**Dépouillement V1 + balayage bancaire V1 effectués.** Aucun rapprochement bancaire exact supplémentaire n'est établi à ce stade.

### `facturas 2.pdf`

**Dépouillement V1 + balayage bancaire V1 effectués.** La séquence octobre 2015 est documentée ; deux retraits d'espèces contemporains sont repérés mais non attribués.

### `facturas 4.pdf`

**Inventaire exhaustif V1 terminé.** Les 52 pages sont classées, les doublons et agrégats neutralisés, et le rapprochement portes métalliques 2008 est confirmé.

## Règle de preuve

Une mention manuscrite, un tampon `pagado`, une facture et un débit bancaire n'ont pas la même force probante. Le logiciel doit conserver la nature exacte de chaque source.

Le rapprochement bancaire est particulièrement robuste lorsque quatre éléments concordent : date proche, montant identique, même bénéficiaire et même objet.

Un retrait d'espèces proche d'une date de travaux ne peut jamais être affecté automatiquement au chantier.

## Prochaine passe

1. Relire uniquement les pages uniques de `facturas 4.pdf` dont les montants/dates restent pâles ; ne pas retraiter les doublons.
2. Rechercher dans l'ensemble des relevés les bénéficiaires / fournisseurs, pas seulement les montants.
3. Construire ensuite un total annuel à trois niveaux : `CONFIRME`, `DOCUMENTE_NON_RAPPROCHE`, `A_VERIFIER`.
4. Ne jamais inclure les regroupements manuscrits ni les avoirs comme dépenses positives.
