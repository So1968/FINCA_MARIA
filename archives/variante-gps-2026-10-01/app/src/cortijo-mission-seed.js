const MISSIONS_STORAGE_KEY = "cortijo_custom_missions_v1";
const SEED_STORAGE_KEY = "cortijo_seed_oliviers_2026_08_18_v4";

const mission = {
  id: "mission-oliviers-reperes-2026-08-18",
  title: "Confirmer et géolocaliser les 15 oliviers repères",
  category: "Terrain",
  assignedTo: "Sofia",
  dueAt: "2026-08-18",
  notifyAt: "2026-08-18",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  contactWhatsapp: "",
  instructions: "Le contour jaune de la capture Google Earth est validé par la famille : tout ce qui se trouve à l'intérieur correspond à l'oliveraie María. Les 15 arbres O01 à O15 sont des candidats répartis sur toute l'oliveraie. Sur le téléphone, ouvrir CORTIJO → Terrain → Mode terrain GPS, activer la position, sélectionner l'arbre, puis appuyer sur « Je suis sur Oxx · enregistrer ici » dès que l'arbre candidat est confirmé sur place. Vérifier qu'il est accessible, représentatif et facile à reconnaître ; remplacer seulement les candidats qui ne conviennent pas. Pour chaque arbre confirmé : photo entière depuis un point de vue reproductible, photo du tronc, GPS enregistré dans CORTIJO, puis vidéo arbre entier → couronne → tronc → feuilles → olives → sol. Une fois les 15 GPS enregistrés, exporter le KML CORTIJO pour conserver et partager les repères dans Google Earth.",
  priority: "Haute",
  createdAt: "2026-08-17",
  status: "À faire"
};

try {
  if (localStorage.getItem(SEED_STORAGE_KEY) !== "done") {
    const current = JSON.parse(localStorage.getItem(MISSIONS_STORAGE_KEY) || "[]");
    const missions = Array.isArray(current) ? current : [];
    const index = missions.findIndex((item) => item?.id === mission.id);
    if (index >= 0) {
      missions[index] = { ...mission, ...missions[index] };
    } else {
      missions.unshift(mission);
    }
    localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(missions));
    localStorage.setItem(SEED_STORAGE_KEY, "done");
  }
} catch {
  // Le démarrage de CORTIJO ne doit jamais être bloqué par une donnée locale illisible.
}
