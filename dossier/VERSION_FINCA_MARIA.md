# VERSION — FINCA MARIA

## Version actuelle

```text
FINCA MARIA — V0.2 — Parcours utilisable et BAÚL contrôlé
```

Date de version : 17/07/2026

## Ce que signifie V0.2

La version V0.2 transforme le cadrage autonome en premier parcours réellement utilisable :

```text
Accueil simple
→ entrée des documents
→ tri proposé par le BAÚL
→ validation humaine
→ classement local
→ questions et anomalies
→ export du suivi et de l’index
```

## Éléments opérationnels

- vue Cortijo autonome ouverte par défaut ;
- séparation maintenue entre Azoth Studio et Finca Maria ;
- navigation claire : Accueil / BAÚL / Suivi / Export ;
- bouton et zone de glisser-déposer ;
- tri automatique proposé à partir du nom et du type du fichier ;
- niveau de confiance et raison du classement affichés ;
- validation humaine obligatoire avant le classement définitif ;
- conservation locale des originaux ;
- index privé du BAÚL ;
- dossiers de réception, classement validé et exports préparés ;
- questions, tâches et anomalies conservées localement ;
- fermeture et réouverture des points suivis ;
- export JSON du suivi ;
- export JSON de l’index du BAÚL ;
- chemins portables Linux et Windows ;
- démarrage Linux fiabilisé ;
- contrôle automatique du build sur GitHub.

## Règle d’intégrité

Le BAÚL peut proposer un classement, mais il ne doit pas transformer une hypothèse en certitude.

Un document suit toujours ce parcours :

1. réception dans le sas ;
2. proposition de catégorie ;
3. contrôle par une personne ;
4. validation ou correction ;
5. classement ;
6. utilisation dans le suivi et les exports.

Les originaux privés ne doivent jamais être envoyés sur GitHub.

## Organisation autonome

```text
Azoth Studio = atelier de fabrication / outil interne de Sofia
FINCA MARIA = produit autonome utilisable
PACK_FINCA_MARIA = version transmissible
```

Le dossier source reste :

```text
02_PRODUITS/FINCA_MARIA/
```

Le pack transmissible reste :

```text
10_PACKS/POUR_SOEUR/PACK_FINCA_MARIA/
```

Les preuves réelles sont stockées hors du dépôt GitHub dans :

```text
~/Documents/FINCA_MARIA/BAUL_PRIVE
```

Le chemin exact est calculé automatiquement selon l’ordinateur.

## Ce qui reste à construire avant V1

1. intégrer CASA comme module complet ;
2. intégrer le parcellaire et la lecture du plan ;
3. structurer les campagnes San Juan année par année ;
4. structurer PAC et les paiements ;
5. structurer les travaux agricoles et leurs preuves ;
6. relier chaque preuve à une campagne, une parcelle, une facture ou une question ;
7. ajouter l’extraction de texte et de données dans les PDF et images ;
8. créer des exports spécialisés famille / Peláez / expert / avocat ;
9. ajouter la sauvegarde et restauration complète du projet ;
10. tester le pack sur un deuxième ordinateur sans Azoth Studio.

## Historique de version

| Version | Date | Statut | Description |
|---|---:|---|---|
| V0.1 | 13/07/2026 | Autonomie cadrée | Nom officiel, séparation Azoth/Cortijo, pack transmissible, vocabulaire propre. |
| V0.2 | 17/07/2026 | Parcours utilisable | Navigation simplifiée, BAÚL local, tri proposé, validation humaine, suivi et premiers exports. |

## Phrase de cap

> FINCA MARIA est un projet autonome fabriqué dans Azoth Studio, mais destiné à pouvoir être transmis, compris et utilisé hors d’Azoth Studio.
