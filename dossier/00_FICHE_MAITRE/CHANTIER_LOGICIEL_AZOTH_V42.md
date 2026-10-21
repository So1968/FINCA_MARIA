# FINCA MARIA V42 — Chantier logiciel dans Azoth Studio

Ce document contient uniquement les sujets de construction du logiciel. Ils ne doivent pas apparaître dans la vue familiale de FINCA MARIA comme s'il s'agissait de problèmes de la finca.

## Règle de séparation

- FINCA MARIA : faits, documents, analyse du dossier, stratégie familiale, historiques et actions métier.
- Azoth Studio : architecture, ergonomie, OCR, automatisation, stockage, sécurité, migrations, déploiement et qualité logicielle.

## Chantier logiciel actif

### 1. Ergonomie

- conserver une analyse du dossier visible, non masquée par défaut ;
- afficher quatre interlocuteurs distincts : San Juan, ASAJA, Peláez, Agriculteur / Vitines ;
- pour chacun : historique dédié + actions dédiées ;
- conserver ensuite une vue globale « À faire » ;
- éviter les murs de cartes techniques dans la vue famille ;
- ne jamais réintroduire comme action active une question déjà résolue par un document.

### 2. Moteur documentaire

Pipeline cible :

1. empreinte SHA-256 ;
2. détection doublon ;
3. lecture native ;
4. OCR / lecture visuelle si nécessaire ;
5. extraction structurée ;
6. rapprochement avec les faits existants ;
7. détection de contradiction ;
8. proposition de fermeture / reformulation de question ;
9. validation humaine si incertitude.

### 3. Qualité des données

Le logiciel ne doit jamais résoudre silencieusement deux valeurs contradictoires.
Exemple actuel à traiter comme conflit documentaire : campagne 2025/26, une ligne de travail mentionne 6 541 kg tandis qu'une autre mentionne ticket nº 6139 / 7 943 kg.
Le logiciel doit afficher « contradiction à rapprocher des originaux » jusqu'à résolution par pièce source / relevé San Juan.

### 4. Sécurité / serveur

- déploiement Coolify seulement après validation de l'architecture par Anselme ;
- authentification individuelle ;
- MFA ;
- stockage privé du BAÚL ;
- OCR / analyse de préférence côté serveur privé ;
- pas d'envoi automatique de documents sensibles à un service externe sans décision explicite.

### 5. Règle produit

Le dossier métier doit rester compréhensible par les frères et sœurs sans connaissance d'Azoth Studio, GitHub, OCR, localStorage ou Coolify.
