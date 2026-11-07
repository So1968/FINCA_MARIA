import test from "node:test";
import assert from "node:assert/strict";
import { buildValidatedReportExport } from "../app/src/lib/meetingReportExport.mjs";

function version() {
  return {
    id: "version-one", version: 1, validatedAt: "2026-11-07T20:00:00Z",
    snapshot: {
      schema: "finca-meeting-report-v1",
      meeting: { id: "meeting-one", title: "Réunion familiale", date: "2026-11-07", meetingType: "Conseil de famille", agenda: ["Travaux"] },
      participants: [{ name: "Membre A", presence: "excused" }],
      markers: [
        { type: "decision", classification: "proposition", note: "Proposition à discuter", timeSeconds: 12 },
        { type: "action", classification: "action_confirmee", note: "Demander le devis", timeSeconds: 60 },
        { type: "decision", classification: "decision_confirmee", note: "Décision validée", timeSeconds: 90 }
      ],
      reportDraft: { summary: "Synthèse figée", subjects: "Toiture" }, links: []
    }
  };
}

test("export identifiable avec date, version et présence explicite", () => {
  const result = buildValidatedReportExport(version(), "meeting-one");
  assert.match(result.filename, /2026-11-07_v1_reunion-familiale\.txt$/);
  for (const value of ["07/11/2026", "7 novembre 2026", "21:00", "heure de Paris", "Version validée : 1", "Référence version : version-one", "Synthèse figée", "Membre A — Excusé"]) assert.ok(result.content.includes(value), value);
});

test("les propositions restent distinctes des décisions et les actions n’inventent pas de responsable ni de date", () => {
  const { content } = buildValidatedReportExport(version(), "meeting-one");
  const decisions = content.slice(content.indexOf("DÉCISIONS CONFIRMÉES"), content.indexOf("ACTIONS CONFIRMÉES"));
  assert.ok(decisions.includes("Décision validée"));
  assert.ok(!decisions.includes("Proposition à discuter"));
  const pending = content.slice(content.indexOf("PROPOSITIONS, DÉCLARATIONS ET POINTS À VALIDER"));
  assert.ok(pending.includes("Proposition à discuter"));
  assert.ok(content.includes("Responsable non précisé."));
  assert.ok(content.includes("Échéance non précisée."));
  const unknown = version();
  unknown.snapshot.markers = [{ type: "decision", classification: "toString", note: "Qualification inconnue conservée" }];
  const other = buildValidatedReportExport(unknown, "meeting-one").content;
  assert.ok(other.includes("AUTRES REPÈRES"));
  assert.ok(other.includes("Qualification inconnue conservée"));
});

test("la source historique et les références de la version sont conservées", () => {
  const input = version();
  input.snapshot.reportDraft.historicOriginal = "Texte historique original\nDeuxième ligne.";
  input.snapshot.links = [{ kind: "document", targetRef: "document-one", markerId: "marker-one" }];
  const result = buildValidatedReportExport(input, "meeting-one");
  assert.ok(result.content.includes("Texte historique original\nDeuxième ligne."));
  assert.ok(result.content.includes("Document : document-one · Repère : marker-one"));
});

test("les versions absentes, incomplètes ou appartenant à une autre réunion sont refusées", () => {
  for (const alter of [
    (v) => { v.snapshot = null; },
    (v) => { v.snapshot.schema = "unknown"; },
    (v) => { v.snapshot.meeting.id = "other-meeting"; },
    (v) => { v.version = 0; },
    (v) => { v.validatedAt = "invalide"; },
    (v) => { v.snapshot.markers.push(null); },
    (v) => { v.snapshot.meeting.date = "2026-02-30"; }
  ]) {
    const input = version(); alter(input);
    assert.throws(() => buildValidatedReportExport(input, "meeting-one"));
  }
});

test("le nom de fichier reste sûr et chaque version est distincte", () => {
  const first = version();
  first.snapshot.meeting.title = "../../Réunion : <famille> / ?";
  const second = structuredClone(first); second.id = "version-two"; second.version = 2;
  const a = buildValidatedReportExport(first, "meeting-one");
  const b = buildValidatedReportExport(second, "meeting-one");
  assert.ok(!/[\\/:<>?]/.test(a.filename));
  assert.ok(!a.filename.includes(".."));
  assert.notEqual(a.filename, b.filename);
});
