export const KEYS = {
  actions: "finca_maria_action_assignments_v1",
  works: "finca_maria_travaux_v1",
  presences: "finca_maria_maison_presences_v1",
  notes: "finca_maria_maison_notes_v1",
  navigation: "finca_maria_simple_nav_v1"
};

export const TAB_IDS = ["gestion", "analyse", "strategie", "actions", "travaux", "maison"];
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const forbidden = new Set(["__proto__", "constructor", "prototype"]);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.length <= 100_000;
const safeEntries = (value) => isRecord(value) && Object.keys(value).every((key) => !forbidden.has(key));
const textFields = (value, fields) => safeEntries(value) && Object.entries(value).every(([key, text]) => fields.includes(key) && isText(text));
const textMap = (value) => safeEntries(value) && Object.values(value).every(isText);
const recordMap = (value, fields) => safeEntries(value) && Object.values(value).every((entry) => textFields(entry, fields));

export function validPresenceDates(arrival, departure) {
  const validDate = (date) => !date || (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date);
  return validDate(arrival) && validDate(departure) && (!arrival || !departure || departure >= arrival);
}

export function validateValue(key, value) {
  if (key === KEYS.actions) return recordMap(value, ["assignedTo", "status", "dueAt", "contactMode", "contactWith", "resolution"]);
  if (key === KEYS.works) return recordMap(value, ["status", "priority", "note"]);
  if (key === KEYS.notes) return textMap(value);
  if (key === KEYS.navigation) return TAB_IDS.includes(value);
  if (key === KEYS.presences) {
    return Array.isArray(value) && value.every((entry) =>
      textFields(entry, ["id", "name", "arrival", "departure", "place", "note"]) &&
      isText(entry.id) && entry.id.length > 0 && isText(entry.name) && entry.name.trim().length > 0
    ) && new Set(value.map((entry) => entry.id)).size === value.length;
  }
  return false;
}

export function parseBackup(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("Fichier trop volumineux (5 Mo maximum).");
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error("Le fichier ne contient pas une sauvegarde JSON lisible."); }
  if (!safeEntries(backup) || backup.app !== "FINCA_MARIA" || backup.version !== 1 || !safeEntries(backup.data)) throw new Error("Format ou version de sauvegarde FINCA MARIA non reconnu.");
  const names = ["actions", "works", "presences", "notes"];
  if (Object.keys(backup.data).length !== names.length || !names.every((name) => Object.hasOwn(backup.data, name) && validateValue(KEYS[name], backup.data[name]))) throw new Error("La sauvegarde contient des données incomplètes ou invalides.");
  return backup;
}

// A failed write stays available in memory for export; never silently erase stored data.
export function createDataStore(getStorage) {
  const pending = new Map();
  const lastReadable = new Map();
  const issues = new Map();
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener());
  const fallbackFor = (key) => key === KEYS.presences ? [] : key === KEYS.navigation ? "actions" : {};

  function read(key) {
    if (pending.has(key)) return pending.get(key);
    let raw;
    try { raw = getStorage().getItem(key); }
    catch {
      issues.set(key, "Stockage inaccessible : les nouvelles modifications resteront seulement dans cette page. Exportez une sauvegarde avant de la quitter.");
      return lastReadable.get(key) ?? fallbackFor(key);
    }
    try {
      if (raw === null) { issues.delete(key); lastReadable.delete(key); return fallbackFor(key); }
      // The original navigation preference was a plain string, not JSON.
      const value = key === KEYS.navigation ? raw : JSON.parse(raw);
      if (key === KEYS.navigation && !validateValue(key, value)) { issues.delete(key); return "actions"; }
      if (!validateValue(key, value)) throw new Error("Format invalide");
      lastReadable.set(key, value);
      issues.delete(key);
      return value;
    } catch {
      issues.set(key, "Certaines données sont illisibles ou le stockage est inaccessible. Les données existantes ne seront pas écrasées.");
      throw new Error(issues.get(key));
    }
  }

  function update(key, updater) {
    let current;
    try { current = read(key); } catch { emit(); return false; }
    const value = typeof updater === "function" ? updater(current) : updater;
    if (!validateValue(key, value)) throw new Error("Données invalides : modification refusée.");
    try {
      getStorage().setItem(key, key === KEYS.navigation ? value : JSON.stringify(value));
      lastReadable.set(key, value);
      pending.delete(key);
      issues.delete(key);
    } catch {
      pending.set(key, value);
      issues.set(key, "Stockage plein ou indisponible : des modifications restent seulement dans cette page. Exportez une sauvegarde avant de la quitter.");
    }
    emit();
    return true;
  }

  function backup() {
    return {
      app: "FINCA_MARIA", version: 1, exportedAt: new Date().toISOString(),
      data: Object.fromEntries(["actions", "works", "presences", "notes"].map((name) => [name, read(KEYS[name])]))
    };
  }

  function restore(input) {
    const incoming = parseBackup(JSON.stringify(input)).data;
    const current = backup().data;
    const presences = new Map(current.presences.map((entry) => [entry.id, entry]));
    for (const entry of incoming.presences) presences.set(entry.id, { ...presences.get(entry.id), ...entry });
    const merged = {
      actions: { ...current.actions }, works: { ...current.works },
      notes: { ...current.notes, ...incoming.notes },
      presences: Array.from(presences.values())
    };
    for (const name of ["actions", "works"]) {
      for (const [id, entry] of Object.entries(incoming[name])) merged[name][id] = { ...merged[name][id], ...entry };
    }
    const storage = getStorage();
    const originals = new Map(Object.keys(merged).map((name) => [KEYS[name], storage.getItem(KEYS[name])]));
    const written = [];
    try {
      for (const [name, value] of Object.entries(merged)) {
        const key = KEYS[name];
        storage.setItem(key, JSON.stringify(value));
        written.push(key);
      }
    } catch {
      let rolledBack = true;
      for (const key of written.reverse()) {
        try {
          const raw = originals.get(key);
          if (raw === null) storage.removeItem(key); else storage.setItem(key, raw);
        } catch { rolledBack = false; }
      }
      const message = rolledBack ? "Import annulé : stockage indisponible. Les données précédentes sont conservées." : "Import interrompu : retour complet à l’état précédent impossible. Conservez les deux sauvegardes et rechargez après avoir libéré de l’espace.";
      issues.set("restore", message);
      emit();
      throw new Error(message);
    }
    for (const [name, value] of Object.entries(merged)) {
      const key = KEYS[name];
      pending.delete(key); issues.delete(key); lastReadable.set(key, value);
    }
    issues.delete("restore");
    emit();
  }

  return {
    read, update, backup, restore, refresh: emit,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getIssues() {
      for (const key of Object.values(KEYS)) { try { read(key); } catch { /* Report below. */ } }
      return [...new Set(issues.values())];
    }
  };
}

export const dataStore = createDataStore(() => window.localStorage);
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === null || Object.values(KEYS).includes(event.key)) dataStore.refresh();
  });
}
