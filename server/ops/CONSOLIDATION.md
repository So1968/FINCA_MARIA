# Reprise de consolidation — 19 septembre 2026

Travail sur `main`, sans modification de `finca-maria`.
Architecture conservée : frontend, Nginx, Node, PostgreSQL, BAÚL privé et sauvegardes.

## Données du navigateur

- Présences / réservations : API `/api/reservations`, PostgreSQL ; ne pas doubler
  `finca_maria_maison_presences_v1` dans `shared_state`.
- Préparation des chambres : API `/api/room-ready`.
- État partagé : notes Maison, jardin, tourisme, checklist séjour, entretien,
  couchages, inventaire, actions, faits, relances, affectations, contacts,
  équipe, missions personnalisées, questions et anomalies v44, contrôles
  familiaux v42, mission terrain et registre des arbres témoins.
- État propre à l'appareil : navigation, prénom du formulaire, notifications,
  date d'export local et métadonnées de synchronisation.
- Les anciennes notifications éventuellement en base ne sont plus renvoyées
  ni acceptées en écriture ; leur suppression physique n'est pas nécessaire.
- La synchronisation conserve son mécanisme existant de cache navigateur et
  rafraîchissement périodique. Une clé nouvellement raccordée reprend la donnée
  serveur si elle existe ; sinon la copie locale est envoyée même sur un appareil
  déjà initialisé. Les modifications simultanées d'une même donnée restent à
  éprouver en conditions réelles avant ouverture aux utilisateurs.

## Sécurité et interface

Les deux rôles administrateurs utilisent le même contrôle serveur. Le libellé
`admin-secretariat` devient « Administration complète ». L'audit déjà présent
reste visible en gouvernance ; son API n'expose plus les valeurs avant/après.
Ces valeurs restent conservées dans l'historique PostgreSQL.

Les `add_header` des blocs Nginx `location` supprimaient l'héritage des en-têtes
serveur. Les en-têtes, y compris `Cache-Control: private, no-store`, sont désormais
au même niveau. Référence : https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header

Le BAÚL en mode serveur n'invite plus à ouvrir un dossier local ni à relancer un
raccourci local. La limite d'import reste 120 Mo par fichier.

## Avant utilisation réelle

- Vérifier la déconnexion Vercel côté compte (non confirmée).
- Définir le serveur Coolify, le domaine, HTTPS et les comptes nominatifs.
- Tester le parcours navigateur avec deux administrateurs et deux appareils.
- Organiser les copies chiffrées hors serveur et les alertes de sauvegarde.
- Réaliser une restauration depuis une copie hors serveur ; voir README.md.
- Conserver 92 + 186 = 278 oliviers comme comptage de travail et les vraies
  vues aériennes. Maintenir la distinction [P], [C], [D], [H].
