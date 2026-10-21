# AUDIT ERGONOMIE ET EXPORTABILITÉ — FINCA MARIA V0.2

## Cap retenu

FINCA MARIA doit être compréhensible sans connaître Azoth Studio.

Le parcours utilisateur doit toujours rester :

```text
Accueil
→ BAÚL
→ validation
→ suivi
→ export
```

## Règles d’ergonomie

1. une action principale par écran ;
2. aucun chemin informatique à saisir manuellement ;
3. bouton et glisser-déposer pour les documents ;
4. vocabulaire constant ;
5. distinction claire entre proposition et validation ;
6. état visible après chaque action ;
7. erreur expliquée en langage simple ;
8. documents privés conservés hors GitHub ;
9. sauvegarde et restauration accessibles ;
10. fonctionnement sur Linux et Windows.

## Règles du BAÚL

Le BAÚL :

- reçoit le document dans un sas ;
- conserve l’original ;
- propose une catégorie ;
- indique la raison de sa proposition ;
- affiche un niveau de confiance ;
- attend une validation humaine ;
- classe seulement après validation ;
- inscrit le document dans un index portable.

L’index utilise des chemins relatifs au dossier BAUL_PRIVE afin de rester valable sur un autre ordinateur.

## Arborescence fonctionnelle

```text
BAUL_PRIVE/
├── 00_A_CLASSER/
│   └── 00_RECEPTION_A_VALIDER/
├── 01_CLASSES_VALIDES/
│   ├── 01_FACTURES/
│   ├── 02_COOPERATIVE_SAN_JUAN/
│   ├── 03_PAC_SUBVENTIONS/
│   ├── 04_PELAEZ/
│   ├── 05_PHOTOS_VIDEOS_TERRAIN/
│   ├── 06_CASA_MAISON_LOCATION/
│   ├── 07_REUNIONS_DECISIONS/
│   ├── 08_WHATSAPP_MAILS_CAPTURE/
│   ├── 09_CADASTRE_SIGPAC_PLANS/
│   └── 10_A_VERIFIER_URGENT/
├── 02_EXPORTS_PREPARES/
├── 99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB/
└── _INDEX_BAUL.json
```

## Portabilité

Les chemins ne doivent jamais contenir un nom d’utilisateur codé en dur.

Le dossier local par défaut est calculé à partir du dossier personnel de la personne qui utilise le logiciel.

Une variable optionnelle permet de changer l’emplacement :

```text
CORTIJO_BAUL_DIR
```

## Séparation des données

```text
Code du logiciel
= GitHub

Documents, photos, vidéos, factures et preuves
= BAÚL privé local

Questions et anomalies courantes
= stockage local du navigateur + sauvegarde JSON
```

## Contrôle qualité

Toute modification de l’application doit passer par une construction automatique avant d’être considérée comme stable.

## Priorités après V0.2

1. CASA complet ;
2. campagnes San Juan ;
3. PAC ;
4. parcellaire ;
5. travaux agricoles ;
6. liens entre preuves et modules ;
7. extraction de texte ;
8. exports spécialisés ;
9. sauvegarde complète du BAÚL ;
10. test sur un deuxième ordinateur.
