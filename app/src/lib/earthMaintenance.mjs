import { historyChange, isRecord } from "./houseData.mjs";

export const EARTH_MAINTENANCE_KEY = "finca_maria_entretien_terre_v1";
export const emptyEarthTracking = () => ({ campaigns: {} });
export const validEarthTracking = value => isRecord(value) && isRecord(value.campaigns)
  && Object.values(value.campaigns).every(campaign => isRecord(campaign) && Object.values(campaign).every(isRecord));
const equal = (left, right) => JSON.stringify(left ?? "") === JSON.stringify(right ?? "");
export const hasEarthChanges = changes => Object.values(changes).some(campaign => Object.values(campaign).some(fields => Object.keys(fields).length));

export function changeEarthField(source, changes, season, id, field, value) {
  const fields = { ...changes[season]?.[id] };
  const existing = fields[field];
  const before = existing ? existing.before : source.campaigns?.[season]?.[id]?.[field];
  if (equal(before, value)) delete fields[field];
  else fields[field] = { before, value };
  return { ...changes, [season]: { ...changes[season], [id]: fields } };
}

export function earthConflicts(source, changes) {
  const conflicts = [];
  for (const [season, campaign] of Object.entries(changes)) for (const [id, fields] of Object.entries(campaign)) {
    for (const [field, change] of Object.entries(fields)) {
      const current = source.campaigns?.[season]?.[id]?.[field];
      if (!equal(current, change.before) && !equal(current, change.value)) conflicts.push({ season, id, field });
    }
  }
  return conflicts;
}

export function mergeEarthChanges(source, changes, withHistory = false) {
  const campaigns = { ...source.campaigns };
  for (const [season, campaign] of Object.entries(changes)) for (const [id, fields] of Object.entries(campaign)) {
    if (!Object.keys(fields).length) continue;
    const current = campaigns[season]?.[id] || {};
    const patch = Object.fromEntries(Object.entries(fields).map(([field, change]) => [field, change.value]));
    campaigns[season] = { ...campaigns[season], [id]: { ...current, ...(withHistory ? historyChange(current, patch, "Suivi TERRE enregistré") : patch) } };
  }
  return { ...source, campaigns };
}
