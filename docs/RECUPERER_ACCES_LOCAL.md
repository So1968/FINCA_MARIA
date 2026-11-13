# Rétablir l’accès à un compte FINCA MARIA

Cette procédure est réservée à la personne autorisée à administrer l’installation
Docker locale. Elle réinitialise un compte existant ; elle ne récupère pas l’ancien
mot de passe, n’ouvre aucun accès public et ne désactive pas l’authentification.

Depuis un vrai terminal Linux, lancer le script du dépôt :

```bash
python3 scripts/recover-finca-account.py
```

Le premier mot de passe demandé par `sudo` est celui du compte Linux. Ensuite,
saisir l’adresse mail du compte FINCA MARIA et deux fois le **nouveau** mot de passe
FINCA MARIA (12 à 200 caractères). La saisie du mot de passe est masquée. Ne pas
saisir le mot de passe dans ChatGPT, Codex, une ligne de commande ou une variable
d’environnement. Le script refuse une saisie non interactive ou non masquée.

Le script utilise le conteneur `finca_maria-finca-api-1`, lit le code réellement
installé dans `src/server.js` et s’arrête s’il ne reconnaît pas précisément le
format scrypt utilisé. Il ne démarre pas une deuxième API. Il utilise la connexion
PostgreSQL déjà configurée dans ce conteneur, sans afficher ses secrets.

Une transaction modifie le hachage du compte demandé, révoque uniquement ses
sessions et inscrit une trace d’audit sans secret. Un compte inconnu, désactivé
ou d’un format non reconnu est refusé. Aucun nouveau compte n’est créé, aucun
rôle ni état d’activation n’est changé, aucune réunion ni aucun fichier n’est
modifié. En cas d’erreur avant validation, la transaction est annulée.

Après réussite, le script tente d’ouvrir le navigateur sur le port réellement
publié par `finca_maria-finca-web-1`. Se connecter avec l’adresse et le nouveau mot
de passe. Le script ne peut pas confirmer une connexion réelle tant que cette
connexion n’a pas été effectuée dans le logiciel.

Ne jamais envoyer le nouveau mot de passe à un assistant ni publier les fichiers
de configuration. La récupération n’exige ni reconstruction d’image, ni redémarrage,
ni changement de droits Docker, ni suppression de données.

## Vérifications automatisées

- `npm test` : confirmation, refus d’entrée non interactive/non masquée, absence du
  secret dans les arguments et sorties, ouverture du port Docker détecté.
- `npm run test:account-recovery:api` : PostgreSQL éphémère isolé, compte ciblé et
  autres comptes, sessions, rôles, archives, refus des comptes inconnus/inactifs,
  refus d’un code installé incompatible et annulation sur erreur d’audit.

Les tests n’utilisent que des données fictives. Ne jamais les pointer vers la base
familiale. Le test API crée son propre conteneur `finca-recovery-test-*` et le retire
à la fin ; aucun volume de l’installation n’est monté.
