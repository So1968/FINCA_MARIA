import crypto from "node:crypto";

export const presenceValues = ["present", "absent", "excused", "unknown"];
export function nameKey(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("fr");
}
export function sourceHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
export function exactDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
// Extraction conservative, uniquement après une indication explicite. Aucune présence inférée.
export function previewArchive(text) {
  if (typeof text !== "string" || !text.trim() || text.length > 100000)
    throw Object.assign(
      new Error("Texte original obligatoire, limité à 100 000 caractères."),
      { status: 400 },
    );
  const participants = [];
  const markers = [];
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const attendance = line.match(
      /^(?:[-•]\s*)?(présents?|présentes?|participants?|absents?|absentes?|excusés?|excusées?)\s*:\s*(.+)$/iu,
    );
    if (attendance) {
      const label = attendance[1].toLowerCase();
      const presence = label.startsWith("prés")
        ? "present"
        : label.startsWith("abs")
          ? "absent"
          : label.startsWith("exc")
            ? "excused"
            : "unknown";
      for (const name of attendance[2]
        .split(/\s*[,;]\s*/u)
        .map((v) => v.trim())
        .filter(Boolean)) {
        if (name.length > 180) continue;
        const existing = participants.find(
          (p) => nameKey(p.name) === nameKey(name),
        );
        if (existing && existing.presence !== presence) {
          existing.presence = "unknown";
          existing.conflict = true;
        } else if (!existing)
          participants.push({ name, presence, role: "", evidence: line });
      }
    }
    if (
      /^(?:[-•*]\s*)?(?:décisions?|il a été décidé|le conseil décide|résolutions?|propositions?|votes?|actions?|questions?|reporté|décision reportée)\b/iu.test(
        line,
      )
    ) {
      const type = /^(?:[-•*]\s*)?actions?\b/iu.test(line)
        ? "action"
        : /^(?:[-•*]\s*)?questions?\b/iu.test(line)
          ? "question"
          : "decision";
      const classification = /proposition|vote/iu.test(line)
        ? "proposition"
        : /reporté/iu.test(line)
          ? "decision_reportee"
          : /question/iu.test(line)
            ? "question_ouverte"
            : "a_valider";
      markers.push({
        type,
        note: line.slice(0, 2500),
        classification,
        responsible: "",
        dueDate: "",
        evidence: line,
      });
    }
  }
  const numericDates = [
    ...text.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/gu),
  ].map((m) => `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  const isoDates = [...text.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/gu)].map(
    (m) => m[0],
  );
  const dates = [...new Set([...isoDates, ...numericDates].filter(exactDate))];
  const number = text.match(/(?:n[°ºo.]\s*|numéro\s+)(\d+)/iu)?.[1] || "";
  const subjects = lines
    .filter((line) => /^(?:ordre du jour|sujets?|thèmes?)\s*:/iu.test(line))
    .join("\n");
  return {
    subjects,
    summary: "",
    title: lines[0]?.slice(0, 240) || "Compte rendu",
    number,
    dates,
    date: dates.length === 1 ? dates[0] : "",
    dateWarning: dates.length !== 1 || number === "2",
    participants: participants.slice(0, 200),
    markers: markers.slice(0, 200),
    sourceHash: sourceHash(text),
    warnings: [
      "Extraction indicative : relisez le texte original. Les noms non explicitement listés ne sont pas détectés.",
      ...(participants.some((p) => p.conflict)
        ? ["Présences contradictoires : statut non renseigné, à vérifier."]
        : []),
      ...(markers.length > 200 || participants.length > 200
        ? ["Aperçu limité à 200 éléments par rubrique."]
        : []),
    ],
  };
}

export function participationSummary(meetings, rows) {
  const people = new Map();
  const periods = new Map(
    meetings.map((m) => [m.id, String(m.date).slice(0, 4)]),
  );
  // Une personne explicitement recensée a une ligne par réunion de la période.
  // L'absence de ligne signifie inconnu, jamais absent.
  for (const row of rows) {
    if (!periods.has(row.meetingId) || !nameKey(row.name)) continue;
    const key = nameKey(row.name);
    if (!people.has(key))
      people.set(key, { name: row.name, statuses: new Map() });
    const statuses = people.get(key).statuses;
    const previous = statuses.get(row.meetingId);
    const next = presenceValues.includes(row.presence)
      ? row.presence
      : "unknown";
    statuses.set(
      row.meetingId,
      previous && previous !== next ? "unknown" : next,
    );
  }
  return [...people.values()]
    .map((person) => {
      const history = meetings.map((m) => ({
        meetingId: m.id,
        title: m.title,
        date: m.date,
        year: periods.get(m.id),
        presence: person.statuses.get(m.id) || "unknown",
      }));
      const counts = { present: 0, absent: 0, excused: 0, unknown: 0 };
      for (const item of history) counts[item.presence] += 1;
      const denominator = counts.present + counts.absent + counts.excused;
      return {
        name: person.name,
        ...counts,
        denominator,
        rate: denominator
          ? Math.round((1000 * counts.present) / denominator) / 10
          : null,
        history,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
