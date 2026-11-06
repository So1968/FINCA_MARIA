export const ASSIGNMENTS_STORAGE_KEY = "cortijo_action_assignments_v1";
export const ACTION_FILTERS = [
  { id: "active", label: "À faire / en cours" },
  { id: "todo", label: "À compléter" },
  { id: "progress", label: "En cours / attente" },
  { id: "done", label: "Actions accomplies" },
  { id: "all", label: "Toutes" }
];

export function readAssignments(storage) {
  try {
    const raw = storage.getItem(ASSIGNMENTS_STORAGE_KEY);
    const assignments = raw === null ? {} : JSON.parse(raw);
    if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) throw new Error("Format invalide");
    if (Object.values(assignments).some((value) => !value || typeof value !== "object" || Array.isArray(value))) throw new Error("Action invalide");
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
  return ACTION_FILTERS.some((filter) => filter.id === value) ? value : "active";
}

export function matchesActionFilter(status, filter) {
  const bucket = actionBucket(status);
  return filter === "all" || (filter === "active" ? bucket !== "done" : bucket === filter);
}

export function summarizeActions(actions, assignments) {
  const unique = new Map(actions.map((action) => [action.id, action]));
  const counts = { active: 0, todo: 0, progress: 0, done: 0, all: unique.size };
  for (const id of unique.keys()) {
    const bucket = actionBucket(assignments[id]?.status);
    counts[bucket] += 1;
    if (bucket !== "done") counts.active += 1;
  }
  return counts;
}

export function mergeAssignmentChanges(assignments, changes) {
  const result = { ...assignments };
  for (const [id, patch] of Object.entries(changes)) result[id] = { ...(result[id] || {}), ...patch };
  return result;
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
