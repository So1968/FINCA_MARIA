const CLASSIFICATIONS = {
  decision_confirmee: "Décision confirmée", action_confirmee: "Action confirmée",
  proposition: "Proposition", declaration: "Déclaration", a_valider: "À valider",
  a_verifier: "À vérifier", desaccord: "Désaccord", question_ouverte: "Question ouverte",
  document_evoque: "Document évoqué"
};
const GROUPS = [
  ["Décisions confirmées", ["decision_confirmee"]],
  ["Actions confirmées", ["action_confirmee"]],
  ["Désaccords", ["desaccord"]],
  ["Questions ouvertes", ["question_ouverte"]],
  ["Propositions, déclarations et points à valider", ["proposition", "declaration", "a_valider", "a_verifier"]],
  ["Documents évoqués", ["document_evoque"]],
  ["Autres repères", []]
];
const text = (value) => typeof value === "string" ? value.trim() : "";
const record = (value) => value && typeof value === "object" && !Array.isArray(value);

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error("Date de réunion invalide dans la version conservée.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Date de réunion invalide dans la version conservée.");
  return value.split("-").reverse().join("/");
}

function clock(value) {
  if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return "Sans repère horaire";
  const seconds = Math.floor(Number(value));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
}

export function buildValidatedReportExport(version, meetingId) {
  const snapshot = version?.snapshot;
  if (!record(version) || !text(version.id) || !Number.isSafeInteger(version.version) || version.version < 1 ||
      snapshot?.schema !== "finca-meeting-report-v1" || !meetingId || snapshot.meeting?.id !== meetingId ||
      !text(snapshot.meeting?.title) || !record(snapshot.reportDraft) || !Array.isArray(snapshot.meeting.agenda) ||
      [snapshot.participants, snapshot.markers, snapshot.links].some((items) => !Array.isArray(items) || items.some((item) => !record(item)))) {
    throw new Error("La copie de cette version validée est absente ou incomplète.");
  }
  const validatedAt = new Date(version.validatedAt);
  if (typeof version.validatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(version.validatedAt) || !Number.isFinite(validatedAt.getTime())) throw new Error("Date de validation absente ou invalide.");
  const meeting = snapshot.meeting;
  const date = dateLabel(meeting.date);
  const validation = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(validatedAt);
  const lines = [
    "FINCA MARIA — COMPTE RENDU VALIDÉ", "", meeting.title,
    `Réunion du ${date}`, `Type : ${text(meeting.meetingType) || "Non renseigné"}`,
    `Version validée : ${version.version}`, `Validation : ${validation} (heure de Paris)`,
    `Référence réunion : ${meetingId}`, `Référence version : ${version.id}`,
    "Source : copie datée de la version validée conservée dans FINCA MARIA."
  ];
  function section(title, content) {
    lines.push("", title.toUpperCase(), "", content || "Non renseigné dans cette version.");
  }
  if (text(meeting.theme)) section("Thème", meeting.theme);
  if (text(meeting.objective)) section("Objectif", meeting.objective);
  if (meeting.agenda?.length) section("Ordre du jour", meeting.agenda.map((item) => `- ${text(item)}`).join("\n"));
  if (text(meeting.previousRecap)) section("Rappel de la réunion précédente", meeting.previousRecap);
  section("Participants", snapshot.participants.map((participant) => {
    const presence = { present: "Présent", absent: "Absent", excused: "Excusé" }[participant.presence] || "Présence non renseignée";
    return `- ${text(participant.name) || "Nom non renseigné"} — ${presence}${text(participant.role) ? ` · ${participant.role}` : ""}${participant.isFacilitator ? " · Animation" : ""}`;
  }).join("\n"));
  section("Synthèse", text(snapshot.reportDraft.summary));
  section("Sujets abordés", text(snapshot.reportDraft.subjects));
  if (text(snapshot.reportDraft.historicOriginal)) section("Compte rendu historique d’origine", snapshot.reportDraft.historicOriginal);
  for (const [title, classifications] of GROUPS) {
    const markers = snapshot.markers.filter((marker) => classifications.length
      ? classifications.includes(marker.classification) : !Object.hasOwn(CLASSIFICATIONS, marker.classification));
    if (!markers.length) continue;
    section(title, markers.map((marker) => {
      const label = Object.hasOwn(CLASSIFICATIONS, marker.classification) ? CLASSIFICATIONS[marker.classification] : (text(marker.classification) ? `Qualification : ${marker.classification}` : "Qualification non renseignée");
      let content = `- [${clock(marker.timeSeconds)} · ${label}] ${text(marker.note) || "Note non renseignée."}`;
      if (text(marker.responsible)) content += `\n  Responsable : ${marker.responsible}`;
      else if (marker.classification === "action_confirmee") content += "\n  Responsable non précisé.";
      if (text(marker.dueDate)) content += `\n  Échéance : ${dateLabel(marker.dueDate)}`;
      else if (marker.classification === "action_confirmee") content += "\n  Échéance non précisée.";
      return content;
    }).join("\n"));
  }
  if (snapshot.links.length) section("Références liées", snapshot.links.map((link) =>
    `- ${link.kind === "document" ? "Document" : link.kind === "action" ? "Action" : text(link.kind) || "Référence"} : ${text(link.targetRef) || "Non renseignée"}${text(link.markerId) ? ` · Repère : ${link.markerId}` : ""}`
  ).join("\n"));
  const slug = meeting.title.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-|-$/g, "") || "reunion";
  return {
    filename: `finca-maria_compte-rendu_${meeting.date}_v${version.version}_${slug}.txt`,
    content: lines.join("\n") + "\n"
  };
}

export function downloadValidatedReport(version, meetingId) {
  const { filename, content } = buildValidatedReportExport(version, meetingId);
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
