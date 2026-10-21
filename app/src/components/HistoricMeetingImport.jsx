import { useMemo, useState } from "react";
import { parseHistoricReports } from "../lib/historicMeetingImport.js";

export default function HistoricMeetingImport({ onImported, onClose }) {
  const [source, setSource] = useState("");
  const [dates, setDates] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reports = useMemo(() => parseHistoricReports(source), [source]);

  async function submit(event) {
    event.preventDefault();
    const items = reports.map((item, index) => ({ ...item, date: dates[index] ?? item.date }));
    if (!items.length || items.length > 50 || items.some((item) => !item.date)) {
      setMessage("Vérifie les dates de toutes les réunions et limite le lot à 50.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/meetings/import-historic", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Échec de l’import");
      setMessage(data.imported + " compte(s) rendu(s) importé(s), " + data.duplicates + " doublon(s) ignoré(s). Décisions en attente de vérification.");
      setSource("");
      setDates({});
      await onImported?.(data.results?.[0]?.id);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="meetingSection" onSubmit={submit}>
      <h2>Importer les anciens comptes rendus</h2>
      <p>Colle jusqu’à 50 comptes rendus. Sépare chaque réunion par une ligne contenant uniquement huit tirets : <code>--------</code>.</p>
      <p className="meetingMuted">Les textes originaux sont conservés sans modification. Les pistes de décisions ne deviennent pas automatiquement des décisions officielles.</p>
      <textarea aria-label="Comptes rendus anciens" rows={14} style={{ width: "100%" }} value={source} onChange={(event) => { setSource(event.target.value); setDates({}); }} placeholder={"Réunion du 12/05/2024\nDécision : ...\n\n--------\n\nRéunion du 20/06/2024\nDécision : ..."} />
      <h3>Aperçu : {reports.length} compte(s) rendu(s)</h3>
      {reports.map((item, index) => (
        <div className="meetingSection" key={index}>
          <strong>{index + 1} · {item.title}</strong>
          <label className="meetingField"><span>Date exacte</span>
            <input type="date" value={dates[index] ?? item.date} onChange={(event) => setDates((old) => ({ ...old, [index]: event.target.value }))} />
          </label>
          <span className="meetingMuted">{item.candidates.length} piste(s) de décisions à relire</span>
        </div>
      ))}
      {message && <p role="status">{message}</p>}
      <div className="meetingActions">
        <button className="meetingBtn primary" type="submit" disabled={busy || reports.length === 0 || reports.length > 50}>Importer en lot</button>
        <button className="meetingBtn" type="button" onClick={onClose}>Revenir</button>
      </div>
    </form>
  );
}
