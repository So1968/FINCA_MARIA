import { normalizeMeetingSearch } from "./meeting-list.js";
export function decisionRegisterQuery(params) {
  const q = (params.get("q") || "").trim();
  const year = params.get("year") || "";
  const status = params.get("status") || "";
  const person = (params.get("person") || "").trim();
  if (
    q.length > 200 ||
    person.length > 180 ||
    (year && !/^\d{4}$/.test(year)) ||
    status.length > 40
  )
    throw Object.assign(new Error("Filtres du registre invalides."), {
      status: 400,
    });
  const values = [];
  const conditions = [
    "m.deleted_at IS NULL",
    "(k.marker_type IN ('decision','action','question','accord_a_confirmer') OR k.classification IN ('decision_confirmee','action_confirmee','proposition','question_ouverte','decision_reportee','desaccord','a_valider','a_verifier'))",
  ];
  const normalized = (expression) =>
    `replace(replace(translate(lower(normalize(${expression}, NFC)), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'), 'œ', 'oe'), 'æ', 'ae')`;
  if (year) {
    values.push(`${year}-01-01`, `${year}-12-31`);
    conditions.push(
      `m.meeting_date BETWEEN $${values.length - 1}::date AND $${values.length}::date`,
    );
  }
  if (status) {
    values.push(status);
    conditions.push(`k.classification=$${values.length}`);
  }
  for (const [text, expression] of [
    [
      q,
      "concat_ws(' ',k.note,k.responsible,m.title,m.theme,m.report_draft->>'subjects',m.report_draft->>'summary',m.meeting_type,m.meeting_date::text,k.due_date::text)",
    ],
    [person, "coalesce(k.responsible,'')"],
  ]) {
    if (!text) continue;
    values.push(
      normalizeMeetingSearch(text)
        .split(/\s+/u)
        .map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`),
    );
    conditions.push(
      `${normalized(expression)} LIKE ALL($${values.length}::text[])`,
    );
  }
  return { where: conditions.join(" AND "), values };
}
