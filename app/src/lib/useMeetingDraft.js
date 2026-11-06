import { useCallback, useEffect, useRef, useState } from "react";

// Server refreshes may update a clean form, but must never replace local edits.
export function useMeetingDraft(initialValue, onDirtyChange) {
  const [value, setValue] = useState(initialValue);
  const current = useRef(value);
  const revision = useRef(0);
  const dirty = useRef(false);

  const markDirty = useCallback((next) => {
    dirty.current = next;
    onDirtyChange?.(next);
  }, [onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const edit = useCallback((update) => {
    const next = typeof update === "function" ? update(current.current) : update;
    current.current = next;
    revision.current += 1;
    markDirty(true);
    setValue(next);
  }, [markDirty]);

  const refresh = useCallback((next, reset = false) => {
    if (dirty.current && !reset) return;
    if (reset) revision.current += 1;
    current.current = next;
    markDirty(false);
    setValue(next);
  }, [markDirty]);

  const snapshot = useCallback(() => ({ value: current.current, revision: revision.current }), []);

  const acknowledge = useCallback((saved, serverValue) => {
    // A save response must not discard text typed while the request was pending.
    if (saved.revision !== revision.current) return;
    current.current = serverValue;
    markDirty(false);
    setValue(serverValue);
  }, [markDirty]);

  const isDirty = useCallback(() => dirty.current, []);

  return { value, edit, refresh, snapshot, acknowledge, dirty: dirty.current, isDirty };
}
