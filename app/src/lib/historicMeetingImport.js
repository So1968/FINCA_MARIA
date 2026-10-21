// Import historique conservateur : aucun extrait n'est validé automatiquement.
export function parseHistoricReports(input) {
  const raw = String(input || "").replace(/\r\n?/g, "\n").trim();
  if (!raw) return [];
  // Une ligne de huit tirets (ou plus) sépare deux comptes rendus.
  const sections = raw.split(/^\s*-{8,}\s*$/gm).map(x=>x.trim()).filter(Boolean);
  return sections.map((originalText, index) => {
    const lines = originalText.split("\n").map(x=>x.trim()).filter(Boolean);
    const iso = originalText.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
    const french = originalText.match(/\b(0?[1-9]|[12]\d|3[01])[/.\-](0?[1-9]|1[0-2])[/.\-](20\d{2})\b/);
    let date = "";
    if (iso) date = `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`;
    else if (french) date = `${french[3]}-${french[2].padStart(2,"0")}-${french[1].padStart(2,"0")}`;
    const heading = lines[0] || "";
    const title = heading.length < 140 ? heading : `Compte rendu historique ${index+1}`;
    // Ne sélectionner que les formulations explicites : ce sont des pistes à relire.
    const candidates = originalText.split(/\n+/).map(x=>x.trim())
      .filter(x=>/^(?:[-•*]\s*)?(?:décision(?:s)?\s*[:\-]|il a été décidé|décidé\s*[:\-]|le conseil décide|résolution\s*[:\-]|vote\s*[:\-])/i.test(x))
      .map(x=>x.slice(0,2500)).slice(0,100);
    return { originalText, title, date, candidates };
  });
}
