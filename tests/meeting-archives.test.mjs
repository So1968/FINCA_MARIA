import assert from "node:assert/strict";
import test from "node:test";
import {
  previewArchive,
  participationSummary,
  exactDate,
} from "../server/src/archive-domain.js";
import { readWord } from "../server/src/word-archive.js";
import { decisionRegisterQuery } from "../server/src/decision-register-query.js";
import { docx } from "./helpers/docx.mjs";
const text =
  "Réunion fictive n° 3 du 28/01/2022\nPrésents : Personne A; Personne B\nAbsents : Personne C\nParticipants : Personne D\nProposition : travaux\nVote : sans majorité\nDécision : examen à poursuivre\nAction : établir un devis\nDécision reportée : le jardin";
test("aperçu conservateur : présences explicites, propositions séparées et aucune confirmation automatique", () => {
  const result = previewArchive(text);
  assert.equal(result.date, "2022-01-28");
  assert.deepEqual(
    result.participants.map((p) => p.presence),
    ["present", "present", "absent", "unknown"],
  );
  assert.ok(
    result.markers.every((m) => !m.classification.endsWith("_confirmee")),
  );
  assert.equal(result.markers[0].classification, "proposition");
  assert.equal(result.markers.at(-1).classification, "decision_reportee");
  assert.ok(result.markers.every((m) => !m.responsible && !m.dueDate));
});
test("sources ambiguës : deux dates, n° 2, conflit de présence et récit sans liste", () => {
  assert.equal(previewArchive("Réunion n° 2 le 11/03/2022").dateWarning, true);
  assert.equal(previewArchive("28/01/2022 puis 11/03/2022").date, "");
  assert.equal(
    previewArchive("Présents : A\nAbsents : A").participants[0].presence,
    "unknown",
  );
  assert.deepEqual(
    previewArchive("Une personne parle dans le récit sans liste nominative.")
      .participants,
    [],
  );
  assert.throws(() => previewArchive(""));
  assert.throws(() => previewArchive("a".repeat(100001)));
  assert.equal(exactDate("2022-02-31"), false);
  assert.equal(exactDate("2024-02-29"), true);
});
test("participation : inconnus exclus du dénominateur, absence de ligne inconnue, doublons contradictoires", () => {
  const meetings = [1, 2, 3, 4].map((n) => ({
    id: String(n),
    date: `202${n}-01-01`,
    title: "Fictif",
  }));
  const rows = [
    { meetingId: "1", name: "A", presence: "present" },
    { meetingId: "2", name: "a", presence: "absent" },
    { meetingId: "3", name: "A", presence: "excused" },
  ];
  const [p] = participationSummary(meetings, rows);
  assert.equal(p.present, 1);
  assert.equal(p.absent, 1);
  assert.equal(p.excused, 1);
  assert.equal(p.unknown, 1);
  assert.equal(p.denominator, 3);
  assert.equal(p.rate, 33.3);
  const [conflict] = participationSummary(meetings, [
    ...rows,
    { meetingId: "1", name: "A", presence: "absent" },
  ]);
  assert.equal(conflict.present, 0);
  assert.equal(conflict.unknown, 2);
  assert.equal(
    participationSummary(meetings, [
      { meetingId: "1", name: "X", presence: "unknown" },
    ])[0].rate,
    null,
  );
});
test("Word .docx : texte et caractères préservés, documents invalides, DTD et archive trop volumineuse refusés", async () => {
  assert.equal(await readWord(docx(text)), `${text}\n`);
  assert.equal(
    await readWord(docx("Été & jardin <test>")),
    "Été & jardin <test>\n",
  );
  await assert.rejects(readWord(Buffer.from("pas un Word")));
  await assert.rejects(
    readWord(
      docx("", '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a/>'),
    ),
  );
  await assert.rejects(readWord(docx("a".repeat(2100000))));
});
test("recherche transversale : paramètres, accents, caractères SQL littéraux et année", () => {
  const query = decisionRegisterQuery(
    new URLSearchParams({
      q: "Été %_",
      year: "2022",
      status: "proposition",
      person: "Álvaro",
    }),
  );
  assert.deepEqual(query.values.slice(0, 3), [
    "2022-01-01",
    "2022-12-31",
    "proposition",
  ]);
  assert.deepEqual(query.values[3], ["%ete%", "%\\%\\_%"]);
  assert.ok(!query.where.includes("Álvaro"));
  assert.throws(() =>
    decisionRegisterQuery(new URLSearchParams({ year: "22" })),
  );
});
