export const EARTH_TAB_IDS = ["gestion", "entretien", "analyse", "strategie", "actions"];
export function earthTab(value, fallback = "gestion") {
  return EARTH_TAB_IDS.includes(value) ? value : EARTH_TAB_IDS.includes(fallback) ? fallback : "gestion";
}
export function earthUrl(href, tab, { contact, filter = "active" } = {}) {
  const url = new URL(href); url.search = ""; url.hash = "";
  url.searchParams.set("area", "terre"); url.searchParams.set("tab", earthTab(tab));
  if (tab === "actions") {
    url.searchParams.set("filter", filter);
    if (contact) url.searchParams.set("contact", contact);
  }
  return url.toString();
}
