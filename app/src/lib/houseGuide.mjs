import { safeWebUrl } from "./houseData.mjs";
const APPROVED = new Set(["À conseiller", "Testé — coup de cœur", "Testé — sympa"]);
export function publicHousePlaces(places) {
  return places.filter((item) => item && !item.archivedAt && APPROVED.has(item.status)).map((item) => ({
    name: item.name || "Lieu", zone: item.zone || "", category: item.category || "Sortie", duration: item.duration || "À préciser",
    note: item.note || "", publicNote: item.publicNote || "", bestTime: item.bestTime || "", parking: item.parking || "", practical: item.practical || "", mapUrl: safeWebUrl(item.mapUrl)
  }));
}
export function houseGuideText(places) {
  return ["FINCA MARIA — Guide des sorties", ...publicHousePlaces(places).map((item) => [
    "", `${item.name} — ${item.zone}`, `${item.category} · ${item.duration}`, item.note, item.publicNote,
    item.bestTime && `Quand : ${item.bestTime}`, item.parking && `Accès : ${item.parking}`, item.practical,
    item.mapUrl
  ].filter(Boolean).join("\n"))].join("\n");
}
const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export function houseGuideHtml(places) {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FINCA MARIA — Guide des sorties</title><style>body{max-width:850px;margin:auto;padding:24px;font:18px/1.6 system-ui;background:#f8f5ed;color:#17271b}article{border-top:1px solid #b4aa8b;margin:24px 0;padding-top:12px}p{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#275b37}</style><h1>FINCA MARIA — Guide des sorties</h1>${publicHousePlaces(places).map((item) => `<article><h2>${html(item.name)}</h2>${[item.zone, `${item.category} · ${item.duration}`, item.note, item.publicNote, item.bestTime && `Quand : ${item.bestTime}`, item.parking && `Accès : ${item.parking}`, item.practical].filter(Boolean).map((text) => `<p>${html(text)}</p>`).join("")}${item.mapUrl ? `<a href="${html(item.mapUrl)}" rel="noreferrer">Carte</a>` : ""}</article>`).join("")}</html>`;
}
export async function copyHouseText(text) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const textarea = document.createElement("textarea"); textarea.value = text;
  document.body.appendChild(textarea); textarea.select();
  const copied = document.execCommand("copy"); textarea.remove();
  if (!copied) throw new Error("Copie indisponible");
}
export function downloadHouseGuide(places) {
  const url = URL.createObjectURL(new Blob([houseGuideHtml(places)], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "FINCA_MARIA-guide-sorties.html";
  link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
