import fs from "node:fs";
import assert from "node:assert/strict";

const simpleNav = fs.readFileSync(new URL("../src/components/FincaSimpleNavigationMount.jsx", import.meta.url), "utf8");
const dashboard = fs.readFileSync(new URL("../src/components/FincaMariaDashboard.jsx", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

assert.ok(simpleNav.includes('maison: ["maison"]'), "La navigation Maison doit être résolue par son intitulé, pas par sa position.");
assert.ok(simpleNav.includes('classList.contains("fincaTwoWorlds")'), "L’ancienne navigation ne doit pas écraser la navigation native du dashboard actuel.");
assert.ok(!simpleNav.includes("slice(0, 5)"), "La navigation ne doit plus être limitée arbitrairement aux cinq premières sections.");
assert.ok(dashboard.includes('setArea("maison")'), "Le dashboard doit conserver une entrée native vers Maison.");
assert.ok(dashboard.includes("const HOUSE_TABS"), "Le module Maison doit conserver sa navigation propre.");
assert.ok(app.includes('const [view, setView]'), "Le point d'entrée autonome doit suivre la vue courante.");
assert.ok(main.includes('window.addEventListener(NAVIGATION_EVENT, handleNavigation)'), "Les compléments FINCA doivent réagir à l’ouverture de FINCA.");
assert.ok(!main.includes("requestIdleCallback"), "Les modules FINCA ne doivent pas être téléchargés en arrière-plan quand FINCA n’est pas ouvert.");

console.log("FINCA MARIA : navigation Maison et chargement à la demande OK");
