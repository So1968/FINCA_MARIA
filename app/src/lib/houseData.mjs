export const HOUSE_KEYS = Object.freeze({
  bookings: "finca_maria_maison_presences_v1",
  ready: "finca_maria_chambres_preparation_v1",
  rooms: "finca_maria_couchages_plan_v1",
  inventory: "finca_maria_inventaire_maison_v1",
  notes: "finca_maria_maison_notes_v1",
  garden: "finca_maria_jardin_suivi_v1",
  places: "finca_maria_lieux_vacanciers_v1",
  checklist: "finca_maria_sejour_checklist_v1",
  departure: "finca_maria_maison_depart_checklist_v1",
  maintenance: "finca_maria_entretien_maison_v1",
  bookingTrash: "finca_maria_reservations_corbeille_locale_v1",
  syncRecovery: "finca_maria_maison_sync_recuperation_v1"
});
export const HOUSE_SECTIONS = [
  { id: "calendrier", title: "Calendrier et réservations", hint: "Chambres, occupants et séjours" },
  { id: "inventaire", title: "Inventaire", hint: "Objets, quantités et besoins" },
  { id: "entretien", title: "Entretien", hint: "Ménage, travaux et suivi" },
  { id: "jardin", title: "Jardin", hint: "Arbres, interventions et photos" },
  { id: "fonctionnement", title: "Fonctionnement", hint: "Eau, électricité, clés et consignes" },
  { id: "sorties", title: "Sorties", hint: "Carnet familial et guide à partager" }
];
export const HOUSE_ROOMS = ["La Hera", "La Golondrina", "La Matrimoniala", "La Cueva", "Las Alemanitas / Alemanitos"];
const ALIASES = {
  gerer: "calendrier", afaire: "entretien", jardin: "jardin",
  presences: "calendrier", "arrivee-reservation": "calendrier", "preparer-chambres": "calendrier",
  couchages: "calendrier", chambres: "calendrier", "vivre-maison": "fonctionnement", visite: "fonctionnement",
  reglements: "fonctionnement", menage: "entretien", "depart-maison": "entretien", "patio-jardin": "jardin"
};
export function houseSection(hash = "") {
  const name = String(hash).replace(/^#/, "");
  return HOUSE_SECTIONS.some((item) => item.id === name) ? name : ALIASES[name] || "calendrier";
}
export function houseUrl(section = "", visitor = false) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", "cortijo-maison");
  if (visitor) url.searchParams.set("mode", "vacanciers");
  url.hash = section;
  return `${url.pathname}${url.search}${url.hash}`;
}
export const isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
export const searchable = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const newHouseId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;
export function readHouseData(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { value: fallback, error: false };
    const value = JSON.parse(raw);
    if (Array.isArray(fallback) ? !Array.isArray(value) : !isRecord(value)) throw new Error("Format inattendu");
    return { value, error: false };
  } catch { return { value: fallback, error: true }; }
}
export function keepHouseRecovery(storage, payload) {
  const stored = readHouseData(storage, HOUSE_KEYS.syncRecovery, []);
  if (stored.error) return false;
  const signature = JSON.stringify(payload);
  if (stored.value.some((item) => item.signature === signature)) return true;
  try {
    storage.setItem(HOUSE_KEYS.syncRecovery, JSON.stringify([...stored.value, { id: newHouseId("recuperation"), at: new Date().toISOString(), ...payload, signature }]));
    return true;
  } catch { return false; }
}
// Les entrées inconnues restent dans le tableau enregistré. Seule la vue est filtrée.
export function houseRecords(value) {
  const keys = recordKeys(value);
  return value.flatMap((item, index) => isRecord(item) ? [{ ...item, _key: keys[index] }] : []);
}
function recordKeys(value) {
  const counts = new Map();
  value.forEach((item) => { if (item?.id) counts.set(item.id, (counts.get(item.id) || 0) + 1); });
  return value.map((item, index) => item?.id && counts.get(item.id) === 1 ? item.id : `ancien-${index}`);
}
export function changeHouseRecord(value, key, patch) {
  const keys = recordKeys(value);
  return value.map((item, index) => isRecord(item) && keys[index] === key ? { ...item, ...patch } : item);
}
export function removeHouseRecord(value, key) {
  const keys = recordKeys(value);
  return value.filter((_, index) => keys[index] !== key);
}
export function validHouseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addHouseDays(value, count) {
  const [year, month, day] = value.split("-").map(Number);
  return localDay(new Date(year, month - 1, day + count, 12));
}
export function bookingConflict(bookings, draft, key) {
  return houseRecords(bookings).find((item) => item._key !== key && !item.cancelledAt && item.place === draft.place
    && validHouseDate(item.arrival) && validHouseDate(item.departure)
    && item.arrival < draft.departure && item.departure > draft.arrival);
}
export function syncableHouseBooking(item) {
  return isRecord(item) && typeof item.id === "string" && Boolean(item.id.trim()) && item.id === item.id.trim() && typeof item.name === "string" && Boolean(item.name.trim())
    && item.name.length <= 160 && typeof item.place === "string" && Boolean(item.place.trim()) && item.place.length <= 160
    && (item.note == null || typeof item.note === "string" && item.note.length <= 1000)
    && validHouseDate(item.arrival) && validHouseDate(item.departure) && item.arrival < item.departure;
}
export function syncableHouseBookings(items) {
  const counts = new Map();
  items.forEach((item) => { if (item?.id) counts.set(item.id, (counts.get(item.id) || 0) + 1); });
  return items.filter((item) => syncableHouseBooking(item) && counts.get(item.id) === 1);
}
export function mergeHouseBookings(local, remote) {
  const sendable = syncableHouseBookings(local);
  const sendableSet = new Set(sendable);
  const held = local.filter((item) => !sendableSet.has(item));
  const heldIds = new Set(held.map((item) => item?.id).filter(Boolean));
  const localById = new Map(sendable.map((item) => [item.id, item]));
  return [...remote.filter((item) => !heldIds.has(item.id)).map((item) => ({ ...localById.get(item.id), ...item })), ...held];
}
export function dateLabel(value) {
  if (!value) return "À préciser";
  const parts = String(value).slice(0, 10).split("-");
  return parts.length === 3 ? parts.reverse().join("/") : String(value);
}
export function historyChange(item, patch, action = "Modification") {
  const { history, _key, ...before } = item;
  if (Array.isArray(before.photos)) before.photos = before.photos.map(({ dataUrl, ...photo }) => photo);
  const at = new Date().toISOString();
  return { ...patch, updatedAt: at, history: [...(Array.isArray(history) ? history : []), { at, action, before }] };
}
export function mergeEditedFields(initial, current, edited) {
  if (!initial) return { patch: { ...edited }, conflicts: [] };
  const same = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");
  const patch = {}, conflicts = [];
  for (const [field, value] of Object.entries(edited)) {
    if (same(value, initial[field])) continue;
    patch[field] = value;
    if (!same(current[field], initial[field]) && !same(current[field], value)) conflicts.push(field);
  }
  return { patch, conflicts };
}
export const safeWebUrl = (value) => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
};
