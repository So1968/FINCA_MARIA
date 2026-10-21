# FINCA MARIA V42 — Règle permanente de lecture documentaire

## Principe non négociable

Aucun document entrant ne doit alimenter une conclusion, une question du board, une anomalie, une chronologie ou une décision tant qu'il n'a pas été lu et qualifié.

Le logiciel doit traiter chaque pièce comme une source documentaire à vérifier, pas comme une simple pièce jointe.

## Pipeline obligatoire à l'import

1. Calcul SHA-256 et détection des doublons.
2. Inventaire de la pièce : nom d'origine, format, taille, date d'entrée, lot.
3. Extraction native du texte lorsque le format le permet.
4. Lecture visuelle de la pièce.
5. OCR uniquement lorsque le texte n'est pas directement exploitable ou qu'une zone doit être récupérée.
6. Contrôle des champs sensibles : dates, noms, références, parcelles, recintos, surfaces, kilos, montants, rendements, numéros de ticket/facture/dossier.
7. Qualification de ce que le document prouve réellement et de ce qu'il ne prouve pas.
8. Détection des doublons logiques, pages d'un même document et pièces contradictoires.
9. Rapprochement avec les documents déjà connus.
10. Rapprochement automatique avec toutes les questions et anomalies ouvertes du board.
11. Une question déjà répondue par la nouvelle pièce doit être fermée ou reformulée sur le seul point encore manquant.
12. Toute incertitude, mauvaise lecture ou contradiction doit être envoyée en revue humaine. Le système n'invente jamais une valeur manquante.

## Statuts documentaires

- `recu` : pièce reçue mais non lue.
- `lecture_en_cours` : extraction/lecture en cours.
- `a_verifier` : champ ou lecture incertaine.
- `lu` : contenu extrait et contrôlé.
- `revise` : lecture validée et autorisée à produire des faits métier.
- `contradiction` : conflit avec une autre pièce à résoudre.

Seuls `lu` puis `revise` permettent de proposer des modifications du board. Seul `revise` permet de créer ou fermer un fait métier sans réserve.

## Fiche structurée obligatoire pour chaque document

Le système doit conserver au minimum :

- type de document ;
- date ;
- émetteur ;
- titulaire/destinataire ;
- numéro ou référence ;
- parcelles/recintos ;
- surfaces ;
- quantités ;
- montants ;
- ce que la pièce prouve ;
- ce qu'elle ne prouve pas ;
- liens avec d'autres pièces ;
- doublons ;
- niveau de confiance ;
- niveau de preuve FINCA MARIA `[P]`, `[D]`, `[C]` ou `[H]` ;
- statut de revue humaine.

## Règles de prudence métier

- Un ticket d'apport prouve un apport, pas automatiquement le total annuel.
- Plusieurs pages peuvent former un seul document ; elles ne doivent pas être comptées comme plusieurs preuves indépendantes.
- Une liquidation, un récapitulatif ou une répétition de ligne ne doit pas être additionné à nouveau sans preuve qu'il s'agit d'un apport distinct.
- Une OCR ne fait jamais foi seule : les chiffres et champs structurants doivent être contrôlés sur l'original.
- En cas de contradiction, conserver les deux lectures et signaler le conflit ; ne jamais écraser silencieusement l'ancienne valeur.
- Une surface cadastrale totale ne doit pas être transformée en surface d'oliviers sans source spécifique.
- Une donnée manquante reste `inconnue` ; aucune estimation n'est transformée en fait.

## Synchronisation du board

Après validation d'une nouvelle pièce, FINCA MARIA doit systématiquement :

1. rechercher les questions auxquelles la pièce répond ;
2. fermer celles qui sont entièrement résolues ;
3. reformuler celles qui ne sont que partiellement résolues ;
4. supprimer/archiver les questions devenues obsolètes ;
5. mettre à jour les anomalies concernées ;
6. créer une nouvelle question uniquement si un manque réel subsiste après lecture de toutes les pièces disponibles.

Exemple : si un justificatif PAC prouve le dépôt, le board ne doit plus demander « La PAC a-t-elle été déposée ? ». Il ne peut conserver que les points encore absents du justificatif ou non démontrés par les autres pièces.

## Architecture cible serveur

Cette règle doit être exécutée côté serveur, pas seulement dans React. Le frontend ne doit afficher que l'état du traitement et les propositions de rapprochement.

Architecture cible :

`BAÚL entrant -> stockage original immuable -> worker documentaire -> extraction/OCR -> fiche structurée -> moteur de rapprochement -> revue humaine si nécessaire -> mise à jour du board`

Le worker documentaire devra fonctionner sur le serveur FINCA MARIA, afin que l'analyse ne dépende plus du PC personnel et soit reproductible pour tous les futurs lots.

## Règle de gouvernance

Cette règle est permanente. Toute future évolution de FINCA MARIA doit la respecter. Une nouvelle fonctionnalité qui permettrait de créer des conclusions métier à partir d'un document non lu ou non qualifié est considérée comme une régression.
