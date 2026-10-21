import { useCallback, useEffect, useState } from "react";
import { dataStore, KEYS } from "./storage.js";

export function useStoredState(key) {
  const load = useCallback(() => {
    try { return dataStore.read(key); }
    catch { return key === KEYS.presences ? [] : key === KEYS.navigation ? "actions" : {}; }
  }, [key]);
  const [value, setValue] = useState(load);
  useEffect(() => {
    const refresh = () => setValue(load());
    const unsubscribe = dataStore.subscribe(refresh);
    refresh();
    return unsubscribe;
  }, [load]);
  const update = useCallback((next) => dataStore.update(key, next), [key]);
  return [value, update];
}
