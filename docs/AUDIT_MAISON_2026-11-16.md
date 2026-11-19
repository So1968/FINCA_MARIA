# MAISON — audit fonctionnel et corrections du 16 novembre 2026

## Objet et versions

Objectif : une seule interface MAISON, avec six rubriques directement accessibles, des réservations conservées et des fonctions utilisables sur ordinateur et téléphone.

Sources inspectées :

| Source | Version / emplacement | Méthode et limite |
|---|---|---|
| S01 | `main`, commit `4ebb5e55686da16334e270d2b98d73c8cbabb66b` | Lecture des composants, des stockages et des points de montage. Les défauts initiaux ci-dessous sont établis par le code ; ils ne prétendent pas reproduire l'installation du poste familial. |
| S02 | PR #32, commit `c6a41aba7d965ff51129cc96cf4c1397b8b0122b` | Comparaison du diff avec S01. Réemploi sélectif du modèle de contrôles de départ et des principes de résolution des anciens liens. Aucune fusion de cette branche. |
| S03 | Branche `feat/maison-interface-unifiee` | Contrôles des modifications et essais sur des profils de navigateur isolés, avec données de test et anciens formats représentatifs. |
| S04 | Même branche, commit `722e3696d950d6987b4fa78ab7776d2f14f0f07d`, relecture du 19 novembre 2026 | Reproduction des quatre défauts d'accueil ci-dessous avec le vrai composant de partage et des réponses API simulées. Les quatre scénarios échouaient avant correction. |
| S05 | Même branche, commit `d519c3734365f793e7674fa9888cd07b35fd5ee5`, contrôle des formulaires du 19 novembre 2026 | Reproduction de M17 sur les cinq formulaires à 1280 px avant correction ; vérification après correction à 1280 et 390 px avec les vrais dialogues du navigateur. |

Les données du poste de Sofia, les volumes de son installation et ses documents originaux ne sont pas accessibles dans cet environnement. Ils n'ont pas été modifiés. Les tests ne certifient pas leur contenu ni leur état réel.

## Constats, corrections et critères de vérification

| ID | Constat sur S01 et critère demandé | Preuve de code initiale | Priorité et correction |
|---|---|---|---|
| M01 | Plusieurs portes d'entrée MAISON et rubriques intermédiaires, contrairement au parcours direct demandé | `FincaMariaDashboard.jsx`, `HOUSE_TABS` et bloc `area === "maison"` ; `FincaHouseExperience.jsx`, navigation à quatre étapes | P1 : accès direct depuis l'accueil vers les six rubriques, sans seconde navigation MAISON sur l'accueil. |
| M02 | Calendrier masqué à l'ouverture et deux implémentations concurrentes | `FincaHouseExperience.jsx`, `openSection = null` et section `arrivee-reservation` masquée ; `FincaHouseBookingCalendarMount.jsx` | P1 : un seul composant de réservation, calendrier mensuel ouvert par défaut. Ancien point de montage supprimé. |
| M03 | Une lecture pouvait devenir une réécriture destructive de données non reconnues | Ancien `normalizeBookings` : filtre sur chambres connues et dates ; `useEffect` réécrivant ensuite `PRESENCES_KEY` | P1 : aucune écriture à l'ouverture ; chambres anciennes, séjours incomplets, champs et entrées inconnus conservés. Un stockage illisible est signalé et protégé. |
| M04 | Réservation sans véritable modification ; retrait sans copie dans le parcours principal | `confirmBooking` et `removeSelectedBooking` dans l'ancien `FincaHouseExperience.jsx` | P1 : formulaire de création/modification, contrôle des chevauchements et annulation précédée d'une copie conservée. Historique et restauration disponibles. |
| M05 | Inventaire structuré dépendant d'une injection tardive, sans modification d'objet | `FincaHouseInventoryMount.jsx`, `resolveHost`, `persist`, `addItem`, `removeItem` | P1 : rubrique directe, édition, filtres, recherche, quantités incluant zéro, archive/restauration et anciennes notes libres. Les objets documentaires modifiés ne sont plus comptés deux fois. |
| M06 | Ménage et réparations dispersés entre textes et points de montage | `CortijoHousePortal.jsx`, `menage` ; `FincaOperationsMount.jsx`, `StayChecklistPanel` et `MaintenancePanel` | P2 : Entretien rassemble checklists, responsables, échéances, avancement et historique. Conservation des anciennes clés et identifiants des coches. |
| M07 | Le suivi jardin proposait des noms de photos, sans import d'image, ni registre d'interventions planifiées | Ancien `CortijoHousePortal.jsx`, section `patio-jardin` | P2 : calendrier filtrable, interventions, réalisation, observations, photos visibles et points d'historique. Les repères de photos antérieurs restent disponibles. |
| M08 | Le guide recopiait les notes personnelles et le lien ne transportait pas les données locales | Ancien `buildGuideText` et affichage `visitorMode` : inclusion de `familyNote` | P1 : liste explicite des seuls champs publics, exclusion des archives et lieux non conseillés ; copie, partage et fichier HTML autonome. L'aperçu n'écrit pas dans les stockages de gestion. |
| M09 | Échecs de stockage peu ou pas visibles | `localStorage.setItem` dans les effets de l'ancien portail et de l'ancien parcours | P1 : erreur visible, saisie conservée en mémoire, nouvelle tentative, protection au départ de la page et fusion avec les changements reçus d'un autre onglet. |
| M10 | Le partage rechargeait la page entière lors d'une mise à jour | `FincaSharedSyncMount.jsx`, `window.location.reload()` dans `syncNow` | P1 : dans MAISON, notification des composants sans rechargement ; conservation du formulaire en cours. Copie locale des réservations écartées ou annulées ailleurs et des états refusés pour conflit de version. |
| M11 | Les anciens liens pouvaient viser une section cachée ou non montée | PR #32 et ancien `revealLegacy`, défilement sans ouverture fiable | P1 : résolution explicite de `presences`, `arrivee-reservation`, `preparer-chambres`, `menage`, `depart-maison`, `patio-jardin`, `visite` et `reglements`. |
| M12 | Des fichiers source privés pouvaient rendre les images Docker inutilisables | Essai local avec fichiers en mode privé : erreur `EACCES /srv/src/server.js`, copie initiale appartenant à root et exécution par node | P1 : propriétaires explicites pour les sources API et les fichiers statiques Nginx. La correction conserve les utilisateurs d'exécution et l'authentification existants. |

La priorité mesure l'impact sur la mission. Les constats de lecture du code ont une preuve forte pour ce comportement de code, sans extrapolation à une installation familiale non inspectée.

## Recontrôle du 19 novembre 2026

La synchronisation est aussi montée sur l'accueil et TERRE. Sur S04, les protections de MAISON dépendaient de `houseView()` dans `migrateLegacyLocal`, `pushLocalChanges`, `applyRemote` et `syncNow` (`FincaSharedSyncMount.jsx`). Le parcours restant à contrôler était donc une ouverture de l'accueil avant d'entrer dans MAISON.

| ID | Défaut reproduit sur S04 | Priorité et impact | Correction et preuve de contrôle |
|---|---|---|---|
| M13 | Un séjour local sans dates, avec partage déjà initialisé, disparaissait de la liste locale lors de l'adoption du serveur depuis l'accueil | P1 : un ancien enregistrement conservé dans MAISON pouvait être écarté avant même d'y entrer | Filtrage des seuls séjours partageables et conservation des autres sur tous les écrans. Scénario « Accueil : ancien séjour incomplet » de `tests/browser/house-sync.mjs`, puis accueil → MAISON dans `house-server.mjs`. |
| M14 | Le texte brut `{invalid` du stockage des réservations était remplacé depuis l'accueil | P1 : la copie locale illisible était perdue, contrairement à l'exigence de conservation | Validation des stockages MAISON avant le partage, indépendamment de l'écran ; suspension et conservation du texte brut. Scénario « Accueil : stockage Maison illisible », puis accueil et TERRE dans le test serveur. |
| M15 | Une ancienne note locale différente de la note distante était remplacée à la première connexion depuis l'accueil, sans copie de récupération | P1 : le contenu local antérieur n'était plus récupérable par ce parcours | Copie avant adoption du serveur sur tous les écrans. Scénario « Accueil : première connexion », complété avec le serveur réel. |
| M16 | Un quota simulé refusait l'écriture d'une note distante mais le bouton annonçait « Synchronisé » à l'accueil | P2 : les données restaient sur le serveur mais la confirmation de leur présence locale était fausse | Une écriture MAISON ou de sa base de comparaison refusée produit un état d'erreur, sur tous les écrans. Scénario « Accueil : quota pendant le partage ». |

La preuve est forte pour ces scénarios de navigateur isolés. Les quatre contrôles échouaient sur S04 et réussissent après correction ; ils sont ajoutés à la CI. Les réponses simulées permettent de reproduire les fautes du client, tandis que `house-server.mjs` contrôle séparément les parcours avec API authentifiée et PostgreSQL. Aucune observation n'est extrapolée au poste familial.

## Protection des saisies en cours — contrôle complémentaire du 19 novembre

**M17 — Remplacement silencieux d'un formulaire non enregistré (P2, preuve forte).** Le critère est la conservation des saisies demandée pour MAISON. Sur S05, cliquer sur « Modifier » d'une autre fiche remplaçait le contenu en cours sur les cinq formulaires : réservation, inventaire, entretien, intervention du jardin et sortie. Le calendrier pouvait aussi vider une nouvelle réservation en préparation. Les fonctions `edit` et les gestionnaires correspondants appelaient `markDraft(false)` puis remplaçaient le formulaire sans contrôle. Rouvrir la même fiche pouvait donc également effacer la saisie et retirer l'avertissement de fermeture. L'impact démontré concerne le travail non enregistré ; les fiches déjà stockées n'étaient pas modifiées par ces clics.

La correction centralise le contrôle dans `useHouseDraft` (`HouseUI.jsx`). Ouvrir une autre fiche ou préparer une réservation depuis le calendrier demande confirmation si une saisie est en cours. Refuser conserve les champs. Rouvrir la même fiche préserve le formulaire sans confirmation ; ouvrir une fiche depuis un formulaire intact reste direct. Le bouton explicite « Abandonner la modification » conserve son rôle.

`verifyDraftProtection` dans `tests/browser/house.mjs` reproduisait le défaut sur les cinq formulaires de S05. Après correction, dix parcours (cinq formulaires × deux largeurs) vérifient le refus et l'acceptation du remplacement, le retour de rubrique, la réouverture de la même fiche, le véritable dialogue `beforeunload`, l'absence d'écriture avant enregistrement, la sauvegarde explicite et la fermeture sans avertissement après sauvegarde. Ces essais utilisent uniquement des données de test isolées ; aucune sauvegarde automatique de brouillon n'est ajoutée.

## Organisation livrée

- Calendrier et réservations : mois précédent/suivant, retour au mois courant, occupants, chambres, recherche, séjours anciens, création, modification, conflits, annulations et couchages, y compris les chambres anciennes ajoutées au plan.
- Inventaire : catégories et besoins, objets, quantités, édition, recherche, archives, repères documentaires et notes anciennes.
- Entretien : checklists de séjour et de départ, travaux, responsables, échéances, avancement, archives et historique.
- Jardin : laurier, cerisier et citronnier, observations, repères photographiques anciens, import de photos, interventions datées et historique.
- Fonctionnement : eau, électricité, clés, eau chaude, déchets, sécurité, équipements, repères de visite et règlements historiques.
- Sorties : fiches, avis et filtres, notes privées séparées, aperçu et guide transportable sans dépendre du stockage de l'autre appareil.

Les anciens conseils du jardin sont présentés comme un projet familial d'août 2026 à confirmer, pas comme une expertise agronomique nouvelle.

## Conservation et compatibilité

Les clés `finca_maria_maison_presences_v1`, `finca_maria_maison_notes_v1`, `finca_maria_jardin_suivi_v1`, `finca_maria_lieux_vacanciers_v1`, `finca_maria_inventaire_maison_v1`, `finca_maria_entretien_maison_v1`, `finca_maria_sejour_checklist_v1`, `finca_maria_couchages_plan_v1` et `finca_maria_chambres_preparation_v1` sont réutilisées. Le contrôle de départ de la PR #32 conserve aussi sa clé historique.

Les écritures ciblées préservent les autres propriétés. Les identifiants dupliqués sont distingués pour qu'une modification ou une annulation ne traite pas deux anciennes fiches à la fois. Les anciennes notes restent lisibles. Aucun appel de remise à zéro globale du stockage n'est ajouté.

Les fiches d'inventaire, les lieux et les travaux sont archivés, pas effacés. Une annulation de séjour est copiée dans la clé de corbeille historique avant son retrait du calendrier actif. La restauration crée un nouvel identifiant et conserve la référence d'origine ; elle n'essaie pas de réutiliser une identité déjà protégée par la corbeille du serveur.

Le partage serveur autorise en plus les deux clés MAISON déjà existantes pour les annulations et le suivi de départ. Il n'y a pas de migration SQL, de changement de compte ou de désactivation d'authentification. Les copies de récupération restent locales et portent le préfixe inclus dans les sauvegardes de l'application.

Avant l'application du serveur, les modifications locales refusées et les autres saisies restées en attente sont copiées, y compris lors de la première connexion. Un test réel provoque un refus de modification de réservation et vérifie que ses dates ainsi qu'une note non encore envoyée restent récupérables. Une erreur de quota pendant l'application du partage est signalée et la récupération est retentée après libération de l'espace. Les anciens accès `?area=maison` affichent aussi l'état du partage.

## Vérifications reproductibles

| Contrôle | Commande / preuve | Portée |
|---|---|---|
| Données et règles | `npm test`, tests `house-data.test.mjs` | Liens anciens, chevauchements, dates impossibles, données inconnues, identifiants dupliqués, inventaire non doublé, récupération et guide échappé sans notes privées. |
| Interface locale | `npm run test:house:browser` | Parcours sur 1280 × 900 et 390 × 900 ; profils séparés, anciennes données représentatives, création/modification, archivage/restauration, jardin et photo, guide, rechargement, stockage corrompu, quota et mises à jour entre onglets. |
| Partage depuis l'accueil | `npm run test:house-sync:browser` | Vrai composant et routes API simulées : conservation d'un ancien séjour incomplet, stockage illisible, copie avant première connexion et erreur de quota. Aucun compte familial ni serveur réel utilisé pour ces quatre scénarios. |
| Serveur réel | `tests/browser/house-server.mjs`, appelé dans le test runtime CI | Navigateur → API authentifiée → PostgreSQL → second navigateur ; contrôle de la conservation du formulaire lors d'une mise à jour, annulation partagée et restauration. Uniquement compte `@example.test` et hôte de boucle locale. |
| Régressions adjacentes | CI FINCA MARIA existante | Actions, Réunions, préparation, recherche, registre, builds, séparation FAMILY, dépendances, configuration et pile Docker. Aucun de ces modules métier n'est refondu. |

Les captures de navigateur ne contiennent que des données de test. Les essais automatisés de copie/partage et d'impression contrôlent les appels du navigateur ; ils ne certifient pas un service de messagerie ni une imprimante physique.

## Limites et validation avant installation

- Les tests portent sur le code et les formats représentatifs disponibles, pas sur une copie des données personnelles du poste familial.
- Les photos du jardin sont des copies d'affichage réduites ; conserver les fichiers originaux dans le BAÚL. Un import est refusé avec un message explicite avant de dépasser la taille partageable du dossier jardin.
- Une donnée ancienne incomplète est conservée et peut être corrigée ; son absence du calendrier ne vaut pas disparition de son enregistrement.
- Les formulaires non enregistrés restent en mémoire pendant l'ouverture de la page. Leur conservation après fermeture exige un enregistrement explicite ; l'avertissement de fermeture ne constitue pas une sauvegarde de brouillon.
- Le partage entre appareils exige une session et un serveur disponibles. Les copies de récupération locales doivent être sauvegardées sur leur appareil.
- Un stockage MAISON illisible suspend le partage global jusqu'à sa correction ; il est signalé et conservé, sans remise à zéro automatique, même depuis l'accueil ou TERRE.
- Les informations documentaires sur la maison et les anciens conseils ne deviennent pas des faits de terrain vérifiés du seul fait de cette refonte.
- La fusion, le rapprochement avec les fichiers privés du poste et le déploiement nécessitent la validation demandée. Cette branche ne déploie rien automatiquement.
