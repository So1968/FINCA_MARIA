# Intégration dans main — 19 septembre 2026

Le déploiement reste sur `main`. Cette intégration réunit l'historique de main
(12 commits propres sur le terrain/GPS) et celui de finca-maria-consolidation.
La branche `finca-maria` n'est pas modifiée.

- Pile conservée : Nginx, API Node, PostgreSQL, BAÚL privé, audit, sauvegardes.
- Démarrage React : composants Maison et synchronisation conservés, styles GPS
  conservés, ajout de mission initiale sans écraser une mission déjà modifiée.
- Terrain : 30 témoins au registre ; O01–O15 constituent la première série GPS.
  Les états locaux de l'ancien registre sont repris si le nouveau est absent.
- Positions GPS des arbres raccordées à l'état partagé ; progression personnelle
  de la tournée du jour laissée sur l'appareil. Le carnet mobile autonome garde
  ses imports/exports JSON et KML, avec un script externe compatible CSP.
- Accès Terrain & GPS et Carnet mobile depuis TERRE ; GPS autorisé pour le même
  site avec permission du navigateur. Le carnet reste derrière l'authentification.
- Ancien comptage 181 clairement identifié comme dépassé ; référence actuelle
  92 + 186 = 278 oliviers, distincte du registre témoin.

Configuration Coolify attendue : branche main, Compose racine
`docker-compose.coolify.yml`, domaine `https://finca-maria.duckdns.org` sur
`finca-web:8080`, APP_ORIGIN identique. Les secrets et le certificat sont à
configurer dans Coolify, pas dans Git. Voir COOLIFY_HANDOFF.md.

Un test CI vert ne confirme pas à lui seul le build pack choisi dans Coolify,
les variables, les volumes du serveur réel, HTTPS ou la copie hors serveur.

## Sortie de Vercel

Le 19 septembre 2026, le connecteur Vercel du compte `so1968s-projects` renvoie
zéro projet. GitHub renvoie zéro webhook sur `So1968/AZOTH_STUDIO`.
Les fichiers `vercel.json` à la racine, dans `app/` et dans `app/family-static-v2/`
interdisent les déploiements Git pour ces anciennes racines de projet.
Aucun workflow du dépôt ne déploie vers Vercel.
L'installation GitHub de l'application Vercel reste à contrôler depuis les
paramètres GitHub : le jeton disponible ne permet pas de lister ces installations.
Ne pas déclarer la révocation de cette autorisation réalisée sans confirmation.
