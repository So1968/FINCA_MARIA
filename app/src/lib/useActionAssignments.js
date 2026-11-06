import { useEffect, useRef, useState } from "react";
import { ASSIGNMENTS_STORAGE_KEY, mergeAssignmentChanges, readAssignments, writeAssignments } from "./actionAssignments.mjs";

const READ_ERROR = "Attention : lecture des actions impossible. Les données existantes sont conservées ; rechargez la page avant de modifier.";
const SAVE_ERROR = "Attention : modifications non enregistrées. Gardez cette page ouverte et vérifiez le stockage du navigateur.";

function load() {
  try { return readAssignments(window.localStorage); }
  catch { return { assignments: {}, error: true }; }
}

export function useActionAssignments() {
  const [state, setState] = useState(load);
  const pending = useRef({});
  const [saveMessage, setSaveMessage] = useState(() => state.error
    ? READ_ERROR : "Les modifications seront enregistrées sur cet appareil uniquement.");

  useEffect(() => {
    function refresh(event) {
      if (event.key !== null && event.key !== ASSIGNMENTS_STORAGE_KEY) return;
      try { if (event.storageArea !== window.localStorage) return; } catch { return; }
      const loaded = load();
      if (loaded.error) {
        setState((current) => ({ ...current, error: true }));
        setSaveMessage(READ_ERROR);
        return;
      }
      const unsaved = Object.keys(pending.current).length > 0;
      setState({ assignments: mergeAssignmentChanges(loaded.assignments, pending.current), error: false });
      setSaveMessage(unsaved ? SAVE_ERROR : "Modifications reçues depuis un autre onglet sur cet appareil.");
    }
    function guardUnsaved(event) {
      if (Object.keys(pending.current).length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("beforeunload", guardUnsaved);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("beforeunload", guardUnsaved);
    };
  }, []);

  function updateAssignment(actionId, patch) {
    // Re-read just before editing to preserve changes already saved by another tab.
    const loaded = load();
    if (loaded.error) {
      setState((current) => ({ ...current, error: true }));
      setSaveMessage(READ_ERROR);
      return;
    }
    pending.current = mergeAssignmentChanges(pending.current, { [actionId]: patch });
    const assignments = mergeAssignmentChanges(loaded.assignments, pending.current);
    let saved = false;
    try { saved = writeAssignments(window.localStorage, assignments); } catch { /* Stockage indisponible. */ }
    if (saved) pending.current = {};
    setState({ assignments, error: false });
    setSaveMessage(saved ? "Modifications enregistrées sur cet appareil uniquement." : SAVE_ERROR);
  }

  return { assignments: state.assignments, updateAssignment, saveMessage, readError: state.error };
}
