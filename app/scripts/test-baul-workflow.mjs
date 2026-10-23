import assert from "node:assert/strict";
import fs from "node:fs";

const ui = fs.readFileSync(new URL("../src/components/FincaBaulHub.jsx", import.meta.url), "utf8");
const server = fs.readFileSync(new URL("../../server/src/server.js", import.meta.url), "utf8");
assert.ok(ui.includes('type="file" multiple'), "La sélection multiple doit rester possible.");
assert.ok(ui.includes('webkitdirectory=""'), "La sélection de dossier doit rester possible.");
assert.ok(!ui.includes("MAX_BATCH = 50"), "La sélection de dossiers ne doit pas être plafonnée à 50 fichiers.");
assert.ok(ui.includes('crypto.subtle.digest("SHA-256"'), "L'empreinte des fichiers doit être vérifiée.");
assert.ok(ui.includes('result.duplicate'), "Les doublons doivent être signalés.");
assert.ok(ui.includes('setFailedFiles(retry)'), "Les échecs doivent pouvoir être repris.");
assert.ok(ui.includes('api("/api/baul/confirm"'), "Le classement doit nécessiter confirmation.");
assert.ok(server.includes('if (row.status !== "validated") await requireAdmin(req)'), "Les documents non validés ne doivent pas être consultables par la famille.");
assert.ok(server.includes('if (row.deleted_at) return json(res, 404'), "Les documents en corbeille doivent être masqués.");
console.log("BAÚL : contrôles statiques des parcours et des droits OK");
