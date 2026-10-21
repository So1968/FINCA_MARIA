export const HOUSE_INVENTORY_KEY = "finca_maria_inventaire_maison_v1";

export const houseInventoryCategories = [
  "Meubles",
  "Literie",
  "Électroménager",
  "Vaisselle",
  "Outils",
  "Matériel agricole léger",
  "Linge de maison",
  "Décoration",
  "Équipement extérieur",
  "Produits d’entretien",
  "Matériel de sécurité",
  "Autre"
];

export const houseInventoryStatuses = [
  "Présent",
  "À remplacer",
  "Cassé",
  "Manquant",
  "Prêté",
  "À acheter",
  "À vérifier"
];

// Éléments actuels documentés par les relevés / photos de l’inventaire lingerie.
// Ne pas transformer une quantité non confirmée en nombre arbitraire.
export const documentedHouseInventory = [
  {
    id: "linge-120-bleu-fleurs",
    object: "Ensemble complet bleu clair / fleurs",
    category: "Linge de maison",
    room: "Emplacement exact à confirmer",
    quantity: 1,
    size: "120",
    status: "Présent",
    evidenceStatus: "Photographié le 25/08/2026",
    note: "Taille normale 120. Peut dépanner sur un lit 140 en tirant bien, mais ne doit pas être compté comme une parure 140 normale."
  },
  {
    id: "linge-140-blanc",
    object: "Ensemble complet blanc uni",
    category: "Linge de maison",
    room: "Emplacement exact à confirmer",
    quantity: 1,
    size: "140",
    status: "Présent",
    evidenceStatus: "Photographié le 25/08/2026",
    note: "Compté comme une parure complète 140."
  },
  {
    id: "serviette-ronds-rouges-jaunes",
    object: "Serviette / essuie-bain fond clair à grands ronds rouges et jaunes",
    category: "Linge de maison",
    room: "Emplacement exact à confirmer",
    quantity: 1,
    size: "À mesurer",
    status: "Présent",
    evidenceStatus: "Photographié le 25/08/2026",
    note: "La dimension n’a pas été mesurée ; ne pas lui attribuer une taille non vérifiée."
  },
  {
    id: "linge-flanelle-hiver-120-140",
    object: "Linge d’hiver en flanelle pour lits 120 / 140",
    category: "Linge de maison",
    room: "Emplacement exact à confirmer",
    quantity: null,
    size: "120 / 140",
    status: "À vérifier",
    evidenceStatus: "Présence signalée le 25/08/2026",
    note: "Quantité et type exacts non établis : ne pas compter de nombre de parures avant vérification."
  }
];

// Ces objets figurent dans les documents familiaux historiques. Ils ne sont PAS
// considérés comme présents aujourd’hui tant qu’un contrôle actuel ne les confirme pas.
export const historicalHouseInventoryToVerify = [
  {
    id: "historique-machine-laver",
    object: "Machine à laver",
    category: "Électroménager",
    room: "Buanderie / emplacement actuel à vérifier",
    quantity: null,
    status: "À vérifier",
    evidenceStatus: "Mention historique — règlement familial 2015",
    note: "Le document historique indique une machine mise à disposition ; présence, modèle et état actuels à contrôler."
  },
  {
    id: "historique-etendage",
    object: "Étendage",
    category: "Autre",
    room: "Buanderie / emplacement actuel à vérifier",
    quantity: null,
    status: "À vérifier",
    evidenceStatus: "Mention historique — règlement familial 2015",
    note: "Présence et état actuels à contrôler."
  },
  {
    id: "historique-planche-repasser",
    object: "Planche à repasser",
    category: "Autre",
    room: "Buanderie / emplacement actuel à vérifier",
    quantity: null,
    status: "À vérifier",
    evidenceStatus: "Mention historique — règlement familial 2015",
    note: "Présence et état actuels à contrôler."
  },
  {
    id: "historique-fer-repasser",
    object: "Fer à repasser",
    category: "Électroménager",
    room: "Buanderie / emplacement actuel à vérifier",
    quantity: null,
    status: "À vérifier",
    evidenceStatus: "Mention historique — règlement familial 2015",
    note: "Présence et état actuels à contrôler."
  }
];

// Points minimums à contrôler avant de tirer une conclusion sur l’accueil.
// "Repéré" veut seulement dire qu’une entrée actuelle existe dans l’inventaire :
// cela ne vaut ni test de fonctionnement ni validation de sécurité.
export const houseEssentialChecks = [
  {
    id: "cuisine-evier-eau",
    area: "Cuisine",
    label: "Évier / point d’eau",
    priority: "P1",
    keywords: ["évier", "evier", "robinet", "point d'eau", "point d’eau"],
    note: "Vérifier présence, arrivée d’eau, évacuation et absence de fuite."
  },
  {
    id: "cuisine-cuisson",
    area: "Cuisine",
    label: "Moyen de cuisson",
    priority: "P1",
    keywords: ["cuisinière", "cuisiniere", "gazinière", "gaziniere", "four", "plaque de cuisson", "plaques de cuisson"],
    note: "Vérifier l’appareil réellement disponible, son alimentation et son fonctionnement."
  },
  {
    id: "cuisine-froid",
    area: "Cuisine",
    label: "Réfrigération",
    priority: "P1",
    keywords: ["réfrigérateur", "refrigerateur", "frigo", "congélateur", "congelateur"],
    note: "Vérifier au minimum un appareil de froid fonctionnel pour un séjour."
  },
  {
    id: "cuisine-vaisselle",
    area: "Cuisine",
    label: "Vaisselle / ustensiles de base",
    priority: "P2",
    categories: ["Vaisselle"],
    keywords: ["assiette", "verre", "couvert", "casserole", "poêle", "poele", "plat", "ustensile"],
    note: "Une entrée de vaisselle prouve seulement que l’inventaire a commencé ; la quantité suffisante reste à contrôler selon le nombre de personnes."
  },
  {
    id: "sanitaires-wc",
    area: "Sanitaires",
    label: "WC",
    priority: "P1",
    keywords: ["wc", "toilette", "toilettes"],
    note: "Vérifier chasse, arrivée d’eau, évacuation, fermeture et absence de fuite."
  },
  {
    id: "sanitaires-douche",
    area: "Sanitaires",
    label: "Douche / bain",
    priority: "P1",
    keywords: ["douche", "baignoire", "salle de bain", "salle d'eau", "salle d’eau"],
    note: "Vérifier qu’au moins un espace de douche ou bain est réellement utilisable."
  },
  {
    id: "sanitaires-lavabo",
    area: "Sanitaires",
    label: "Lavabo / vasque",
    priority: "P1",
    keywords: ["lavabo", "vasque"],
    note: "Vérifier eau, évacuation et étanchéité."
  },
  {
    id: "sanitaires-eau-chaude",
    area: "Sanitaires",
    label: "Eau chaude",
    priority: "P1",
    keywords: ["eau chaude", "chauffe-eau", "chauffe eau", "ballon d'eau chaude", "ballon d’eau chaude", "cumuls", "cumulus"],
    note: "Vérifier le système, son énergie, sa capacité et son fonctionnement réel."
  },
  {
    id: "securite-electricite",
    area: "Sécurité",
    label: "Électricité / tableau",
    priority: "P0/P1",
    keywords: ["tableau électrique", "tableau electrique", "disjoncteur", "électricité", "electricite"],
    note: "Le simple repérage d’un tableau ne constitue pas un contrôle de sécurité électrique."
  },
  {
    id: "securite-fermetures",
    area: "Sécurité",
    label: "Portes / fenêtres / fermetures",
    priority: "P1/P2",
    keywords: ["serrure", "fermeture", "porte", "fenêtre", "fenetre", "volet", "clé", "cle"],
    note: "Vérifier les fermetures réellement utilisées, notamment avant une mise à disposition à des tiers."
  }
];

// Repères historiques propres au Cortijo. Ils servent uniquement de guide
// de contrôle sur place et ne sont jamais promus automatiquement en inventaire actuel.
export const houseEquipmentClues = [
  {
    id: "repere-historique-sdb-haut",
    area: "Sanitaires",
    label: "Salle de bain haut",
    source: "Règlement familial historique",
    status: "Existence historique mentionnée — état 2026 à vérifier"
  },
  {
    id: "repere-historique-sdb-bas",
    area: "Sanitaires",
    label: "Salle de bain bas",
    source: "Règlement familial historique",
    status: "Existence historique mentionnée — état 2026 à vérifier"
  },
  {
    id: "repere-historique-buanderie",
    area: "Sanitaires / entretien",
    label: "Buanderie",
    source: "Règlement familial historique",
    status: "Existence historique mentionnée — état 2026 à vérifier"
  }
];

export const inventoryAuditCategories = houseInventoryCategories.map((category) => ({
  category,
  status: documentedHouseInventory.some((item) => item.category === category)
    ? "Inventaire commencé"
    : "À inventorier"
}));

export function normalizeUserInventory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object" && item.id && item.object);
}

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function checkMatchesItem(check, item) {
  if (!item || item.status !== "Présent") return false;
  if (check.categories?.includes(item.category)) return true;
  const haystack = normalized(`${item.object} ${item.category} ${item.room} ${item.note}`);
  return (check.keywords || []).some((keyword) => haystack.includes(normalized(keyword)));
}

export function getHouseEssentialSummary(userInventory = []) {
  const current = [...documentedHouseInventory, ...normalizeUserInventory(userInventory)];
  const checks = houseEssentialChecks.map((check) => {
    const matches = current.filter((item) => checkMatchesItem(check, item));
    return {
      ...check,
      matches,
      inventoryStatus: matches.length ? "Repéré dans l’inventaire actuel" : "À vérifier sur place"
    };
  });
  return {
    checks,
    repereCount: checks.filter((item) => item.matches.length).length,
    total: checks.length,
    remainingCount: checks.filter((item) => !item.matches.length).length
  };
}

export function getInventorySummary(userInventory = []) {
  const user = normalizeUserInventory(userInventory);
  const current = [...documentedHouseInventory, ...user];
  const knownQuantity = current.reduce((total, item) => {
    const quantity = Number(item.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
  return {
    current,
    currentEntries: current.length,
    knownQuantity,
    toVerifyHistorical: historicalHouseInventoryToVerify.length,
    categoriesStarted: new Set(current.map((item) => item.category).filter(Boolean)).size,
    categoriesTotal: houseInventoryCategories.length
  };
}
