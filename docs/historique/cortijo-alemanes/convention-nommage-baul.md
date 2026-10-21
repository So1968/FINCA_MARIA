# FINCA MARIA — Convention de nommage BAÚL

## Principe

Un document reçu conserve toujours son **nom d’origine** dans l’index et dans le coffre d’originaux privés.

Au moment de la validation, BAÚL propose un **nom logique de classement**. La personne qui valide peut le corriger avant le classement définitif.

Format de base :

```text
DATE__TYPE__SUJET.ext
```

Exemples :

```text
2026-04-22__FACTURE__TRAITEMENT_FOLIAIRE.pdf
2026-08-15__CASA__FISSURE_PIGNON.jpg
2026-08-15__FINCA__PHOTO.jpg
2016-04-14__AGRI_SAN_JUAN__LIQUIDATION_FACTURE_1194.jpg
2026-08-15__AGRI_SAN_JUAN__TICKET_APPORT.pdf
2026-08-15__PAC__ACCUSE_DEPOT.pdf
```

## Codes de type

- `FACTURE`
- `AGRI_SAN_JUAN`
- `PAC`
- `PELAEZ`
- `FINCA`
- `CASA`
- `REUNION`
- `MESSAGE`
- `PLAN`
- `A_VERIFIER`

## Règles

1. Le nom d’origine n’est jamais perdu.
2. Le fichier classé reçoit le nom logique validé.
3. L’extension d’origine est conservée automatiquement.
4. Si plusieurs fichiers reçoivent le même nom, BAÚL ajoute `__02`, `__03`, etc.
5. Un nom proposé par le logiciel reste modifiable avant validation.
6. Les noms techniques internes et les originaux privés ne doivent pas être exposés automatiquement au futur portail famille.
7. Le renommage ne remplace pas la validation humaine du contenu.
8. Pour tous les documents de la S.C.A. Agrícola San Juan, la désignation unique est **Agri San Juan** dans l’interface et `AGRI_SAN_JUAN` dans les noms de fichiers et dossiers. Les anciennes variantes `San Juan`, `Coop San Juan`, `COOP_SAN_JUAN` et `SAN_JUAN` ne doivent plus être générées.

## Limite actuelle

Le nom logique est proposé à partir des informations réellement lues lorsqu’elles sont disponibles. Les PDF texte peuvent être lus localement ; les images et scans nécessitent l’OCR local pour extraire de façon fiable la date, le type de document, le numéro et l’émetteur.

Cette convention est conçue pour rester compatible avec l’analyse visuelle et le traitement par séries.
