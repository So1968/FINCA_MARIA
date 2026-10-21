import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applySpeakerOverrides,
  buildConfirmedAction,
  cleanSpeakerMapping,
  defaultClassification,
  finalizeTurns,
  mapSpeakersFromIntroductions
} from "../server/src/meeting-domain.js";

test("les marqueurs prudents ne deviennent jamais automatiquement des décisions ou actions confirmées", () => {
  assert.equal(defaultClassification("decision"), "a_valider");
  assert.equal(defaultClassification("action"), "a_valider");
  assert.equal(defaultClassification("accord_a_confirmer"), "a_valider");
  assert.equal(defaultClassification("desaccord"), "desaccord");
  assert.equal(defaultClassification("question"), "question_ouverte");
});

test("un nom n'est associé automatiquement qu'après une présentation explicite", () => {
  const turns = [
    { start: 12, end: 16, sourceSpeaker: "SPEAKER_00", text: "Je suis Sofia." },
    { start: 18, end: 22, sourceSpeaker: "SPEAKER_01", text: "Marie est absente aujourd'hui." }
  ];
  const result = mapSpeakersFromIntroductions(turns, ["Sofia", "Marie"]);
  assert.equal(result.map.SPEAKER_00.name, "Sofia");
  assert.equal(result.map.SPEAKER_00.confidence, "presentation-explicite");
  assert.equal(result.map.SPEAKER_01, undefined);
});

test("une voix incertaine reste Intervenant 1 et n'est pas inventée", () => {
  const result = finalizeTurns([
    { start: 0, end: 4, sourceSpeaker: "?", text: "Bonjour, nous commençons." }
  ], ["Sofia", "Marie"]);
  assert.equal(result.segments[0].speaker, "Intervenant 1");
  assert.equal(result.segments[0].speakerConfidence, "non-identifie");
});

test("les corrections de voix sont limitées aux présents de la réunion", () => {
  const mapping = cleanSpeakerMapping(
    { SPEAKER_00: "Sofia", SPEAKER_01: "Personne extérieure", SPEAKER_02: "" },
    ["Sofia", "Marie"]
  );
  assert.deepEqual(mapping, { SPEAKER_00: "Sofia" });

  const transcript = {
    segments: [{ sourceSpeaker: "SPEAKER_00", speaker: "Intervenant 1", speakerConfidence: "non-identifie", text: "Test" }]
  };
  const corrected = applySpeakerOverrides(transcript, mapping);
  assert.equal(corrected.segments[0].speaker, "Sofia");
  assert.equal(corrected.segments[0].speakerConfidence, "confirme-manuel");
});

test("une action FINCA exige une action confirmée et ne fabrique ni responsable ni échéance", () => {
  const meeting = { id: "meeting-test-123", title: "Conseil test", meeting_date: "2026-10-21" };
  assert.throws(
    () => buildConfirmedAction({ meeting, marker: { id: "m1", classification: "a_valider" } }),
    /confirmée humainement/
  );

  const action = buildConfirmedAction({
    meeting,
    marker: {
      id: "m1",
      classification: "action_confirmee",
      note: "Appeler la coopérative",
      responsible: "",
      due_date: null,
      time_seconds: 95
    }
  });
  assert.equal(action.title, "Appeler la coopérative");
  assert.equal(action.assignedTo, "À attribuer");
  assert.equal(action.dueAt, "");
  assert.equal(action.sourceMeetingId, meeting.id);
  assert.equal(action.sourceMarkerId, "m1");
});
