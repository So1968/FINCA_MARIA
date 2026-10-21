import { useEffect, useMemo, useState } from "react";

const PRESENCES_KEY = "finca_maria_maison_presences_v1";
const NOTES_KEY = "finca_maria_maison_notes_v1";
const GARDEN_KEY = "finca_maria_jardin_suivi_v1";
const TOURISM_KEY = "finca_maria_lieux_vacanciers_v1";

const HOUSE_SECTIONS = [
  { id: "visite", label: "Visite" },
  { id: "fonctionnement", label: "Fonctionnement" },
  { id: "menage", label: "Ménage" },
  { id: "presences", label: "Présences" },
  { id: "inventaire", label: "Inventaire" },
  { id: "patio-jardin", label: "Jardin" },
  { id: "sorties", label: "Sorties" }
];

const GUIDE_STATUSES = new Set(["Testé — coup de cœur", "À conseiller", "Testé — sympa"]);
const STATUS_ORDER = {
  "Testé — coup de cœur": 0,
  "À conseiller": 1,
  "Testé — sympa": 2,
  "À compléter": 3,
  "À tester": 4,
  "Ne plus conseiller": 5
};

const visitSequence = [
  { id: "acces", title: "Accès et arrivée", text: "Montrer l'arrivée, le portail / l'entrée, le chemin jusqu'à la maison et le point où l'on entre réellement." },
  { id: "vie", title: "Pièces de vie", text: "Photographier les pièces dans l'ordre où on les découvre pour comprendre immédiatement comment elles communiquent." },
  { id: "cuisine", title: "Cuisine", text: "Montrer l'organisation, les rangements utiles, les appareils et ce qu'il faut savoir pour vivre dans la maison." },
  { id: "couchages", title: "Chambres et couchages", text: "Une fiche par chambre ou espace de couchage : emplacement, nombre de couchages, rangement et particularités." },
  { id: "sanitaires", title: "Salle(s) d'eau et sanitaires", text: "Montrer où ils se trouvent, ce qui est disponible et les éventuelles consignes utiles." },
  { id: "exterieurs", title: "Extérieurs et annexes", text: "Patio, jardin, dépendances, stockage et accès extérieurs seront ajoutés dans la continuité de la visite." }
];

const infrastructureSections = [
  ["Clés et accès", "Où sont les clés, quelles portes elles ouvrent, qui possède un double."],
  ["Eau", "Arrivée d'eau, coupure générale, points utiles et consignes à connaître."],
  ["Électricité", "Tableau, compteur, coupure générale et équipements importants."],
  ["Eau chaude", "Emplacement et fonctionnement du système d'eau chaude."],
  ["Déchets", "Où stocker et où déposer les déchets pendant et après un séjour."],
  ["Sécurité", "Fermetures, points sensibles et gestes à faire avant de quitter la maison."]
];

const householdSections = [
  { title: "Avant l'arrivée", items: ["Aérer et remettre les pièces en service", "Préparer les couchages nécessaires", "Vérifier cuisine, salle d'eau et consommables", "Signaler ce qui manque ou ce qui ne fonctionne pas"] },
  { title: "Pendant le séjour", items: ["Garder cuisine et sanitaires en état", "Gérer linge et couchages utilisés", "Sortir les déchets", "Noter les achats communs ou les besoins de remplacement"] },
  { title: "Avant le départ", items: ["Ranger et nettoyer les espaces utilisés", "Traiter le linge utilisé", "Vider ce qui doit l'être", "Fermer la maison et remettre les clés à leur place", "Signaler les incidents, casses ou besoins d'entretien"] }
];

const patioTrees = [
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

const defaultTouristPlaces = [
  { id: "torcal", name: "El Torcal de Antequera", zone: "Antequera", category: "Nature", duration: "Demi-journée", note: "Paysages karstiques spectaculaires et balade. Un des grands classiques à conseiller depuis le Cortijo.", status: "À conseiller" },
  { id: "antequera", name: "Antequera", zone: "Antequera", category: "Ville & patrimoine", duration: "Demi-journée / journée", note: "Centre historique, patrimoine et balade en ville. Facile à combiner avec El Torcal.", status: "À conseiller" },
  { id: "malaga", name: "Málaga", zone: "Málaga", category: "Ville & mer", duration: "Journée", note: "Vieille ville, port, musées, promenade et possibilité de finir par la mer.", status: "À conseiller" },
  { id: "nerja-frigiliana", name: "Nerja & Frigiliana", zone: "Axarquía", category: "Mer & village", duration: "Journée", note: "Une journée facile à conseiller pour associer côte, vues et village blanc.", status: "À conseiller" },
  { id: "caminito", name: "Caminito del Rey", zone: "Ardales / El Chorro", category: "Nature & randonnée", duration: "Journée", note: "Excursion spectaculaire. À préparer à l'avance selon les conditions d'accès et les réservations.", status: "À conseiller" },
  { id: "ronda", name: "Ronda", zone: "Serranía de Ronda", category: "Ville & paysage", duration: "Journée", note: "Belle excursion à la journée pour le paysage, le centre historique et les points de vue.", status: "À conseiller" },
  { id: "villanueva", name: "Villanueva del Rosario & alentours", zone: "Autour du Cortijo", category: "Proximité", duration: "Quelques heures", note: "Pour une sortie proche : village, campagne et balades dans les environs sans faire une grosse journée de route.", status: "À compléter" },
  { id: "colmenar", name: "Colmenar / secteur Peña Negra – Tajo del Dornillo", zone: "Montes de Málaga", category: "Nature", duration: "Demi-journée", note: "Repère local à conserver dans les idées de balade. Détails pratiques à compléter au fil des visites.", status: "À compléter" }
];

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function loadTouristPlaces() {
  const saved = loadJson(TOURISM_KEY, null);
  if (!Array.isArray(saved)) return defaultTouristPlaces;
  const byId = new Map(saved.map((item) => [item.id, item]));
  const defaultIds = new Set(defaultTouristPlaces.map((item) => item.id));
  const mergedDefaults = defaultTouristPlaces.map((item) => ({ ...item, ...(byId.get(item.id) || {}) }));
  const custom = saved.filter((item) => item?.id && !defaultIds.has(item.id));
  return [...custom, ...mergedDefaults];
}

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "À préciser";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function placeRank(place) {
  return STATUS_ORDER[place.status] ?? 10;
}

function buildGuideText(places) {
  const lines = ["FINCA MARIA — Nos idées de sorties", ""];
  places.forEach((place) => {
    lines.push(`${place.name} — ${place.zone || ""}`.trim());
    lines.push(`${place.category || "Sortie"} · ${place.duration || "Durée à préciser"}`);
    if (place.note) lines.push(place.note);
    if (place.familyNote) lines.push(`Notre avis : ${place.familyNote}`);
    if (place.bestTime) lines.push(`Meilleur moment : ${place.bestTime}`);
    if (place.parking) lines.push(`Accès / parking : ${place.parking}`);
    if (place.practical) lines.push(`Bon à savoir : ${place.practical}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export function CortijoHousePortal() {
  const params = new URLSearchParams(window.location.search);
  const visitorMode = params.get("mode") === "vacanciers";
  const [presences, setPresences] = useState(() => loadJson(PRESENCES_KEY, []));
  const [notes, setNotes] = useState(() => loadJson(NOTES_KEY, {}));
  const [garden, setGarden] = useState(() => loadJson(GARDEN_KEY, {}));
  const [touristPlaces, setTouristPlaces] = useState(loadTouristPlaces);
  const [form, setForm] = useState({ name: "", arrival: "", departure: "", place: "", note: "" });
  const [placeForm, setPlaceForm] = useState({ name: "", zone: "", category: "", duration: "", note: "" });
  const [tourSearch, setTourSearch] = useState("");
  const [tourStatus, setTourStatus] = useState("Tous");
  const [tourCategory, setTourCategory] = useState("Toutes");
  const [copyState, setCopyState] = useState("");

  useEffect(() => { localStorage.setItem(PRESENCES_KEY, JSON.stringify(presences)); }, [presences]);
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(GARDEN_KEY, JSON.stringify(garden)); }, [garden]);
  useEffect(() => { localStorage.setItem(TOURISM_KEY, JSON.stringify(touristPlaces)); }, [touristPlaces]);
  useEffect(() => {
    if (visitorMode) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visitorMode]);

  function updateNote(key, value) { setNotes((current) => ({ ...current, [key]: value })); }
  function updateGarden(treeId, field, value) { setGarden((current) => ({ ...current, [treeId]: { ...(current[treeId] || {}), [field]: value } })); }

  function addPresence(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setPresences((current) => [...current, { ...form, id: `presence-${Date.now()}`, name: form.name.trim() }]);
    setForm({ name: "", arrival: "", departure: "", place: "", note: "" });
  }

  function removePresence(id) {
    if (!window.confirm("Retirer cette présence du planning ?")) return;
    setPresences((current) => current.filter((item) => item.id !== id));
  }

  function updateTouristPlace(id, patch) {
    setTouristPlaces((current) => current.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
  }

  function addTouristPlace(event) {
    event.preventDefault();
    if (!placeForm.name.trim()) return;
    setTouristPlaces((current) => [{
      id: `lieu-${Date.now()}`,
      name: placeForm.name.trim(),
      zone: placeForm.zone.trim() || "À préciser",
      category: placeForm.category.trim() || "À classer",
      duration: placeForm.duration.trim() || "À préciser",
      note: placeForm.note.trim(),
      status: "À tester",
      updatedAt: new Date().toISOString()
    }, ...current]);
    setPlaceForm({ name: "", zone: "", category: "", duration: "", note: "" });
  }

  function removeTouristPlace(id) {
    const place = touristPlaces.find((item) => item.id === id);
    if (!window.confirm(`Retirer « ${place?.name || "ce lieu"} » du carnet ?`)) return;
    setTouristPlaces((current) => current.filter((item) => item.id !== id));
  }

  function goToSection(id) {
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) target.open = true;
    window.history.replaceState(null, "", `/?view=cortijo-maison#${id}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const today = localToday();
  const sortedPresences = useMemo(() => [...presences].sort((a, b) => String(a.arrival || "9999").localeCompare(String(b.arrival || "9999"))), [presences]);
  const currentStay = sortedPresences.find((item) => item.arrival && item.arrival <= today && (!item.departure || item.departure >= today));
  const nextStay = currentStay || sortedPresences.find((item) => item.arrival && item.arrival >= today);
  const overdueGarden = patioTrees.filter((tree) => { const next = garden[tree.id]?.nextCheck; return next && next < today; });
  const gardenDueToday = patioTrees.filter((tree) => garden[tree.id]?.nextCheck === today);
  const touristCategories = useMemo(() => Array.from(new Set(touristPlaces.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")), [touristPlaces]);
  const guidePlaces = useMemo(() => touristPlaces.filter((place) => GUIDE_STATUSES.has(place.status)).sort((a, b) => placeRank(a) - placeRank(b) || a.name.localeCompare(b.name, "fr")), [touristPlaces]);
  const visibleTouristPlaces = useMemo(() => {
    const query = normalized(tourSearch);
    return [...touristPlaces]
      .filter((place) => tourStatus === "Tous" || place.status === tourStatus)
      .filter((place) => tourCategory === "Toutes" || place.category === tourCategory)
      .filter((place) => !query || normalized(`${place.name} ${place.zone} ${place.category} ${place.note} ${place.familyNote}`).includes(query))
      .sort((a, b) => placeRank(a) - placeRank(b) || a.name.localeCompare(b.name, "fr"));
  }, [touristPlaces, tourSearch, tourStatus, tourCategory]);

  async function copyGuide() {
    try {
      await copyText(buildGuideText(guidePlaces));
      setCopyState("Guide copié");
    } catch {
      setCopyState("Copie impossible");
    }
    window.setTimeout(() => setCopyState(""), 2500);
  }

  async function shareGuide() {
    const text = buildGuideText(guidePlaces);
    if (navigator.share) {
      try {
        await navigator.share({ title: "FINCA MARIA — Nos idées de sorties", text });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyGuide();
  }

  function gardenStatus(record) {
    if (record.nextCheck && record.nextCheck < today) return "Vérification en retard";
    if (record.nextCheck === today) return "À vérifier aujourd'hui";
    if (record.interventionDate) return "Intervention faite";
    return "À planifier";
  }

  if (visitorMode) {
    return (
      <main className="cortijoExportApp">
        <style>{`
          .fincaVisitorTools{display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0}.fincaVisitorTools button,.fincaVisitorTools a{min-height:44px;display:inline-flex;align-items:center;border:1px solid rgba(214,169,85,.3);border-radius:999px;padding:.55rem .85rem;background:rgba(214,169,85,.08);color:inherit;text-decoration:none;cursor:pointer}.fincaVisitorGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.8rem}.fincaGuideMeta{display:flex;gap:.35rem;flex-wrap:wrap;margin:.45rem 0}.fincaGuideMeta span{font-size:.78rem;opacity:.82}@media print{.fincaVisitorTools{display:none}.cortijoExportHero{padding-bottom:.5rem}.cortijoCard{break-inside:avoid}}
        `}</style>
        <section className="cortijoExportHero">
          <div><span className="cortijoExportEyebrow">FINCA MARIA — GUIDE VACANCIERS</span><h1>NOS ENDROITS À DÉCOUVRIR</h1><p>Une sélection familiale autour du Cortijo et de Málaga. Cette vue ne montre pas les informations privées de gestion de la maison.</p></div>
        </section>
        <div className="fincaVisitorTools">
          <a href="/?view=cortijo-maison#sorties">← Retour au carnet</a>
          <button type="button" onClick={copyGuide}>Copier le guide</button>
          <button type="button" onClick={shareGuide}>Partager</button>
          <button type="button" onClick={() => window.print()}>Imprimer</button>
          {copyState && <span>{copyState}</span>}
        </div>
        <div className="fincaVisitorGrid">
          {guidePlaces.map((place) => (
            <article className="cortijoCard" key={place.id}>
              <div className="cortijoCardTop"><span className="cortijoPill">{place.status}</span><small>{place.zone}</small></div>
              <h2 style={{ marginBottom: ".35rem" }}>{place.name}</h2>
              <div className="fincaGuideMeta"><span>{place.category || "Sortie"}</span><span>·</span><span>{place.duration || "Durée à préciser"}</span></div>
              {place.note && <p>{place.note}</p>}
              {place.familyNote && <p><strong>Notre avis :</strong> {place.familyNote}</p>}
              {place.bestTime && <p><strong>Meilleur moment :</strong> {place.bestTime}</p>}
              {place.parking && <p><strong>Accès / parking :</strong> {place.parking}</p>}
              {place.practical && <p><strong>Bon à savoir :</strong> {place.practical}</p>}
              {place.mapUrl?.startsWith("http") && <p><a href={place.mapUrl} target="_blank" rel="noreferrer">Ouvrir le repère carte</a></p>}
            </article>
          ))}
        </div>
        {guidePlaces.length === 0 && <article className="cortijoCard"><p>Aucun lieu n'est encore marqué « À conseiller », « Testé — coup de cœur » ou « Testé — sympa ».</p></article>}
      </main>
    );
  }

  return (
    <main className="cortijoExportApp">
      <style>{`
        .fincaHouseJump{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:.4rem;margin:0 0 .8rem;padding:.5rem;border:1px solid rgba(214,169,85,.22);border-radius:16px;background:rgba(7,11,8,.94);backdrop-filter:blur(10px)}.fincaHouseJump button{min-height:44px;border:1px solid rgba(214,169,85,.18);border-radius:11px;background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}.fincaHouseSummary{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:.65rem;margin:.8rem 0}.fincaHouseSummary article{border:1px solid rgba(214,169,85,.18);border-radius:14px;padding:.72rem .8rem;background:rgba(0,0,0,.12)}.fincaHouseSummary strong{display:block;font-size:1.04rem}.fincaHouseSummary span{display:block;margin-top:.16rem;opacity:.8;font-size:.84rem}.fincaTourFilters{display:grid;grid-template-columns:minmax(180px,2fr) minmax(150px,1fr) minmax(150px,1fr);gap:.5rem;margin:.7rem 0}.fincaTourActions{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin:.7rem 0}.fincaTourActions button,.fincaTourActions a{min-height:42px;display:inline-flex;align-items:center;border:1px solid rgba(214,169,85,.28);border-radius:999px;padding:.5rem .75rem;background:rgba(214,169,85,.08);color:inherit;text-decoration:none;cursor:pointer}.fincaSaveHint{margin:.35rem 0 .9rem;font-size:.82rem;opacity:.75}@media(max-width:720px){.fincaTourFilters{grid-template-columns:1fr}.fincaHouseJump{grid-template-columns:repeat(2,minmax(0,1fr));position:static}}
      `}</style>
      <section className="cortijoExportHero">
        <div>
          <span className="cortijoExportEyebrow">FINCA MARIA — MAISON</span>
          <h1>VIVRE, ENTRETENIR ET PROFITER DU CORTIJO</h1>
          <p>Maison, séjours, patio / jardin et bonnes idées de sorties, dans un seul endroit simple à mettre à jour.</p>
        </div>
      </section>

      <nav className="fincaHouseJump" aria-label="Accès rapide dans la maison">
        {HOUSE_SECTIONS.map((section) => <button type="button" key={section.id} onClick={() => goToSection(section.id)}>{section.label}</button>)}
      </nav>

      <div className="fincaHouseSummary" aria-label="Résumé du séjour">
        <article><strong>{nextStay ? nextStay.name : "Aucun séjour daté"}</strong><span>{nextStay ? `${formatDate(nextStay.arrival)} → ${formatDate(nextStay.departure)}` : "Ajouter les prochaines présences dans le planning"}</span></article>
        <article><strong>{overdueGarden.length + gardenDueToday.length} suivi{overdueGarden.length + gardenDueToday.length > 1 ? "s" : ""} jardin à regarder</strong><span>{overdueGarden.length ? `${overdueGarden.length} vérification(s) en retard` : gardenDueToday.length ? "Vérification prévue aujourd'hui" : "Aucune vérification urgente"}</span></article>
        <article><strong>{guidePlaces.length} lieu{guidePlaces.length > 1 ? "x" : ""} dans le guide</strong><span>{touristPlaces.filter((item) => item.status === "Testé — coup de cœur").length} coup(s) de cœur · {touristPlaces.length} fiches au total</span></article>
      </div>
      <p className="fincaSaveHint">Les modifications sont enregistrées sur cet appareil. Utiliser « Sauvegarder les données » sur l'accueil FINCA MARIA pour conserver une copie transportable.</p>

      <details id="visite" className="cortijoView">
        <summary className="cortijoPanelTitle"><span>01</span><div><h3>Visiter la maison</h3><p>Le parcours photo, dans l'ordre réel de déplacement.</p></div><small className="cortijoSummaryBadge">6 étapes</small></summary>
        <div className="cortijoColumns">
          {visitSequence.map((item, index) => (
            <article className="cortijoCard" key={item.id}>
              <div className="cortijoCardTop"><span className="cortijoPill">Étape {index + 1}</span><small>Photos à ajouter</small></div>
              <h4>{item.title}</h4><p>{item.text}</p>
              <textarea rows="4" value={notes[`visit-${item.id}`] || ""} onChange={(event) => updateNote(`visit-${item.id}`, event.target.value)} placeholder="Repères, couchages, rangement, particularités de cette zone…" />
            </article>
          ))}
        </div>
      </details>

      <details id="fonctionnement" className="cortijoView">
        <summary className="cortijoPanelTitle"><span>02</span><div><h3>Infrastructure et fonctionnement</h3><p>Les informations pratiques pour utiliser la maison sans chercher partout.</p></div><small className="cortijoSummaryBadge">6 repères</small></summary>
        <div className="cortijoColumns">
          {infrastructureSections.map(([title, text]) => (
            <article className="cortijoCard" key={title}><h4>{title}</h4><p>{text}</p><textarea rows="4" value={notes[`infra-${title}`] || ""} onChange={(event) => updateNote(`infra-${title}`, event.target.value)} placeholder="À renseigner…" /></article>
          ))}
        </div>
      </details>

      <details id="menage" className="cortijoView">
        <summary className="cortijoPanelTitle"><span>03</span><div><h3>Gestion intérieure et ménage</h3><p>Une trame commune pour laisser la maison prête pour les suivants.</p></div><small className="cortijoSummaryBadge">3 moments</small></summary>
        <div className="cortijoColumns">
          {householdSections.map((section) => (
            <article className="cortijoCard" key={section.title}><h4>{section.title}</h4><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul><textarea rows="4" value={notes[`menage-${section.title}`] || ""} onChange={(event) => updateNote(`menage-${section.title}`, event.target.value)} placeholder="Consignes propres à la maison…" /></article>
          ))}
        </div>
      </details>

      <details id="presences" className="cortijoView">
        <summary className="cortijoPanelTitle"><span>04</span><div><h3>Présences et couchages</h3><p>Qui vient, quand, et où chacun souhaite s'installer.</p></div><small className="cortijoSummaryBadge">{presences.length} présence{presences.length > 1 ? "s" : ""}</small></summary>
        <form className="cortijoForm" onSubmit={addPresence}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom" />
          <input type="date" value={form.arrival} onChange={(e) => setForm({ ...form, arrival: e.target.value })} aria-label="Date d'arrivée" />
          <input type="date" value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} aria-label="Date de départ" />
          <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Chambre / couchage souhaité" />
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Remarque" />
          <button type="submit">+ Ajouter une présence</button>
        </form>
        <div className="cortijoList">
          {sortedPresences.length === 0 && <article className="cortijoCard"><p>Aucune présence enregistrée pour le moment.</p></article>}
          {sortedPresences.map((item) => (
            <article className="cortijoCard" key={item.id}>
              <div className="cortijoCardTop"><span className="cortijoPill">{item.name}</span><small>{formatDate(item.arrival)} → {formatDate(item.departure)}</small></div>
              <h4>{item.place || "Couchage à choisir"}</h4>{item.note && <p>{item.note}</p>}
              <button type="button" onClick={() => removePresence(item.id)}>Retirer</button>
            </article>
          ))}
        </div>
      </details>

      <details id="inventaire" className="cortijoView">
        <summary className="cortijoPanelTitle"><span>05</span><div><h3>Inventaire et besoins de la maison</h3><p>Ce qui existe, ce qui manque et ce qui devra être remplacé ou réparé.</p></div><small className="cortijoSummaryBadge">Inventaire</small></summary>
        <textarea rows="10" value={notes.inventory || ""} onChange={(event) => updateNote("inventory", event.target.value)} placeholder="Mobilier, linge, vaisselle, appareils, produits ménagers, réparations, achats à prévoir…" />
      </details>

      <details id="patio-jardin" className="cortijoView">
        <summary className="cortijoPanelTitle"><span>06</span><div><h3>Patio & jardin — suivi des arbres</h3><p>Une fiche par arbre pour conserver la décision, l'intervention et la réaction dans le temps.</p></div><small className="cortijoSummaryBadge">3 arbres</small></summary>
        <article className="cortijoCard" style={{ marginBottom: ".8rem" }}>
          <div className="cortijoCardTop"><span className="cortijoPill">20/08/2026</span><small>Fiche de référence</small></div>
          <h4>Logique globale du patio</h4>
          <p><strong>Laurier :</strong> ombre maîtrisée, forme en parasol, volume réduit côté voiture.</p>
          <p><strong>Cerisier :</strong> fruitier bas, ouvert et accessible pour la récolte.</p>
          <p><strong>Citronnier :</strong> fruitier à dégager pour retrouver de la lumière.</p>
          <p><strong>Période :</strong> les tailles restent progressives, sans rabattage brutal ; intervenir de préférence par temps sec et éviter une intervention sévère si une nouvelle forte chaleur revient.</p>
        </article>
        <div className="cortijoColumns">
          {patioTrees.map((tree) => {
            const record = garden[tree.id] || {};
            return (
              <article className="cortijoCard" key={tree.id}>
                <div className="cortijoCardTop"><span className="cortijoPill">{tree.species}</span><small>{gardenStatus(record)}</small></div>
                <p><strong>Emplacement :</strong> {tree.location}</p>
                <p><strong>Problème observé :</strong> {tree.problem}</p>
                <p><strong>Objectif :</strong> {tree.objective}</p>
                <p><strong>Forme recherchée :</strong> {tree.shape}</p>
                <p><strong>Objectif à terme :</strong> {tree.target}</p>
                <div style={{ marginTop: ".65rem" }}><strong>Intervention prévue</strong><ol>{tree.intervention.map((item) => <li key={item}>{item}</li>)}</ol></div>
                <div style={{ marginTop: ".65rem" }}><strong>Règles de taille / suivi</strong><ul>{tree.rules.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <p><strong>Période recommandée :</strong> {tree.period}</p>
                <p><strong>Intensité maximale :</strong> {tree.intensity}</p>
                <p><strong>Documentation :</strong> {tree.photoState}</p>
                <div className="cortijoForm" style={{ marginTop: ".8rem" }}>
                  <label><span>Photos avant — repère / nom du fichier</span><input value={record.beforePhotos || ""} onChange={(event) => updateGarden(tree.id, "beforePhotos", event.target.value)} placeholder="Ex. vue générale, côté voiture, photo annotée…" /></label>
                  <label><span>Photos après — repère / nom du fichier</span><input value={record.afterPhotos || ""} onChange={(event) => updateGarden(tree.id, "afterPhotos", event.target.value)} placeholder="À compléter après intervention" /></label>
                  <label><span>Date de l'intervention</span><input type="date" value={record.interventionDate || ""} onChange={(event) => updateGarden(tree.id, "interventionDate", event.target.value)} /></label>
                  <label><span>Prochaine vérification</span><input type="date" value={record.nextCheck || ""} onChange={(event) => updateGarden(tree.id, "nextCheck", event.target.value)} /></label>
                </div>
                <label style={{ display: "block", marginTop: ".75rem" }}><span style={{ display: "block", marginBottom: ".3rem", fontWeight: 700 }}>Observations sur la réaction de l'arbre</span><textarea rows="5" value={record.observations || ""} onChange={(event) => updateGarden(tree.id, "observations", event.target.value)} placeholder="Reprise, nouvelles pousses, lumière gagnée, réaction à la chaleur, fructification, état du citronnier…" /></label>
              </article>
            );
          })}
        </div>
        <article className="cortijoCard" style={{ marginTop: ".8rem" }}><div className="cortijoCardTop"><span className="cortijoPill">PHOTO À FAIRE</span></div><h4>Puits de lumière du citronnier</h4><p>Faire une vue montrant simultanément le tronc du cerisier et le citronnier entier. Elle servira à déterminer précisément quelles branches du cerisier doivent être raccourcies ou supprimées.</p></article>
      </details>

      <details id="sorties" className="cortijoView" open>
        <summary className="cortijoPanelTitle"><span>07</span><div><h3>Lieux à conseiller aux vacanciers</h3><p>Nos idées de sorties autour du Cortijo et de Málaga, enrichies après chaque séjour.</p></div><small className="cortijoSummaryBadge">{touristPlaces.length} lieux</small></summary>

        <article className="cortijoCard" style={{ marginBottom: ".8rem" }}>
          <div className="cortijoCardTop"><span className="cortijoPill">CARNET DE SORTIES</span><small>{guidePlaces.length} dans le guide vacanciers</small></div>
          <h4>Garder uniquement les vraies bonnes idées</h4>
          <p>Chaque fiche peut conserver le meilleur moment, le parking, les détails pratiques et notre avis. Le « Guide vacanciers » n'affiche que les lieux marqués comme conseillés ou testés positivement et masque les informations privées de la maison.</p>
        </article>

        <div className="fincaTourActions">
          <a href="/?view=cortijo-maison&mode=vacanciers">Ouvrir le guide vacanciers</a>
          <button type="button" onClick={copyGuide}>Copier le guide</button>
          <button type="button" onClick={shareGuide}>Partager</button>
          {copyState && <span>{copyState}</span>}
        </div>

        <form className="cortijoForm" onSubmit={addTouristPlace} style={{ marginBottom: ".8rem" }}>
          <input value={placeForm.name} onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })} placeholder="Nom du lieu" />
          <input value={placeForm.zone} onChange={(e) => setPlaceForm({ ...placeForm, zone: e.target.value })} placeholder="Zone / ville" />
          <input value={placeForm.category} onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value })} placeholder="Type : plage, balade, village…" />
          <input value={placeForm.duration} onChange={(e) => setPlaceForm({ ...placeForm, duration: e.target.value })} placeholder="Durée : 2 h, demi-journée, journée…" />
          <input value={placeForm.note} onChange={(e) => setPlaceForm({ ...placeForm, note: e.target.value })} placeholder="Pourquoi on le conseille / bon plan" />
          <button type="submit">+ Ajouter un lieu</button>
        </form>

        <div className="fincaTourFilters">
          <input value={tourSearch} onChange={(event) => setTourSearch(event.target.value)} placeholder="Rechercher : plage, Ronda, nature…" />
          <select value={tourStatus} onChange={(event) => setTourStatus(event.target.value)} aria-label="Filtrer par avis"><option>Tous</option><option>Testé — coup de cœur</option><option>À conseiller</option><option>Testé — sympa</option><option>À compléter</option><option>À tester</option><option>Ne plus conseiller</option></select>
          <select value={tourCategory} onChange={(event) => setTourCategory(event.target.value)} aria-label="Filtrer par type"><option>Toutes</option>{touristCategories.map((category) => <option key={category}>{category}</option>)}</select>
        </div>

        <div className="cortijoColumns">
          {visibleTouristPlaces.map((place) => (
            <article className="cortijoCard" key={place.id}>
              <div className="cortijoCardTop"><span className="cortijoPill">{place.category || "Sortie"}</span><small>{place.zone}</small></div>
              <h4>{place.name}</h4>
              <p><strong>Temps à prévoir :</strong> {place.duration || "À préciser"}</p>
              <p>{place.note || "Note à compléter après une visite."}</p>
              <div className="cortijoForm" style={{ marginTop: ".6rem" }}>
                <label><span>Notre avis</span><select value={place.status || "À tester"} onChange={(event) => updateTouristPlace(place.id, { status: event.target.value })}><option>Testé — coup de cœur</option><option>À conseiller</option><option>Testé — sympa</option><option>À compléter</option><option>À tester</option><option>Ne plus conseiller</option></select></label>
                <label><span>Meilleur moment</span><input value={place.bestTime || ""} onChange={(event) => updateTouristPlace(place.id, { bestTime: event.target.value })} placeholder="Matin, coucher du soleil, hors saison…" /></label>
                <label><span>Accès / parking</span><input value={place.parking || ""} onChange={(event) => updateTouristPlace(place.id, { parking: event.target.value })} placeholder="Où se garer, accès facile ou non…" /></label>
                <label><span>Bon à savoir / réservation</span><input value={place.practical || ""} onChange={(event) => updateTouristPlace(place.id, { practical: event.target.value })} placeholder="Réserver, chaussures, plage à éviter à telle heure…" /></label>
                <label><span>Lien carte</span><input value={place.mapUrl || ""} onChange={(event) => updateTouristPlace(place.id, { mapUrl: event.target.value })} placeholder="Coller un lien Maps si utile" /></label>
              </div>
              <label style={{ display: "block", marginTop: ".65rem" }}><span style={{ display: "block", marginBottom: ".3rem", fontWeight: 700 }}>Notre note personnelle</span><textarea rows="4" value={place.familyNote || ""} onChange={(event) => updateTouristPlace(place.id, { familyNote: event.target.value })} placeholder="Plage précise, resto à côté, ce qu'on a aimé, ce qu'il faut éviter…" /></label>
              <div className="fincaTourActions" style={{ marginBottom: 0 }}>
                {place.mapUrl?.startsWith("http") && <a href={place.mapUrl} target="_blank" rel="noreferrer">Carte</a>}
                <button type="button" onClick={() => removeTouristPlace(place.id)}>Retirer</button>
              </div>
            </article>
          ))}
          {visibleTouristPlaces.length === 0 && <article className="cortijoCard"><p>Aucun lieu ne correspond à ces filtres.</p></article>}
        </div>
      </details>

      <section className="cortijoExportRule">
        <div><strong>Historique vivant</strong><p>Maison, patio et lieux conseillés restent des fiches évolutives. Les données sont locales à cet appareil : une sauvegarde régulière permet de ne rien perdre.</p></div>
        <a href="/">Retour à FINCA MARIA</a>
      </section>
    </main>
  );
}
