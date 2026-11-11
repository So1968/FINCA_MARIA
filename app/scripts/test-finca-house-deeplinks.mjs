import assert from "node:assert/strict";
import { resolveHouseHash } from "../src/lib/houseNavigation.mjs";

const cases = [
  ["#presences", { journey: "arrivee-reservation", details: null }],
  ["#arrivee-reservation", { journey: "arrivee-reservation", details: null }],
  ["#preparer-chambres", { journey: "preparer-chambres", details: null }],
  ["#vivre-maison", { journey: "vivre-maison", details: null }],
  ["#depart-maison", { journey: "depart-maison", details: null }],
  ["#inventaire", { journey: null, details: "inventaire" }],
  ["#patio-jardin", { journey: null, details: "patio-jardin" }],
  ["#sorties", { journey: null, details: "sorties" }],
  ["#menage", { journey: null, details: "menage" }],
  ["#fonctionnement", { journey: null, details: "fonctionnement" }],
  ["#visite", { journey: null, details: "visite" }],
  ["#inconnu", { journey: null, details: null }],
  ["", { journey: null, details: null }]
];
for (const [hash, expected] of cases) {
  assert.deepEqual(resolveHouseHash(hash), expected, `Lien Maison incorrect : ${hash}`);
}
console.log("FINCA MARIA : accès directs Maison vérifiés");
