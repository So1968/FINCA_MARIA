import { useEffect, useState } from "react";
import { readAssignments, writeAssignments } from "./actionAssignments.mjs";

export function useActionAssignments() {
  const [state, setState] = useState(() => {
    let loaded;
    try { loaded = readAssignments(window.localStorage); }
    catch { loaded = { assignments: {}, error: true }; }
    return { ...loaded, edited: false };
  });
  const [saveMessage, setSaveMessage] = useState(() => state.error
    ? "Attention : lecture des actions impossible. Les données existantes sont conservées ; rechargez la page avant de modifier."
    : "Les modifications seront enregistrées sur cet appareil uniquement.");

  useEffect(() => {
    if (!state.edited || state.error) return;
    let saved = false;
    try { saved = writeAssignments(window.localStorage, state.assignments); } catch { /* Stockage indisponible. */ }
    setSaveMessage(saved
      ? "Modifications enregistrées sur cet appareil uniquement."
      : "Attention : modifications non enregistrées. Gardez cette page ouverte et vérifiez le stockage du navigateur.");
  }, [state]);

  function updateAssignment(actionId, patch) {
    if (state.error) return;
    setSaveMessage("Enregistrement en cours sur cet appareil…");
    setState((current) => ({
      ...current,
      edited: true,
      assignments: { ...current.assignments, [actionId]: { ...(current.assignments[actionId] || {}), ...patch } }
    }));
  }

  return { assignments: state.assignments, updateAssignment, saveMessage, readError: state.error };
}
