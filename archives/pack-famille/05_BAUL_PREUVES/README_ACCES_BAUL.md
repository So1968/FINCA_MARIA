# BAÚL — Accès local aux documents

Ce dossier décrit l’accès au BAÚL de FINCA MARIA.

## Principe

Le BAÚL contient les preuves et documents utiles au projet Cortijo : factures, tickets San Juan, PAC, documents Peláez, photos, vidéos, comptes rendus, captures WhatsApp, plans, cadastre, SIGPAC et éléments liés à CASA.

Les documents réels et sensibles ne doivent pas être poussés sur GitHub.

## Dossier local privé

Le dépôt réel des documents se fait dans le dossier local privé :

```text
/home/sofia/Documents/FINCA_MARIA/BAUL_PRIVE
```

Dépôt rapide pour les nouveaux documents :

```text
/home/sofia/Documents/FINCA_MARIA/BAUL_PRIVE/00_A_CLASSER
```

## Sous-dossiers de tri

```text
00_A_CLASSER/
├── 01_FACTURES/
├── 02_COOPERATIVE_SAN_JUAN/
├── 03_PAC_SUBVENTIONS/
├── 04_PELAEZ/
├── 05_PHOTOS_VIDEOS_TERRAIN/
├── 06_CASA_MAISON_LOCATION/
├── 07_REUNIONS_DECISIONS/
├── 08_WHATSAPP_MAILS_CAPTURE/
├── 09_CADASTRE_SIGPAC_PLANS/
└── 10_A_VERIFIER_URGENT/
```

Si le classement est incertain, déposer dans :

```text
00_A_CLASSER/10_A_VERIFIER_URGENT
```

## Règle de sécurité

- Ne pas mettre les originaux privés sur GitHub.
- Ne pas pousser les factures, vidéos, photos, captures, relevés ou documents personnels.
- Garder les originaux dans le BAÚL local privé.
- Le dépôt GitHub doit seulement contenir la structure, les règles, les index et les modèles.

## Installation de l’accès local

Depuis le dépôt local :

```bash
cd /home/sofia/DEV/AZOTH_STUDIO
pwd
git status
git pull

bash scripts/preparer-baul-cortijo-local.sh
```

Cela crée :

```text
/home/sofia/Documents/FINCA_MARIA/BAUL_PRIVE
```

et un raccourci :

```text
Ouvrir BAÚL Finca Maria
```

sur le Bureau et dans les Applications.
