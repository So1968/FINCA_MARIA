import { useCallback, useEffect, useRef, useState } from "react";
import { readHouseData } from "./houseData.mjs";

export const HOUSE_STORAGE_EVENT = "finca-maria-storage-updated";

export function useHouseStorage(key, fallback) {
  const fallbackRef = useRef(fallback);
  const load = useCallback(() => {
    try { return readHouseData(window.localStorage, key, fallbackRef.current); }
    catch { return { value: fallbackRef.current, error: true }; }
  }, [key]);
  const [state, setState] = useState(load);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef([]);
  const latest = useRef(state);
  const applyPending = useCallback((value) => pending.current.reduce((current, operation) => operation(current), value), []);
  const publish = useCallback((next) => { latest.current = next; setState(next); }, []);

  const refresh = useCallback(() => {
    const loaded = load();
    publish(loaded.error ? { ...latest.current, error: true } : { value: applyPending(loaded.value), error: false });
  }, [load, publish, applyPending]);

  useEffect(() => {
    function onStorage(event) { if (event.key === null || event.key === key) refresh(); }
    function beforeUnload(event) { if (pending.current.length) { event.preventDefault(); event.returnValue = ""; } }
    window.addEventListener("storage", onStorage);
    window.addEventListener(HOUSE_STORAGE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(HOUSE_STORAGE_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [key, refresh]);

  const save = useCallback(() => {
    const loaded = load();
    if (loaded.error) { publish({ ...latest.current, error: true }); return false; }
    const value = applyPending(loaded.value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      pending.current = [];
      setSaveError(false);
      publish({ value, error: false });
      window.dispatchEvent(new Event(HOUSE_STORAGE_EVENT));
      return true;
    } catch {
      publish({ value, error: false });
      setSaveError(true);
      return false;
    }
  }, [key, load, publish, applyPending]);

  const update = useCallback((operation) => {
    if (latest.current.error) return false;
    pending.current.push(operation);
    return save();
  }, [save]);
  return { value: state.value, readError: state.error, saveError, update, retry: save };
}
