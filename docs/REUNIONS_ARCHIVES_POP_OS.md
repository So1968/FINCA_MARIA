# Réunions : installation et reprise locales sur Pop!_OS

Cette branche est à examiner dans une PR, sans fusion automatique. Aucune des cinq
archives réelles n’est incluse dans Git. Les tests utilisent exclusivement des
noms, documents et comptes rendus fictifs. Le développeur ne dispose pas de votre
PostgreSQL local et ne peut donc pas affirmer avoir corrigé les cinq lignes réelles.

## 1. Préserver l’installation avant de la mettre à jour

Ne pas exécuter `git reset --hard`, `git clean`, ni une commande Docker supprimant
les volumes. Ne pas remplacer le fichier actif du module par celui de GitHub.
Ne pas supprimer `.bak-demo` ou `docker-compose.local.yml`.

Depuis le dépôt installé, créer un dossier privé **hors du dépôt public**. Le script
suivant ne touche qu’au dossier privé neuf :

```bash
bash scripts/snapshot-meetings-installation.sh "$HOME/finca-prive-avant-archives"
```

Si le script n’est pas encore dans votre version, le consulter dans la PR puis
l’enregistrer hors du dépôt et le lancer depuis le dépôt installé. Il copie les
trois fichiers locaux signalés, conserve le commit installé et le diff local.
Ne jamais commiter, partager ou envoyer ces copies et ces patches à GitHub.

Sauvegarder PostgreSQL et l’intégralité des archives avant toute reconstruction.
Utiliser la commande de sauvegarde déjà configurée et vérifier sa restauration.
Pour un export SQL supplémentaire, adapter **les fichiers Compose et le nom du
service** à l’installation existante (`docker compose … config --services`) :

```bash
# Exemple avec le service de la configuration fournie par le dépôt :
docker compose -f docker-compose.finca.yml -f docker-compose.local.yml exec -T finca-db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$HOME/finca-prive-avant-archives/base-avant.sql"
```

Une sortie vide ou une commande en erreur n’est pas une sauvegarde valide.
Protéger ce dossier et les sauvegardes avec des permissions privées. Conserver
également la sauvegarde chiffrée habituelle des fichiers BAÚL/audio et sa clé.
Ne pas publier la sortie de `docker compose config` : elle peut contenir des secrets.

## 2. Rapprocher les modifications, dans une copie distincte

Récupérer la branche de la PR puis créer un worktree distinct, sans basculer ni
nettoyer le dépôt actif :

```bash
git fetch origin feat/meeting-archives-registers
git worktree add --detach ../FINCA_MARIA-candidate origin/feat/meeting-archives-registers
```

Comparer le fichier actif sauvegardé, `meetings-base.jsx` et le fichier candidat.
Un rapprochement à trois versions peut être produit **dans le dossier privé** :

```bash
git merge-file --diff3 -p \
  "$HOME/finca-prive-avant-archives/app/src/components/FincaMeetingsHub.jsx" \
  "$HOME/finca-prive-avant-archives/meetings-base.jsx" \
  ../FINCA_MARIA-candidate/app/src/components/FincaMeetingsHub.jsx \
  > "$HOME/finca-prive-avant-archives/meetings-proposition.jsx"
```

Un code de sortie 1 signale des conflits à résoudre. Examiner chaque changement,
retirer les marqueurs de conflits et tester dans le candidat. Ne pas recopier le
résultat sur l’installation active avant cette vérification. Comparer les deux
fichiers Compose à part : garder les chemins de volumes, le nom de projet, les
ports et les variables propres à l’installation. Le fichier `.bak-demo` reste local.

## 3. Tester puis déployer la version rapprochée

Utiliser Node 22, `npm ci --prefix app` et `npm ci --prefix server`, puis `npm test`.
Les tests navigateur sont listés dans `package.json`. Le test API des archives
(`npm run test:meeting-archives:api`) utilise un conteneur PostgreSQL éphémère
nommé `finca-archive-test-*`, sans réutiliser les volumes de l’installation.

Pour une répétition de restauration, utiliser une machine ou un projet Docker
**distinct**, avec d’autres ports et des volumes neufs. Ne pas démarrer une
seconde pile sur les volumes actifs. Après restauration testée et rapprochement
validé, reconstruire les images web/API de la configuration existante, avec son
nom de projet habituel. Ne pas changer les volumes de PostgreSQL et des archives.
Les quatre services (web, API, PostgreSQL, sauvegardes) doivent rester présents.
La migration `010_meeting_archives.sql` ajoute des tables et le statut `unknown` ;
elle ne réimporte ni ne supprime aucune réunion et ne change pas les présences
historiques déjà enregistrées.

Contrôler la connexion, la liste des cinq archives, leur texte original, les
sauvegardes et le téléchargement d’une source avant de reprendre les données.
Revenir aux anciennes images avec les sauvegardes conservées en cas d’échec ;
ne pas tenter de remettre les données à zéro pour résoudre un problème de démarrage.

## 4. Reprendre les cinq archives sans réimporter

Pour chacune des archives des 28 janvier, 11, 18 et 25 mars et 1er avril 2022 :

1. Ouvrir sa fiche existante, puis « Vérifier les participants et repères de cette archive ».
2. Analyser : seuls les libellés explicites sont proposés. Le texte original est visible.
3. Corriger les noms, présences, sujets, synthèse, décisions/propositions/actions,
   responsables et échéances à partir de la source. Ajouter les informations omises.
4. Laisser « Non renseigné » quand la présence n’est pas attestée. Ne pas confirmer
   un vote non abouti. Distinguer les homonymes par un libellé explicite.
5. Cocher la validation humaine puis enregistrer. Relancer le même aperçu est sans
   duplication ; les lignes de même nom et les repères de même texte sont actualisés.

L’opération est additive : retirer une ligne de l’aperçu ne supprime pas une ligne
existante. Modifier le texte d’un repère constitue un nouveau repère : corriger les
repères existants depuis leur fiche plutôt que réextraire un texte modifié.
Les versions de compte rendu déjà validées restent des copies figées.

Le compte rendu **n° 2 de 2022** reste un traitement distinct. Son numéro déclenche
un avertissement et une confirmation de date obligatoire. Si la date est ambiguë,
ne pas enregistrer avant vérification humaine. Aucune date existante n’est corrigée
par la reprise. Les dates en toutes lettres et celles des tableaux complexes
peuvent nécessiter une saisie manuelle.

## 5. Word et registres

Importer un `.docx` par le bouton Word, choisir une nouvelle réunion ou une réunion
existante, analyser puis vérifier. Aucun séparateur de huit tirets n’est requis.
Les anciens `.doc` binaires doivent être enregistrés en `.docx` dans Word ou
LibreOffice. Limites : fichier 10 Mio, XML principal 2 Mio, texte 100 000 caractères,
200 propositions de participants et 200 repères par reprise. L’original Word est
stocké dans PostgreSQL et téléchargeable avec authentification ; il entre donc
dans la sauvegarde de la base. Aucun appel à un service d’analyse extérieur.

La recherche du registre s’applique côté serveur avant le plafond de 5 000
résultats. Affiner l’année, le sujet, le responsable et le statut si ce plafond
est atteint. La fiche conserve l’accès à l’original et aux documents BAÚL rattachés.

Le calculateur utilise : **présences / (présences + absences + excuses)** sur la
période sélectionnée. Les inconnus sont affichés séparément et exclus du taux.
Sans présence connue, le taux est « non calculable ». Une personne est recensée
uniquement si elle possède une ligne dans la période. L’absence de ligne dans une
autre réunion reste inconnue et ne démontre pas qu’elle était invitée. Les noms
identiques sont regroupés sans distinction de casse, sans rapprochement approximatif.
Les chiffres ne sont fiables qu’après vérification et reprise des archives utiles.
