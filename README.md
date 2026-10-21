# FINCA MARIA

Version autonome et publique de l’interface FINCA MARIA, extraite du dépôt privé AZOTH_STUDIO.

Ce dépôt contient uniquement la partie FINCA MARIA utile à l’équipe technique : situation de l’exploitation, dossiers & actions, synthèse et maison.

## Séparation volontaire

- Aucun autre projet AZOTH Studio n’est inclus.
- Le Baúl / coffre privé de preuves n’est pas inclus.
- Les données bancaires, identifiants sensibles et pièces justificatives privées ne sont pas publiés ici.

## Lancer le projet

Node.js 22.12 ou supérieur (Node.js 24 utilisé pour les vérifications). Les versions des dépendances sont fixées dans `package-lock.json`.

```bash
npm ci
npm run dev
```

Puis ouvrir l’adresse indiquée par Vite.

## Vues

- `/` : FINCA MARIA
- `/?view=cortijo-memoire&contact=san-juan` : dossiers & actions
- `/?view=cortijo-famille` : synthèse
- `/?view=cortijo-maison` : maison

- `/?view=cortijo-travaux` : travaux

## Sauvegarder et transférer son travail

En bas de chaque vue, **Mes sauvegardes** permet d’exporter les suivis d’actions, les travaux, les notes et les présences au format JSON. Conservez ce fichier hors du navigateur. Il contient des informations personnelles : ne le publiez pas dans Git.

Sur un autre appareil, **Importer une sauvegarde** affiche d’abord un aperçu. Rien n’est écrit avant de choisir **Fusionner cette sauvegarde**. Les éléments absents du fichier sont conservés ; pour un identifiant commun, les champs importés prennent la priorité. Une copie de l’état précédent est proposée au téléchargement avant la fusion. Vérifiez que votre navigateur a bien enregistré cette copie.

Les clés de stockage historiques sont conservées pour relire les données existantes. Les onglets d’un même navigateur se mettent à jour à réception des événements de stockage. Les modifications utilisent les données les plus récemment enregistrées ; cela ne constitue pas un service de synchronisation entre appareils. Deux modifications réellement simultanées d’un même champ peuvent encore se remplacer.

Si le stockage est plein ou inaccessible, un message signale les modifications conservées seulement en mémoire. Exportez-les avant de quitter la page. Les données illisibles ne sont jamais remplacées automatiquement. Un import invalide est refusé avant toute écriture ; si une écriture échoue pendant l’import, l’application tente de rétablir les valeurs précédentes et signale si ce retour échoue. Une fermeture brutale pendant l’import n’est pas une transaction garantie par le navigateur.

## Vérifications

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Les tests couvrent la compatibilité avec les données existantes, l’export/restauration, la fusion, le refus des fichiers invalides, les échecs de stockage et les dates de présence. Les tests de navigateur vérifient aussi les six rubriques, le clavier, la persistance, le transfert de sauvegarde, les erreurs de stockage et un écran mobile. GitHub Actions exécute ces tests et la compilation sur les propositions de modification et sur `main`.

## Confidentialité

Ce dépôt décrit une interface publique contenant des informations de gestion familiale. Vérifiez son niveau de visibilité avant tout ajout de données personnelles ou de documents. Le champ `private` du `package.json` empêche une publication npm accidentelle ; il ne rend pas le dépôt GitHub privé. Aucune synchronisation distante ni authentification n’est ajoutée par cette version.
