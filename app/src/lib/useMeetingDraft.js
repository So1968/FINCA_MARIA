import { useCallback, useRef, useState } from "react";

// Server refreshes may update a clean form, but must never replace local edits.
export function useMeetingDraft(initialValue) {
  const [value, setValue] = useState(initialValue);
  const current = useRef(value);
  const revision = useRef(0);
  const dirty = useRef(false);

  const edit = useCallback((update) => {
    const next = typeof update === "function" ? update(current.current) : update;
    current.current = next;
    revision.current += 1;
    dirty.current = true;
    setValue(next);
  }, []);

  const refresh = useCallback((next, reset = false) => {
    if (dirty.current && !reset) return;
    if (reset) revision.current += 1;
    current.current = next;
    dirty.current = false;
    setValue(next);
  }, []);

  const snapshot = useCallback(() => ({ value: current.current, revision: revision.current }), []);

  const acknowledge = useCallback((saved, serverValue) => {
    // A save response must not discard text typed while the request was pending.
    if (saved.revision !== revision.current) return;
    current.current = serverValue;
    dirty.current = false;
    setValue(serverValue);
  }, []);

  return { value, edit, refresh, snapshot, acknowledge, dirty: dirty.current };
}
