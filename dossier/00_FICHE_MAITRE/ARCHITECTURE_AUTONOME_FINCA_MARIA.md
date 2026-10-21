# ARCHITECTURE AUTONOME — FINCA MARIA

## 1. Principe général

**FINCA MARIA** est un outil autonome fabriqué dans **Azoth Studio**.

Azoth Studio sert d’atelier de travail interne : c’est l’endroit où Sofia conçoit, structure, développe, teste et améliore ses produits.

FINCA MARIA, lui, ne doit pas rester enfermé dans Azoth Studio. Il doit pouvoir être exporté, transmis et compris par d’autres personnes : famille, gestionnaire, expert agricole, avocat ou toute personne amenée à reprendre le dossier.

Phrase de cap :

> FINCA MARIA est un outil autonome fabriqué dans Azoth Studio, mais destiné à être transmis hors d’Azoth Studio à la famille, à un gestionnaire, à un expert agricole ou à un avocat.

---

## 2. Différence entre Azoth Studio et Finca Maria

### Azoth Studio

Azoth Studio est l’atelier de fabrication.

Il contient :

- les produits en cours de développement ;
- les dossiers sources ;
- les méthodes ;
- les modèles ;
- les outils transverses ;
- les packs exportables ;
- les sauvegardes ;
- les expérimentations ;
- les interfaces de travail de Sofia.

Azoth Studio est donc un environnement interne. Il peut contenir plusieurs projets, dont FINCA MARIA.

### FINCA MARIA

FINCA MARIA est un produit / dossier autonome.

Il sert à suivre un patrimoine agricole familial réel situé à Antequera, en Andalousie, avec :

- campagnes agricoles ;
- production d’olives ;
- coopérative San Juan ;
- PAC et subventions ;
- travaux agricoles ;
- factures ;
- paiements ;
- documents ;
- preuves ;
- BAÚL ;
- CASA ;
- réunions ;
- décisions ;
- questions ouvertes ;
- anomalies ;
- exports famille / Peláez / expert / avocat.

FINCA MARIA doit donc avoir sa propre logique, son propre vocabulaire, son propre dossier de preuve et sa propre documentation.

---

## 3. Version source dans Azoth Studio

La version source de travail se trouve dans :

```text
02_PRODUITS/FINCA_MARIA/
```

Ce dossier sert à construire et stabiliser le produit.

Il peut contenir notamment :

```text
00_FICHE_MAITRE/
03_CAMPAGNES_PRODUCTION/
05_BAUL_PREUVES/
README_FINCA_MARIA.md
```

Cette version source peut être enrichie depuis l’interface Azoth Studio et depuis les documents techniques du dépôt.

Règle importante :

> On ne détruit pas l’existant. Sofia dicte une brique, on ajoute cette brique, et on ne refait pas toute l’architecture sauf demande explicite.

---

## 4. Version pack transmissible

La version transmissible se trouve dans :

```text
10_PACKS/POUR_SOEUR/PACK_FINCA_MARIA/
```

Ce pack doit pouvoir être donné ou exporté à une autre personne sans obliger cette personne à comprendre toute l’architecture Azoth Studio.

Le pack doit contenir :

- une fiche maître claire ;
- un mode d’emploi ;
- le BAÚL des preuves ;
- les campagnes et productions ;
- les documents importants ;
- les tableaux de suivi ;
- les questions ouvertes ;
- les points de vigilance ;
- les exports utiles ;
- les consignes de lecture ;
- les éléments nécessaires à une reprise par la famille, Peláez, un expert agricole ou un avocat.

Le pack transmissible n’est pas une sauvegarde décorative. C’est la version que quelqu’un d’autre doit pouvoir ouvrir pour comprendre le dossier.

---

## 5. Ce que Cortijo doit contenir pour être autonome

Pour être autonome, FINCA MARIA doit contenir ses propres éléments de compréhension et d’action.

### Documentation minimale

- README principal ;
- fiche maître ;
- architecture autonome ;
- historique du projet ;
- glossaire des termes utiles ;
- mode d’emploi pour la famille ;
- mode d’emploi pour un expert ou avocat.

### Données agricoles

- campagnes agricoles ;
- tickets d’apport ;
- rendements ;
- productions annuelles ;
- liquidations / repartos ;
- factures coopérative ;
- travaux agricoles ;
- traitements ;
- parcelles ;
- PAC et subventions.

### BAÚL

BAÚL est le coffre intelligent du projet.

Il doit permettre de classer et relier :

- reçus coopérative ;
- factures ;
- documents PAC ;
- actes et documents de propriété ;
- cadastre / SIGPAC ;
- photos terrain ;
- vidéos terrain ;
- comptes rendus ;
- mails ;
- captures WhatsApp ;
- documents Peláez ;
- documents destinés à la famille, à un expert ou à un avocat.

Règle :

> BAÚL peut proposer un classement ou une question, mais la validation humaine reste obligatoire.

### CASA

CASA est la partie maison et location intelligente.

Elle doit suivre :

- description de la maison ;
- pièces ;
- inventaire permanent ;
- capacité d’accueil ;
- travaux ;
- priorités ;
- devis ;
- factures ;
- anomalies ;
- conditions de location.

### Registres autonomes

FINCA MARIA doit aussi contenir :

- registre des preuves ;
- registre des anomalies ;
- registre des questions ouvertes ;
- journal d’exploitation ;
- tableau parcellaire ;
- tableau des campagnes ;
- dossier Peláez ;
- registre des réunions et décisions ;
- journal d’appels / journal de suivi si utilisé dans l’interface.

---

## 6. Ce qui ne doit pas dépendre d’Azoth

FINCA MARIA ne doit pas dépendre d’Azoth Studio pour être compris.

À éviter :

- obliger le lecteur à connaître toute l’arborescence Azoth ;
- laisser les explications uniquement dans des fichiers d’atelier ;
- mettre les consignes essentielles seulement dans l’interface Azoth ;
- créer des liens indispensables vers des fichiers absents du pack ;
- mélanger Cortijo avec d’autres produits ou anciens noms de travail ;
- présenter Cortijo comme une simple carte d’accueil dans Azoth Studio.

Ce que le pack Cortijo doit pouvoir faire seul :

```text
ouvrir le dossier
comprendre le contexte
voir les preuves
identifier les manques
préparer les questions
préparer les exports
servir de base à une discussion familiale, agricole, comptable ou juridique
```

---

## 7. Règles de développement

Règles validées :

1. Ne pas reconstruire tout le projet.
2. Ne pas supprimer l’existant sans validation.
3. Ne pas annuler les commits d’interface autonome sans confirmation.
4. Ajouter les briques progressivement.
5. Lire l’existant avant de modifier.
6. Garder le style propre à FINCA MARIA.
7. Ne pas réduire Cortijo à une jolie carte décorative.
8. Prévoir l’export et la transmission dès la conception.
9. Documenter les choix importants.
10. Conserver la séparation entre source de travail et pack transmissible.

FINCA MARIA doit être :

- agricole ;
- familial ;
- andalou ;
- documentaire ;
- sobre ;
- opérationnel ;
- robuste ;
- transmissible.

---

## 8. Règles d’export

Quand une brique est stabilisée dans la version source, il faut se demander :

```text
Cette information doit-elle aussi être dans le pack transmissible ?
Cette fiche est-elle compréhensible sans Azoth Studio ?
Les documents liés sont-ils présents ?
Les noms de fichiers sont-ils clairs ?
Le lecteur sait-il quoi faire ensuite ?
```

Un export Cortijo doit pouvoir servir à :

- la famille ;
- Peláez ;
- un expert agricole ;
- un avocat ;
- un futur repreneur du dossier.

Les exports ne doivent pas seulement être jolis. Ils doivent être utiles, lisibles et exploitables.

---

## 9. Règle de vocabulaire

Utiliser :

```text
FINCA MARIA
BAÚL
CASA
San Juan
PAC
Peláez
campagnes agricoles
preuves
anomalies
questions ouvertes
pack transmissible
```

Clarification :

```text
Azoth Studio = atelier de fabrication / outil interne de Sofia
FINCA MARIA = produit autonome exportable
PACK_FINCA_MARIA = version transmissible à la famille / expert / avocat
```

Ne pas employer Azoth Finca comme nom principal actuel de l’outil.

---

## 10. Phrase de cap définitive

> FINCA MARIA doit aider la famille à voir ce qui a été fait, ce qui a été payé, ce qui est prouvé, ce qui manque et ce qui doit être demandé.

Et surtout :

> Azoth Studio fabrique Finca Maria, mais Finca Maria doit pouvoir vivre hors d’Azoth Studio.
