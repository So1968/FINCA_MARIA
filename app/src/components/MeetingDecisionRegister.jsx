import { useEffect, useState } from "react";

const LABELS = { decision_confirmee: "Confirmée", a_valider: "À valider", proposition: "Proposition", declaration: "Déclaration" };

export default function MeetingDecisionRegister({ onOpen, onClose }) {
  const [decisions, setDecisions] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meetings/decision-register")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Impossible de charger le registre");
        if (!cancelled) setDecisions(json.decisions || []);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const selected = decisions.filter((item) => filter === "all" || (filter === "confirmed" ? item.classification === "decision_confirmee" : item.classification !== "decision_confirmee"));
  return (
    <section className="meetingSection">
      <h2>Registre des décisions de famille</h2>
      <p className="meetingMuted">Chaque décision reste reliée au compte rendu et à sa date. Les pistes extraites des archives restent « À valider » jusqu’à une revue humaine.</p>
      <label>Afficher <select value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">Toutes les décisions et pistes</option><option value="confirmed">Décisions confirmées</option><option value="pending">À confirmer</option>
      </select></label>
      <p>{selected.length} décision(s) ou piste(s)</p>
      {error && <p role="alert">{error}</p>}
      {selected.map((item) => (
        <article className="meetingSection" key={item.id}>
          <strong>{item.note || "Décision sans commentaire"}</strong>
          <p className="meetingMuted">{item.date} · {item.title} · {LABELS[item.classification] || item.classification}</p>
          {item.responsible && <p>Responsable : {item.responsible}</p>}
          {item.dueDate && <p>Échéance : {item.dueDate}</p>}
          <button className="meetingBtn" type="button" onClick={() => onOpen(item.meetingId)}>Voir le compte rendu d’origine</button>
        </article>
      ))}
      <button className="meetingBtn" type="button" onClick={onClose}>Revenir aux réunions</button>
    </section>
  );
}
