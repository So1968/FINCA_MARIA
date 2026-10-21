# FINCA MARIA V42 — Stockage serveur du BAÚL et des données

## Objectif

Faire du serveur administré via Coolify le lieu principal de stockage opérationnel de FINCA MARIA, afin que les preuves, métadonnées, réponses, comptes rendus et sauvegardes ne reposent plus sur le PC personnel.

Le PC devient un poste client. Il ne doit plus être la seule source de vérité.

## Principe d'architecture

```text
Navigateur
  -> HTTPS
  -> passerelle d'authentification / MFA
  -> API FINCA MARIA
      -> PostgreSQL : métadonnées, comptes, rôles, actions, journaux
      -> stockage documentaire serveur : BAÚL
      -> sauvegardes externes chiffrées
```

L'application React ne doit pas écrire directement dans PostgreSQL ni dans les fichiers du serveur. Toute écriture passe par l'API authentifiée.

## Ce qui doit quitter progressivement le PC

1. Réponses familiales et recoupements actuellement dans localStorage.
2. Questions, anomalies, missions et historiques d'actions.
3. Comptes rendus de réunions et décisions.
4. Métadonnées du BAÚL : catégorie, date, source, statut de preuve, liens entre pièces.
5. Documents du BAÚL : PDF, photos, scans, tableurs, courriers, exports.
6. Journal des accès et modifications.

Les originaux locaux ne sont pas supprimés pendant la migration. On conserve une phase de double vérification jusqu'à validation de l'intégrité des copies serveur.

## Choix de stockage

### PostgreSQL

Utiliser PostgreSQL pour les données structurées :

- utilisateurs et identifiants externes OIDC ;
- rôles ;
- missions ;
- réponses ;
- chronologie ;
- preuves et métadonnées ;
- index documentaire ;
- décisions familiales ;
- journal d'audit.

La base n'est jamais exposée publiquement. Elle reste sur le réseau interne Coolify.

### BAÚL documentaire

Les fichiers doivent être stockés hors du conteneur applicatif sur un stockage persistant serveur.

Deux options à faire valider par Anselme :

**Option A — volume serveur dédié**
- simple sur un seul serveur ;
- chemin persistant monté uniquement dans l'API ;
- sauvegarde indépendante obligatoire.

**Option B — stockage objet S3 compatible**
- plus facile à sauvegarder, versionner et migrer ;
- possibilité d'utiliser un stockage S3 externe ou un service compatible géré séparément ;
- accès uniquement via l'API et URL temporaires si nécessaire.

Pour FINCA MARIA, privilégier l'option la plus simple qu'Anselme puisse maintenir correctement. Le stockage serveur ne doit jamais être considéré comme une sauvegarde à lui seul.

## Séparation des données

Prévoir au minimum les espaces logiques suivants :

- `TIERRAS/`
- `CASA/`
- `BAUL/`
- `EXPORTS/`
- `QUARANTAINE_IMPORT/`

Dans `BAUL`, conserver la logique de compartiments existante et ne jamais écraser silencieusement un original.

## Règles d'intégrité documentaire

Pour chaque fichier importé :

- identifiant unique ;
- nom d'origine ;
- taille ;
- type MIME ;
- date d'import ;
- utilisateur ayant importé ;
- empreinte SHA-256 ;
- statut de classement ;
- catégorie ;
- niveau de preuve `[P]`, `[D]`, `[C]`, `[H]` si applicable ;
- référence vers le document source ou l'événement associé.

Une nouvelle version d'un document ne remplace pas physiquement l'ancienne sans trace.

## Sécurité d'accès aux fichiers

- Aucun répertoire BAÚL servi comme dossier web public.
- Aucun lien permanent devinable vers les pièces sensibles.
- Vérification de session et rôle pour chaque téléchargement.
- Les lecteurs peuvent consulter les documents autorisés.
- Les éditeurs peuvent ajouter et modifier les métadonnées prévues.
- Les administrateurs gèrent accès, rôles et opérations sensibles.
- Les suppressions réelles doivent être exceptionnelles, journalisées et protégées par ré-authentification forte.

## Migration depuis le PC

### Phase 1 — Inventaire

Avant transfert :

- inventorier le BAÚL privé ;
- compter les fichiers ;
- calculer les empreintes SHA-256 ;
- repérer les doublons sans supprimer ;
- séparer originaux, copies, exports et fichiers temporaires.

### Phase 2 — Copie serveur

- copier, ne pas déplacer ;
- conserver les noms d'origine dans les métadonnées ;
- enregistrer les empreintes avant et après transfert ;
- vérifier le nombre de fichiers et le volume total ;
- produire un rapport d'import.

### Phase 3 — Vérification

La migration est considérée comme valide seulement si :

- nombre de fichiers source = nombre de fichiers attendus ;
- empreintes source = empreintes serveur ;
- un échantillon de documents s'ouvre correctement ;
- les liens dans FINCA MARIA pointent vers les bonnes pièces ;
- une sauvegarde externe du nouveau stockage a été réalisée.

### Phase 4 — Bascule

Après validation, le serveur devient la source opérationnelle principale. Le PC conserve une copie de secours temporaire, puis seulement les fichiers nécessaires au travail local.

## Sauvegardes

Mettre en place une règle 3-2-1 adaptée :

- copie active sur le serveur ;
- sauvegarde indépendante locale ou sur un autre support ;
- sauvegarde hors serveur / S3 compatible.

Pour PostgreSQL : sauvegarde planifiée Coolify + copie S3 compatible.

Pour le BAÚL : sauvegarde séparée du volume ou réplication du stockage objet. La sauvegarde de l'instance Coolify ne couvre pas automatiquement les volumes applicatifs.

Prévoir :

- sauvegarde quotidienne ;
- rétention ;
- chiffrement ;
- test de restauration mensuel ;
- sauvegarde manuelle avant migration ou mise à jour importante.

## Chiffrement

- HTTPS en transit.
- Chiffrement du disque/volume côté serveur si l'infrastructure le permet.
- Sauvegardes externes chiffrées.
- Secrets hors Git.
- Aucune clé de chiffrement stockée dans le même dépôt que les données protégées.

## Journal d'audit

Enregistrer au minimum :

- connexion/déconnexion ;
- import de fichier ;
- téléchargement de fichier sensible ;
- modification de métadonnée ;
- changement de rôle ;
- suppression ou restauration ;
- export familial ou expert.

Le journal ne doit pas stocker les mots de passe, secrets, tokens ou contenu intégral des documents.

## Points à valider avec Anselme

1. Nom exact et configuration du serveur qui hébergera Coolify.
2. Capacité disque disponible et stratégie d'extension.
3. Volume local dédié ou stockage S3 compatible pour le BAÚL.
4. PostgreSQL géré dans Coolify ou stack Compose.
5. Emplacement et chiffrement des sauvegardes externes.
6. Politique de rétention.
7. Domaine FINCA MARIA et domaine d'authentification.
8. Solution d'identité / MFA définitive.
9. Liste initiale des utilisateurs et rôles.
10. Procédure de restauration complète testable.

## Condition de bascule

Ne pas effacer les données du PC tant que :

- le transfert n'est pas vérifié par empreintes ;
- les sauvegardes ne sont pas opérationnelles ;
- une restauration test n'a pas été faite ;
- Anselme n'a pas validé l'architecture serveur et le plan de reprise.
