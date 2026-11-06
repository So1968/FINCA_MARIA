export function ActionSaveStatus({ message, canRetry, onRetry }) {
  return (
    <div style={{ margin: ".4rem 0", fontSize: ".86rem" }}>
      <p role="status" aria-live="polite">{message}</p>
      {canRetry && <button type="button" className="fincaBack" onClick={onRetry}>Réessayer la sauvegarde</button>}
    </div>
  );
}
