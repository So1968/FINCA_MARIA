export function normalizeMeetingSearch(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

function integerParam(params, name, fallback, maximum) {
  const value = params.get(name);
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > maximum || (name === "limit" && Number(value) === 0)) {
    throw Object.assign(new Error("Pagination des réunions invalide."), { status: 400 });
  }
  return Number(value);
}

export function meetingListQuery(params) {
  const q = (params.get("q") || "").trim();
  const report = params.get("report") || "all";
  if (q.length > 200 || !["all", "validated", "pending"].includes(report)) {
    throw Object.assign(new Error("Recherche des réunions invalide."), { status: 400 });
  }
  const limit = integerParam(params, "limit", 250, 250);
  const offset = integerParam(params, "offset", 0, Number.MAX_SAFE_INTEGER);
  const values = [];
  const conditions = ["m.deleted_at IS NULL"];
  const hasVersion = "EXISTS (SELECT 1 FROM meeting_report_versions v WHERE v.meeting_id=m.id)";
  if (report !== "all") conditions.push(report === "validated" ? hasVersion : `NOT ${hasVersion}`);
  if (q) {
    const tokens = normalizeMeetingSearch(q).split(/\s+/u);
    values.push(tokens.map((token) => `%${token.replace(/[\\%_]/g, "\\$&")}%`));
    conditions.push(`replace(replace(translate(lower(normalize(concat_ws(' ',
      m.title, m.meeting_type, m.theme, m.objective,
      m.report_draft->>'summary', m.report_draft->>'subjects', m.report_draft->>'historicOriginal',
      to_char(m.meeting_date, 'DD/MM/YYYY'), m.meeting_date::text), NFC)),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'), 'œ', 'oe'), 'æ', 'ae') LIKE ALL($1::text[])`);
  }
  return { where: conditions.join(" AND "), values, limit, offset };
}
