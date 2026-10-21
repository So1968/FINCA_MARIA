export const cortijoHouseStatus = {
  reviewedAt: "2026-09-13",
  method: "État documentaire de gestion — ne remplace ni un diagnostic bâtiment ni une décision d'assureur",
  habitability: {
    status: "À vérifier",
    reason: "La maison est utilisée comme maison familiale, mais les pièces actuellement reliées ne permettent pas de conclure globalement sur son habitabilité sans vérifier toiture, humidité, eau chaude, sanitaires, électricité et fermetures."
  },
  rental: {
    status: "À vérifier / sous conditions",
    reason: "La capacité d'accueil, les équipements, les points de sécurité et les éventuels travaux bloquants ne sont pas encore tous vérifiés. Ne pas présenter la maison comme louable sans cette vérification."
  },
  capacity: {
    comfortable: null,
    maximum: null,
    status: "À calculer depuis les couchages réellement confirmés",
    reason: "Le logiciel permet déjà de renseigner les couchages chambre par chambre. Le total saisi peut être affiché comme capacité physique renseignée, mais la capacité confortable et la capacité maximale restent à valider avec les types de lits, le linge, les sanitaires et les règles de sécurité."
  },
  roomsExpected: [
    "La Hera",
    "La Golondrina",
    "La Matrimoniala",
    "La Cueva",
    "Las Alemanitas / Alemanitos"
  ],
  priorityLegend: [
    { code: "P0", label: "Danger / sécurité immédiate" },
    { code: "P1", label: "Urgent pour habiter" },
    { code: "P2", label: "Important pour louer" },
    { code: "P3", label: "Confort / amélioration" },
    { code: "P4", label: "Esthétique / embellissement" }
  ],
  works: [
    {
      id: "toiture-infiltrations-2026",
      title: "Toiture / infiltrations 2026",
      area: "Toiture + dégâts intérieurs",
      priority: "P1",
      priorityBasis: "[C] Classement de gestion lié à des infiltrations documentées ; aucune situation de danger immédiat n'est établie dans les pièces reliées.",
      type: "Habitabilité / assurance",
      status: "Devis demandé — dossier à compléter",
      evidence: "[CR] Le compte rendu familial du 08/05/2026 mentionne des infiltrations, un devis toiture demandé et un contact avec l'assurance pour les dégâts intérieurs. Il rapporte que l'assurance attendrait la fin des travaux de toiture et que la toiture elle-même ne serait pas prise en charge.",
      missing: [
        "devis toiture 2026",
        "diagnostic technique de la cause",
        "police / avenant actif en 2026",
        "déclaration de sinistre",
        "réponse écrite de l'assureur",
        "expertise éventuelle",
        "facture et preuve d'achèvement si travaux réalisés",
        "preuve d'indemnisation ou de remise en état intérieure"
      ],
      rentalImpact: "À vérifier avant toute présentation de la maison comme louable"
    },
    {
      id: "fosse-septique-estimation-2026",
      title: "Fosse septique — besoin à qualifier",
      area: "Assainissement",
      priority: "À qualifier",
      priorityBasis: "[CR] Une estimation pour une fosse septique est demandée dans le suivi familial, mais les pièces reliées ne permettent pas encore de dire s'il s'agit d'un remplacement nécessaire, d'une amélioration ou d'un projet futur.",
      type: "Habitabilité / équipement",
      status: "À chiffrer / à documenter",
      evidence: "[CR] Le compte rendu familial du 08/05/2026 comporte l'action : « Voir pour une estimation pour une fosse septique ».",
      missing: [
        "état du système d'assainissement actuel",
        "motif de la demande",
        "diagnostic ou constat",
        "devis / estimation",
        "urgence réelle et impact sur l'usage de la maison"
      ],
      rentalImpact: "Impossible à qualifier tant que l'état actuel de l'assainissement n'est pas documenté"
    }
  ],
  checksBeforeRentalDecision: [
    "Toiture / infiltrations et humidité",
    "Électricité et sécurité des accès",
    "Eau chaude et sanitaires",
    "Cuisine utilisable",
    "Fenêtres / portes et fermetures",
    "Couchages réellement disponibles",
    "Linge de maison et équipement minimum",
    "Assainissement",
    "Inventaire d'entrée / sortie et règlement de maison"
  ]
};

export function getHousePriorityCounts() {
  return cortijoHouseStatus.works.reduce((counts, item) => {
    counts[item.priority] = (counts[item.priority] || 0) + 1;
    return counts;
  }, {});
}
