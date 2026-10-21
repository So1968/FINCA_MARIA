# GUIDE UTILISATEUR — FINCA MARIA V0.2

## Démarrage

Ouvrir le raccourci « Ouvrir Finca Maria ».

Le projet s’ouvre dans le navigateur local avec quatre espaces :

1. Accueil ;
2. BAÚL ;
3. Suivi ;
4. Export.

## BAÚL

Dans BAÚL, cliquer sur « Ajouter des documents » ou glisser-déposer plusieurs fichiers.

Le logiciel conserve l’original, propose une catégorie et affiche une raison ainsi qu’un niveau de confiance.

Le document reste dans le sas tant que le classement n’est pas validé.

## Validation

Pour chaque document :

1. lire la proposition ;
2. choisir une autre catégorie si nécessaire ;
3. cliquer sur « Valider le classement ».

## Suivi

L’espace Suivi sert à enregistrer les questions, les tâches et les anomalies.

Une anomalie est un point à contrôler. Ce n’est pas une conclusion.

## Export

L’espace Export permet de télécharger l’état du suivi.

Dans BAÚL, le bouton « Préparer l’index d’export » crée une liste locale des documents reçus et classés.

## Données privées

Les documents restent dans :

```text
Documents/FINCA_MARIA/BAUL_PRIVE
```

Ils ne doivent pas être envoyés sur GitHub.

## Structure locale

```text
BAUL_PRIVE/
├── 00_A_CLASSER/00_RECEPTION_A_VALIDER/
├── 01_CLASSES_VALIDES/
├── 02_EXPORTS_PREPARES/
├── 99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB/
└── _INDEX_BAUL.json
```

## Limite actuelle

La V0.2 propose le classement à partir du nom et du type de fichier. Elle ne lit pas encore tout le contenu des PDF et des images.
