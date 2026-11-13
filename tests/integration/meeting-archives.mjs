import assert from "node:assert/strict";
import { docx } from "../helpers/docx.mjs";
const base = process.env.FINCA_TEST_URL || "http://127.0.0.1:18533";
let cookie = process.env.FINCA_TEST_COOKIE;
const origin = process.env.APP_ORIGIN || base;
if (!cookie) {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email: "archive-test@example.test",
      password: "Fictitious_archive_test_123456789!",
    }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
}
async function api(path, body, expected = 200) {
  const res = await fetch(`${base}/api/meetings${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  assert.equal(res.status, expected, JSON.stringify(data));
  return data;
}
const original =
  "Compte rendu fictif n° 3 du 28/01/2022\nPrésents : Test A\nAbsents : Test B\nParticipants : Test C\nProposition : revoir le jardin\nDécision : préparer les devis\nAction : comparer les devis";
const imported = await api("/import-historic", {
  items: [
    {
      originalText: original,
      title: "Archive fictive à structurer",
      date: "2022-01-28",
      candidates: ["Décision : préparer les devis"],
    },
  ],
});
const id = imported.results[0].id;
const before = (await api(`/${id}`)).meeting;
assert.equal(before.participants.length, 0);
await api(`/${id}/participants`, {
  name: "Test A", presence: "present", role: "Secrétaire fictif",
}, 201);
const validated = await api(`/${id}/validate`, {});
const frozen = validated.meeting.validatedVersions;
const preview = await api("/archive-preview", { meetingId: id });
assert.equal(preview.originalText, original);
assert.equal(preview.participants.find((p) => p.name === "Test A").role, "Secrétaire fictif");
const review = {
  meetingId: id,
  sourceHash: preview.sourceHash,
  reviewed: true,
  dateReviewed: true,
  participants: preview.participants,
  markers: preview.markers,
};
await api("/structure-review", { ...review, reviewed: false }, 409);
await api("/structure-review", { ...review, sourceHash: "bad" }, 409);
const [first, second] = await Promise.all([
  api("/structure-review", review),
  api("/structure-review", review),
]);
assert.equal(first.meeting.participants.length, 3);
assert.equal(second.meeting.participants.length, 3);
const after = (await api(`/${id}`)).meeting;
assert.equal(after.markers.length, 3);
assert.equal(after.participants.find((p) => p.name === "Test A").role, "Secrétaire fictif");
assert.equal(after.reportDraft.historicOriginal, original);
assert.deepEqual(after.validatedVersions, frozen);
assert.ok(
  after.markers.every((m) => m.classification !== "decision_confirmee"),
);
await api("/structure-review", review);
assert.equal((await api(`/${id}`)).meeting.markers.length, 3);
// Le serveur conserve la source, même si un client tente de la remplacer.
const update = await fetch(`${base}/api/meetings/${id}`, {
  method: "PUT",
  headers: {
    Cookie: cookie,
    Origin: origin,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    reportDraft: {
      summary: "Synthèse fictive",
      historicOriginal: "ne doit pas remplacer",
    },
  }),
});
assert.equal(update.status, 200);
assert.equal(
  (await api(`/${id}`)).meeting.reportDraft.historicOriginal,
  original,
);
const rate = await api("/participation?from=2022-01-01&to=2022-12-31");
const unknown = rate.people.find((p) => p.name === "Test C");
assert.equal(unknown.rate, null);
assert.equal(unknown.unknown, 1);
assert.equal(unknown.absent, 0);
const filtered = await api(
  "/decision-register?year=2022&status=proposition&q=jardin",
);
assert.ok(filtered.decisions.some((m) => m.meetingId === id));
assert.ok(filtered.decisions.every((m) => m.classification === "proposition"));
const sameFile={name:"ancienne-archive-fictive.docx",base64:docx(original).toString("base64")};
const samePreview=await api("/archive-preview",{file:sameFile});
await api("/structure-review",{file:sameFile,sourceHash:samePreview.sourceHash,reviewed:true,dateReviewed:true,title:"Ne doit pas réimporter",date:"2022-01-28",participants:[],markers:[]},409);
const wordText =
  "Réunion fictive n° 4 du 11/03/2022\nPrésents : Test Word\nAction : tester la conservation de la source";
const file = {
  name: "compte-rendu-fictif.docx",
  base64: docx(wordText).toString("base64"),
};
const wordPreview = await api("/archive-preview", { file });
assert.equal(wordPreview.participants[0].presence, "present");
const wordBody = {
  file,
  sourceHash: wordPreview.sourceHash,
  reviewed: true,
  dateReviewed: true,
  title: "Réunion Word fictive",
  date: "2022-03-11",
  participants: wordPreview.participants,
  markers: wordPreview.markers,
};
const wordSaved = await api("/structure-review", wordBody);
assert.equal(wordSaved.meeting.sources.length, 1);
assert.equal(wordSaved.meeting.reportDraft.historicOriginal, `${wordText}\n`);
const download = await fetch(
  `${base}/api/meetings/${wordSaved.meeting.id}/sources/${wordSaved.meeting.sources[0].id}`,
  { headers: { Cookie: cookie } },
);
assert.equal(download.status, 200);
assert.deepEqual(
  Buffer.from(await download.arrayBuffer()),
  Buffer.from(file.base64, "base64"),
);
await api("/structure-review", wordBody, 409);
await api(`/${id}/participants`, {name:"Test Word",presence:"present",role:"Rapporteur fictif"}, 201);
const targetWordPreview = await api("/archive-preview", {file,meetingId:id});
assert.equal(targetWordPreview.participants[0].role,"Rapporteur fictif");
const attach = { ...wordBody, meetingId: id, participants:targetWordPreview.participants };
await api("/structure-review", attach);
await api("/structure-review", attach);
const attached = (await api(`/${id}`)).meeting;
assert.equal(attached.sources.length, 1);
assert.equal(attached.participants.find((p)=>p.name==="Test Word").role,"Rapporteur fictif");
assert.equal(attached.reportDraft.historicOriginal, original);
const bad = await api("/archive-preview", {
  originalText:
    "Compte rendu fictif n° 2 du 18/03/2022\nDate évoquée 25/03/2022",
});
await api(
  "/structure-review",
  {
    originalText: bad.originalText,
    sourceHash: bad.sourceHash,
    reviewed: true,
    title: "Date fictive ambiguë",
    date: "2022-03-18",
    participants: [],
    markers: [],
  },
  400,
);
const changedRole = structuredClone(review);
changedRole.participants.find((p) => p.name === "Test A").role = "Animateur fictif";
const roleUpdated = await api("/structure-review", changedRole);
assert.equal(roleUpdated.meeting.participants.find((p) => p.name === "Test A").role, "Animateur fictif");
changedRole.participants.find((p) => p.name === "Test A").role = "";
const roleCleared = await api("/structure-review", changedRole);
assert.equal(roleCleared.meeting.participants.find((p) => p.name === "Test A").role, "");
await api(`/${id}/participants`, {name:"test a",presence:"unknown",role:"Autre rôle fictif"}, 201);
const ambiguous = await api("/archive-preview", {meetingId:id});
assert.equal(ambiguous.participants.find((p) => p.name === "Test A").role, "");
await api("/structure-review", {...review,participants:ambiguous.participants,summary:"Contrôle fictif des homonymes"}, 409);
const unauth = await fetch(`${base}/api/meetings/participation`);
assert.equal(unauth.status, 401);
console.log(
  "✓ PostgreSQL + API : reprise concurrente sans doublons, sources immuables, inconnus exclus du taux, recherche transversale, import/rattachement Word, original binaire récupérable, dates ambiguës et accès privé",
);
