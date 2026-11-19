export const HOUSE_DEPARTURE_TASKS = Object.freeze([
  { id: "linge", label: "Linge utilisé pris en charge" },
  { id: "menage", label: "Ménage des espaces occupés terminé" },
  { id: "dechets", label: "Déchets sortis" },
  { id: "fermeture", label: "Eau, fenêtres et accès vérifiés" },
  { id: "cles", label: "Clés rangées" },
  { id: "incidents", label: "Incidents ou réparations signalés, si nécessaire" }
]);

const KNOWN_IDS = new Set(HOUSE_DEPARTURE_TASKS.map((task) => task.id));

export function normalizeDepartureChecks(input) {
  const source = input?.done && typeof input.done === "object" && !Array.isArray(input.done)
    ? input.done : input;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  return Object.fromEntries(
    Object.entries(source).filter(([id, checked]) => KNOWN_IDS.has(id) && checked === true)
  );
}

export function changeDepartureCheck(input, id, checked) {
  const current = normalizeDepartureChecks(input);
  if (!KNOWN_IDS.has(id)) return current;
  if (!checked) {
    const { [id]: removed, ...remaining } = current;
    return remaining;
  }
  return { ...current, [id]: true };
}

export function countDepartureChecks(input) {
  return Object.keys(normalizeDepartureChecks(input)).length;
}
