export const ASSIGNMENTS_STORAGE_KEY = "cortijo_action_assignments_v1";

export function readAssignments(storage) {
  try {
    const raw = storage.getItem(ASSIGNMENTS_STORAGE_KEY);
    const assignments = raw === null ? {} : JSON.parse(raw);
    if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) throw new Error("Format invalide");
    return { assignments, error: false };
  } catch {
    return { assignments: {}, error: true };
  }
}

export function writeAssignments(storage, assignments) {
  try {
    storage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    return true;
  } catch {
    return false;
  }
}

export function normalizeActionStatus(status = "Action à compléter") {
  if (status === "Terminée") return "Action accomplie";
  if (status === "Attribuée") return "En cours";
  return status;
}

export function actionBucket(status) {
  const value = normalizeActionStatus(status);
  if (value === "Action accomplie") return "done";
  if (value === "En cours" || value === "En attente") return "progress";
  return "todo";
}

export function actionFilter(value) {
  return ["active", "done", "all"].includes(value) ? value : "active";
}

export function actionsUrl(href, { contact, filter = "active", dossier = false }) {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  if (dossier) url.searchParams.set("view", "cortijo-memoire");
  else {
    url.searchParams.set("area", "terre");
    url.searchParams.set("tab", "actions");
  }
  if (contact) url.searchParams.set("contact", contact);
  url.searchParams.set("filter", actionFilter(filter));
  return url.toString();
}
