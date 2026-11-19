// Contenu familial repris du portail existant ; aucune donnée utilisateur remplacée.
export const GUIDE_STATUSES = new Set(["Testé — coup de cœur", "À conseiller", "Testé — sympa"]);
export const STATUS_ORDER = {
  "Testé — coup de cœur": 0,
  "À conseiller": 1,
  "Testé — sympa": 2,
  "À compléter": 3,
  "À tester": 4,
  "Ne plus conseiller": 5
};

export const visitSequence = [
  { id: "acces", title: "Accès et arrivée", text: "Montrer l'arrivée, le portail / l'entrée, le chemin jusqu'à la maison et le point où l'on entre réellement." },
  { id: "vie", title: "Pièces de vie", text: "Photographier les pièces dans l'ordre où on les découvre pour comprendre immédiatement comment elles communiquent." },
  { id: "cuisine", title: "Cuisine", text: "Montrer l'organisation, les rangements utiles, les appareils et ce qu'il faut savoir pour vivre dans la maison." },
  { id: "couchages", title: "Chambres et couchages", text: "Une fiche par chambre ou espace de couchage : emplacement, nombre de couchages, rangement et particularités." },
  { id: "sanitaires", title: "Salle(s) d'eau et sanitaires", text: "Montrer où ils se trouvent, ce qui est disponible et les éventuelles consignes utiles." },
  { id: "exterieurs", title: "Extérieurs et annexes", text: "Patio, jardin, dépendances, stockage et accès extérieurs seront ajoutés dans la continuité de la visite." }
];

export const infrastructureSections = [
  ["Clés et accès", "Où sont les clés, quelles portes elles ouvrent, qui possède un double."],
  ["Eau", "Arrivée d'eau, coupure générale, points utiles et consignes à connaître."],
  ["Électricité", "Tableau, compteur, coupure générale et équipements importants."],
  ["Eau chaude", "Emplacement et fonctionnement du système d'eau chaude."],
  ["Déchets", "Où stocker et où déposer les déchets pendant et après un séjour."],
  ["Sécurité", "Fermetures, points sensibles et gestes à faire avant de quitter la maison."]
];

export const householdSections = [
  { title: "Avant l'arrivée", items: ["Aérer et remettre les pièces en service", "Préparer les couchages nécessaires", "Vérifier cuisine, salle d'eau et consommables", "Signaler ce qui manque ou ce qui ne fonctionne pas"] },
  { title: "Pendant le séjour", items: ["Garder cuisine et sanitaires en état", "Gérer linge et couchages utilisés", "Sortir les déchets", "Noter les achats communs ou les besoins de remplacement"] },
  { title: "Avant le départ", items: ["Ranger et nettoyer les espaces utilisés", "Traiter le linge utilisé", "Vider ce qui doit l'être", "Fermer la maison et remettre les clés à leur place", "Signaler les incidents, casses ou besoins d'entretien"] }
];

export const patioTrees = [
  {
    id: "laurier-central",
    species: "Laurier central",
    location: "Patio central, à proximité de la zone de stationnement",
    problem: "Trop haut et très dense ; plusieurs grandes pousses verticales ; branches vers la voiture ; branches basses gênantes ; masse qui ferme le patio.",
    objective: "Gagner de l'espace et de la lumière tout en conservant une ombre utile et en facilitant circulation et stationnement.",
    shape: "Grand parasol bas, naturel et légèrement asymétrique ; plus de volume côté jardin, beaucoup moins côté voiture ; tronc davantage visible.",
    target: "Hauteur à terme : environ 3 à 3,5 m maximum. Largeur : environ 2,5 à 3 m.",
    intervention: ["Supprimer ou raccourcir les branches basses gênantes.", "Réduire les branches qui avancent vers la voiture.", "Rabattre les 2 ou 3 grandes pointes verticales.", "Aérer légèrement le centre.", "Reculer puis corriger uniquement les défauts évidents de silhouette."],
    rules: ["Jamais de coupe horizontale façon taille-haie.", "Rabattre chaque branche sur une ramification latérale.", "Ne pas laisser de gros moignons.", "Conserver les grosses charpentières principales.", "Garder un sommet irrégulier et naturel."],
    period: "Après le 15 août si les températures restent plus douces ; intervenir de préférence par temps sec et éviter une taille sévère si une nouvelle forte chaleur arrive.",
    intensity: "20 à 30 % maximum du volume lors de cette première intervention. Grandes pointes : réduction d'environ 80 cm à 1,20 m selon leur structure. Côté voiture : certaines branches peuvent être raccourcies d'environ 50 à 80 cm.",
    photoState: "Photos déjà prises : vue générale du laurier et proximité avec la voiture."
  },
  {
    id: "cerisier",
    species: "Cerisier",
    location: "Patio, au-dessus / à proximité immédiate du citronnier",
    problem: "Il devient trop haut pour une récolte facile et sa couronne fait de l'ombre au citronnier situé dessous.",
    objective: "Garder les cerises accessibles, ouvrir le centre et créer davantage de lumière pour le citronnier sans remonter la couronne.",
    shape: "Gobelet bas et ouvert ; 3 ou 4 charpentières principales conservées ; forme large, basse et aérée.",
    target: "Hauteur à terme : environ 2,20 à 2,50 m ; fruits accessibles depuis le sol ou avec un petit marchepied.",
    intervention: ["Conserver les grosses charpentières basses.", "Rabattre progressivement les pousses trop hautes sur des ramifications latérales.", "Supprimer les petites branches qui se croisent.", "Enlever le bois mort.", "Éclaircir légèrement le centre.", "Raccourcir en priorité les branches qui couvrent le citronnier."],
    rules: ["Ne pas remonter la couronne.", "Pas de rabattage brutal.", "Réduction progressive, éventuellement poursuivie lors d'une intervention ultérieure."],
    period: "Après le 15 août : réduction légère et progressive ; intervenir de préférence par temps sec et éviter une grosse taille en cas de retour de forte chaleur.",
    intensity: "Environ 10 à 20 % maximum de la ramure cette fois-ci.",
    photoState: "Photos déjà prises : vue générale du cerisier, rapport de volume avec les autres arbres et photo réelle annotée montrant les pousses hautes, les charpentières à conserver et la zone centrale à éclaircir."
  },
  {
    id: "citronnier",
    species: "Citronnier",
    location: "Sous le cerisier",
    problem: "Il souffre de la présence du cerisier : manque de lumière et ombre de la couronne ; concurrence racinaire possible pour l'eau et les nutriments.",
    objective: "Créer une véritable fenêtre de lumière au-dessus du citronnier et améliorer ses conditions sans faire monter le cerisier.",
    shape: "Pas de forme de taille définie dans la synthèse : la priorité est d'améliorer son environnement lumineux.",
    target: "Recevoir davantage de soleil direct et surveiller sa réaction après l'allègement du cerisier.",
    intervention: ["Abaisser globalement le cerisier plutôt que remonter sa couronne.", "Alléger plus spécifiquement la partie de la couronne située au-dessus du citronnier.", "Surveiller l'arrosage du citronnier.", "Surveiller sa nutrition et sa réaction après intervention."],
    rules: ["Ne pas attribuer automatiquement le problème à une seule cause : lumière, eau et nutriments sont à surveiller.", "La synthèse ne fixe pas de taille propre du citronnier à réaliser maintenant."],
    period: "Suivi après l'intervention sur le cerisier ; observer l'évolution de la lumière, de l'arrosage et de la vigueur.",
    intensity: "Aucune intensité maximale de taille du citronnier n'est définie dans la synthèse. Ne pas inventer de rabattage : priorité au dégagement du cerisier.",
    photoState: "Photo à faire : une vue montrant simultanément le tronc du cerisier et le citronnier entier pour déterminer précisément les branches à raccourcir ou supprimer afin de créer le puits de lumière."
  }
];

export const defaultTouristPlaces = [
  { id: "torcal", name: "El Torcal de Antequera", zone: "Antequera", category: "Nature", duration: "Demi-journée", note: "Paysages karstiques spectaculaires et balade. Un des grands classiques à conseiller depuis le Cortijo.", status: "À conseiller" },
  { id: "antequera", name: "Antequera", zone: "Antequera", category: "Ville & patrimoine", duration: "Demi-journée / journée", note: "Centre historique, patrimoine et balade en ville. Facile à combiner avec El Torcal.", status: "À conseiller" },
  { id: "malaga", name: "Málaga", zone: "Málaga", category: "Ville & mer", duration: "Journée", note: "Vieille ville, port, musées, promenade et possibilité de finir par la mer.", status: "À conseiller" },
  { id: "nerja-frigiliana", name: "Nerja & Frigiliana", zone: "Axarquía", category: "Mer & village", duration: "Journée", note: "Une journée facile à conseiller pour associer côte, vues et village blanc.", status: "À conseiller" },
  { id: "caminito", name: "Caminito del Rey", zone: "Ardales / El Chorro", category: "Nature & randonnée", duration: "Journée", note: "Excursion spectaculaire. À préparer à l'avance selon les conditions d'accès et les réservations.", status: "À conseiller" },
  { id: "ronda", name: "Ronda", zone: "Serranía de Ronda", category: "Ville & paysage", duration: "Journée", note: "Belle excursion à la journée pour le paysage, le centre historique et les points de vue.", status: "À conseiller" },
  { id: "villanueva", name: "Villanueva del Rosario & alentours", zone: "Autour du Cortijo", category: "Proximité", duration: "Quelques heures", note: "Pour une sortie proche : village, campagne et balades dans les environs sans faire une grosse journée de route.", status: "À compléter" },
  { id: "colmenar", name: "Colmenar / secteur Peña Negra – Tajo del Dornillo", zone: "Montes de Málaga", category: "Nature", duration: "Demi-journée", note: "Repère local à conserver dans les idées de balade. Détails pratiques à compléter au fil des visites.", status: "À compléter" }
];

export const STAY_GROUPS = [
  {
    title: "Avant l'arrivée",
    items: [
      "Aérer et remettre les pièces en service",
      "Vérifier eau, électricité et eau chaude",
      "Préparer les couchages nécessaires",
      "Contrôler cuisine, sanitaires et consommables"
    ]
  },
  {
    title: "Pendant le séjour",
    items: [
      "Noter les réparations ou anomalies constatées",
      "Gérer le linge et les couchages utilisés",
      "Sortir les déchets et maintenir les sanitaires",
      "Noter les achats communs et ce qui manque"
    ]
  },
  {
    title: "Avant le départ",
    items: [
      "Ranger et nettoyer les espaces utilisés",
      "Traiter le linge utilisé",
      "Vider ce qui doit l'être et sortir les déchets",
      "Fermer eau, fenêtres, accès et remettre les clés à leur place"
    ]
  }
];
