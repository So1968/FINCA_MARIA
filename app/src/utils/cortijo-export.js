export function buildCortijoTextExport({ questions = [], anomalies = [], proofs = [], alerts = [] }) {
  const lines = [
    "DOSSIER FINCA MARIA — EXPORT V1",
    "",
    "QUESTIONS OUVERTES",
    ...questions.map((item) => `- ${item.title} | statut: ${item.status || "à définir"} | lié à: ${item.linkedTo || "à relier"}`),
    "",
    "ANOMALIES",
    ...anomalies.map((item) => `- ${item.title} | statut: ${item.status || "à vérifier"} | gravité: ${item.severity || "à qualifier"}`),
    "",
    "PREUVES",
    ...proofs.map((item) => `- ${item.title} | type: ${item.type || "à qualifier"} | lié à: ${item.linkedTo || "à relier"}`),
    "",
    "ALERTES",
    ...alerts.map((item) => `- ${item.title} | niveau: ${item.level || "info"} | détail: ${item.detail || ""}`)
  ];

  return lines.join("\n");
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
