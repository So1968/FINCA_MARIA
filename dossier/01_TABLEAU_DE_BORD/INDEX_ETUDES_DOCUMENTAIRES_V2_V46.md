# Index des études documentaires antérieures V2 → V46 — FINCA MARIA

Mise à jour : 23/08/2026

## Pourquoi ce fichier existe

L'audit actuel a retrouvé une couche d'analyse beaucoup plus avancée que le seul lot de 25 PDF OCRisés le 22/08/2026.

Avant de relire aveuglément chaque pièce comme si rien n'avait été fait, FINCA MARIA doit récupérer les conclusions, alertes et règles des études documentaires antérieures, puis les **réconcilier avec les originaux privés**.

Cette couche antérieure ne remplace jamais une pièce primaire. Elle sert de carte pour savoir quoi vérifier et éviter de perdre le travail déjà réalisé.

## Corpus V40 retrouvé

Le rapport `_RAPPORT_STRUCTURATION_DOCUMENTAIRE_V40.md` indique :

- **113 images sources** ;
- **18 groupes documentaires V39** ;
- **25 unités documentaires V40** ;
- **0 fichier non affecté**.

Trois alertes importantes y étaient déjà identifiées :

1. contrôle PAC 2007 potentiellement incomplet ;
2. preuve contractuelle directe d'une rente de **15 % de la production d'olives** ;
3. deux séries de contrats à comparer avant dédoublonnage.

## Grandes familles documentaires retrouvées dans V40

### PAC / administration agricole

Plusieurs lots couvrent au moins :

- 2006-2007 ;
- 2010-2011 ;
- 2014 ;
- 2019 ;
- 2020.

Ils incluent contrôle terrain / photo-interprétation, Solicitud Única, surfaces, droits, communauté héréditaire et procédure Junta.

### Coopérative / factures San Juan

Des unités annuelles existent pour :

- 2015 ;
- 2016 ;
- 2017 ;
- 2019 ;
- 2020 ;
- 2021 ;
- 2022 ;
- une année encore à déterminer.

Cette série est désormais réintégrée dans :

`03_CAMPAGNES_PRODUCTION/SAN_JUAN_LISTADOS_FACTURAS_2015_2022.md`.

La première passe de réconciliation a établi notamment :

- **2015** : 5 enregistrements visibles ; mention OCR `Desglose de 1.126,15`, nature exacte du montant à vérifier ;
- **2017** : plusieurs écritures visibles, première base OCR 755,49 € ;
- **2019** : `Núm. Registros: 1`, base OCR 819,05 € + TVA 98,29 €, total final à contrôler ;
- **2020** : listado partiel s'arrêtant au 26/06/2020 ; aucun total annuel autorisé ;
- **2021** : première écriture lisible base 677,00 € + TVA 81,24 € ;
- **2022** : première écriture lisible base 238,50 € + TVA 28,38 € ;
- une image demeure **année à vérifier** et ne doit pas être forcée en 2018.

Statut : **LU / STRUCTURÉ / INTÉGRÉ AU NIVEAU DOCUMENTAIRE — TOTAUX COMPTABLES ANNUELS NON VERROUILLÉS SANS RELECTURE DES ORIGINAUX**.

Règle : un état de factures ne vaut pas production annuelle. `LISTADO DE FACTURAS ≠ PRODUCTION ≠ LIQUIDATION ≠ PAIEMENT BANCAIRE`.

### Contrats d'exploitation

Le corpus comprend plusieurs séries de contrats / notes, dont une clause directe fixant une rente agricole à **15 % de l'olivier**, payable en avril, dans le contexte précis du contrat concerné.

### Eau / propriété / terrain

Des dossiers historiques et correspondances apparaissent autour de 2000, 2002 et 2006. Ils n'ont pas encore été réintégrés dans le corpus FINCA MARIA actuel et peuvent contenir des informations importantes sur propriété, eau ou usages du terrain.

### Fiscalité

- IRPF / Modelo 100 autour de 2017-2018 ;
- Modelo 037 pour l'activité de María Josefa.

Ces pièces documentent un statut fiscal / une activité ; elles ne prouvent ni une quantité récoltée ni un rendement.

## Générations d'études déjà réalisées

La transmission maître du 22/08/2026 recense les phases suivantes :

- **V2** — analyse BAÚL / orientation OCR / cache local ;
- **V3** — analyse contextuelle des lots CamScanner ;
- **V5-V6** — reconnaissance / nettoyage d'événements OCR ;
- **V7-V12** — consolidation BAÚL, fiabilisation, rotations, reconnaissance directe ;
- **V13-V18** — reconstruction de campagnes, audit événements / liquidations / faux positifs fiscaux et IBI ;
- **V20-V25** — fiabilisation des preuves de production, dates OCR, base canonique ;
- **V28-V31** — comparaison des campagnes, tableau historique prudent, tendances ;
- **V32-V34** — surfaces, parcelles, PAC / SIGPAC, chronologie et normalisation ;
- **V35** — audit spécifique campagne 2015/16 ;
- **V36-V37** — scénario 15 % et audit de la preuve de quote-part ;
- **V38-V42** — pré-tri, regroupement, structuration du nouveau lot et extraction de faits ;
- **V43** — OCR complet des originaux privés ;
- **V44** — analyse historique générale ;
- **V45** — comparaison ciblée des contrats José López Gallego ;
- **V46** — reconstruction de la transition 2019/20 → 2024/25.

## Règle canonique retrouvée

La couche V30 impose une règle essentielle :

> Si plusieurs groupes documentaires existent pour une même campagne et que leur relation n'est pas démontrée, **aucun total annuel unique n'est retenu**.

Exemple signalé : **2015/16** conserve un groupe documentaire de **9 064 kg** non résolu ; une reconstitution à 15 % ne doit donc pas être présentée comme production officielle définitive.

Cette règle doit être conservée dans toutes les futures synthèses.

## Conséquence pour l'audit 2026-08-23

Le problème n'est pas seulement « des documents pas lus ».

Il y a trois couches différentes à réconcilier :

1. **originaux privés** ;
2. **analyses locales V2-V46 déjà faites** ;
3. **nouvelle branche FINCA MARIA / documents GitHub actuels**.

Le travail correct est donc :

`retrouver l'étude antérieure → identifier la pièce primaire → vérifier les points structurants → intégrer dans le modèle FINCA MARIA actuel → marquer le niveau de preuve`.

## Ordre de réconciliation retenu

1. PAC / SIGPAC / Junta / succession agricole ;
2. états de factures San Juan 2015-2022 — **structure réintégrée ; relecture visuelle des montants à poursuivre** ;
3. contrats / quote-part 15 % / transition 2019-2024 ;
4. eau / propriété / terrain historiques ;
5. fiscalité agricole utile ;
6. agriculture 2024-2026 ;
7. CASA historique (assurance, cohabitation, règlement, planning) ;
8. photos / vidéos et diagnostics.

## Statut

`ANALYSES V2-V46 RETROUVEES ET REMISES DANS LA CHAINE DE PREUVE — RECONCILIATION EN COURS.`
