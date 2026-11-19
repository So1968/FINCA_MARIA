# Intégration vérifiée des évolutions FINCA MARIA — 19 novembre 2026

## Périmètre et statut

La branche `feat/integration-finca-verifiee` rassemble les évolutions ouvertes et corrige leurs incompatibilités. Elle part de `main` à `4ebb5e55686da16334e270d2b98d73c8cbabb66b`. Elle ne fusionne pas dans `main` et ne déploie pas l’installation familiale. Les références d’origine sont conservées pour permettre la comparaison et un retour en arrière.

Le travail examine le dépôt et des environnements de test isolés. Il n’accède ni aux fichiers privés du PC familial, ni à ses volumes Docker, ni à ses comptes. Les assertions agricoles ne deviennent pas des faits vérifiés par cette intégration.

## Rapprochement des branches

Inventaire distant relevé avant création de la branche d’intégration : huit branches de travail et `main`.

| Proposition | Branche / révision examinée | Traitement |
|---|---|---|
| [#36](https://github.com/So1968/FINCA_MARIA/pull/36) | `feat/maison-interface-unifiee` · `a479add` | Intégrée : six rubriques, calendrier unique, compatibilité et protection des données MAISON. |
| [#34](https://github.com/So1968/FINCA_MARIA/pull/34) | `fix/documentary-claims-qualification` · `ce781be` | Intégrée : qualifications des informations agricoles et distinction entre documents et hypothèses. |
| [#31](https://github.com/So1968/FINCA_MARIA/pull/31) | `ux/terre-analyses-repliables-2026-11-11` · `e6a59f4` | Intégrée en conservant les qualifications documentaires et les accès MAISON. |
| [#35](https://github.com/So1968/FINCA_MARIA/pull/35) | `feature/calendrier-entretien-terre-2026-11` · `17e093a` | Intégrée puis corrigée : partage serveur, saisies, historique, anciennes campagnes et accès au dossier. |
| [#30](https://github.com/So1968/FINCA_MARIA/pull/30) | `feat/meeting-archives-registers` · `c01a1b8` | Intégrée : archives, reprise avec revue, Word et participation. La migration additive `010_meeting_archives.sql` est conservée. |
| [#33](https://github.com/So1968/FINCA_MARIA/pull/33) | `fix/local-password-recovery` · `10366ac` | Intégrée : récupération locale du compte existant et tests isolés. Aucun mot de passe réel modifié ici. |
| Contrôle des sauvegardes | `feat/controle-integrite-sauvegardes-2026-11-13` · `9a9d169` | Intégrée : audit en lecture seule des jeux chiffrés et tests des fichiers incomplets/altérés. |
| [#32](https://github.com/So1968/FINCA_MARIA/pull/32) | `fix/maison-acces-direct-rubriques-2026-11-11` · `c6a41ab` | Corrections utiles déjà reprises sélectivement dans #36, notamment accès et checklist de départ. L’ancienne interface concurrente n’est pas réintroduite. Branche et PR conservées. |

Les conflits du tableau de bord, des commandes npm, de la CI et du runtime ont été résolus en conservant les fonctionnalités et les contrôles des deux côtés. Aucun historique Git n’est réécrit. Supprimer les branches avant validation de l’ensemble ferait perdre leurs points de comparaison ; elles restent disponibles.

## Défauts supplémentaires corrigés

| Référence | Défaut constaté | Correction et preuve reproductible |
|---|---|---|
| I01 | Le client partageait `finca_maria_entretien_terre_v1`, mais le serveur refusait cette clé. | Autorisation dans le périmètre administrateur uniquement. `test:integration:api` vérifie navigateur → API → PostgreSQL → autre navigateur et l’exclusion de TERRE de l’API familiale restreinte. |
| I02 | Le suivi TERRE pouvait remplacer un stockage invalide par un suivi vide et enregistrer une copie obsolète complète. | Blocage sans réécriture du stockage invalide ; seuls les champs changés sont rapprochés ; conflit explicite et version précédente historisée ; échec de quota récupérable. `test:integration:browser` et tests unitaires. |
| I03 | Les anciennes campagnes disparaissaient du sélecteur et les suivis non reconnus restaient invisibles. | Campagnes existantes et autres suivis accessibles ; statuts et parcelles historiques conservés dans les menus. |
| I04 | Liens profonds TERRE incomplets et préférences invalides pouvant masquer le contenu ; retours incohérents. | Cinq onglets adressables, historique précédent/suivant, retour Accueil, renvoi direct vers le dossier de visite et retour TERRE. `test:integration:browser`, 1280 et 390 pixels. |
| I05 | Une synchronisation pouvait recharger TERRE pendant une saisie ; les actions ne recevaient pas les mises à jour du même écran. | Actualisation des données sans rechargement sur le tableau de bord ; écoute des notifications locales pour les actions ; brouillons TERRE conservés. `earth-server.mjs` et suite Actions. |
| I06 | Deux formulaires MAISON pouvaient écraser mutuellement les champs non modifiés. | Comparaison avec la fiche à son ouverture, rapprochement des seuls champs modifiés, confirmation des conflits, historique de la version réellement remplacée. `test:house-concurrency:browser` contrôle les cinq formulaires sur ordinateur/téléphone, y compris un retrait de fiche pendant la saisie. |
| I07 | Deux réservations simultanées pouvaient réussir dans une chambre vide ; une modification obsolète pouvait écraser la précédente. | Verrou transactionnel du calendrier et précondition sur les champs lus. Réponse 409 aux modifications obsolètes, copie locale conservée lors du partage. Test réel avec requêtes concurrentes, même identifiant dans deux chambres, dates impossibles et longueurs excessives. |
| I08 | La nouvelle demande de visite pouvait présenter ASAJA comme un interlocuteur déjà confirmé. | Libellé et base documentaire indiquant que l’interlocuteur et la disponibilité restent à confirmer. Aucun service ni diagnostic sur place n’est déclaré vérifié. |

## Vérifications et commandes

Après `npm run setup`, avec Node 22 et le navigateur Playwright installé :

```bash
npm test
npm run test:house:browser
npm run test:house-concurrency:browser
npm run test:house-sync:browser
npm run test:integration:browser
npm run test:integration:api
```

`test:integration:api` lance son propre PostgreSQL éphémère et une API sur les ports de boucle locale 18534/18535 ; il exige Docker. Il utilise uniquement un compte `@example.test`, un BAÚL temporaire et des profils de test. Son nettoyage supprime uniquement son conteneur de test nommé pour le processus. La CI contrôle en complément la pile Coolify réelle, les comptes/droits, les archives et les régressions Réunions, les builds, les dépendances et la séparation FAMILY.

Les 12 liens Markdown locaux du README et des documents de premier niveau présents avant ce bilan ont une cible existante. Les liens de navigation utiles sont essayés dans les suites navigateur. Cela ne certifie ni la disponibilité permanente des sites externes ni les références présentes dans toutes les archives historiques.

## Limites avant installation

- Les anciennes applications qui n’envoient pas la nouvelle précondition restent compatibles ; elles ne bénéficient pas de son contrôle contre les modifications obsolètes. Mettre à jour ensemble le serveur et l’interface après validation.
- Le stockage du navigateur n’est pas une base transactionnelle entre onglets. Les formulaires relisent la version disponible avant l’écriture ; les conflits entre appareils sont traités par la version serveur et les copies locales de récupération.
- Les brouillons non enregistrés restent en mémoire jusqu’à fermeture ; l’avertissement de sortie n’est pas une sauvegarde après fermeture.
- Les données agricoles et le calendrier d’entretien restent documentaires ou provisoires lorsque les preuves originales/visites manquent. La rentabilité nette ne peut pas être certifiée sans charges exhaustives et rapprochement des justificatifs privés.
- L’installation familiale comporte des fichiers locaux et des réglages Compose privés : leur rapprochement et une sauvegarde restaurable doivent précéder toute installation validée. Aucun volume ni compte rendu familial n’est modifié par ce travail.
