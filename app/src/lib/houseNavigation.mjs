// Résout les liens internes Maison, sans accéder au DOM ni aux données du navigateur.
const JOURNEY = new Set(["arrivee-reservation", "preparer-chambres", "vivre-maison", "depart-maison"]);
const LEGACY = new Set(["visite", "fonctionnement", "menage", "inventaire", "patio-jardin", "sorties"]);

export function resolveHouseHash(hash = "") {
  const value = String(hash).replace(/^#/, "");
  if (value === "presences") return { journey: "arrivee-reservation", details: null };
  if (JOURNEY.has(value)) return { journey: value, details: null };
  if (LEGACY.has(value)) return { journey: null, details: value };
  return { journey: null, details: null };
}
