import { useEffect, useState } from "react";

const LABELS = {
  decision_confirmee: "Décision confirmée", action_confirmee: "Action confirmée",
  a_valider: "À valider", a_verifier: "À vérifier", proposition: "Proposition",
  declaration: "Déclaration", desaccord: "Désaccord", question_ouverte: "Question ouverte", document_evoque: "Document évoqué"
};

export default function MeetingDecisionRegister({ onOpen, onClose, filter, onFilterChange }) {
  const [decisions, setDecisions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/meetings/decision-register", { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || "Impossible de charger le registre");
        if (!Array.isArray(json.decisions) || json.decisions.some((item) => !item || typeof item.id !== "string" || typeof item.meetingId !== "string")) throw new Error("Le registre reçu est incomplet. Réessayez son chargement.");
        if (!cancelled) setDecisions(json.decisions);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [attempt]);

  const selected = decisions.filter((item) => filter === "all" || (filter === "confirmed" ? item.classification === "decision_confirmee" : item.classification !== "decision_confirmee"));
  return (
    <section className="meetingSection">
      <h2>Registre des décisions de famille</h2>
      <p className="meetingMuted">Chaque décision reste reliée au compte rendu et à sa date. Les pistes extraites des archives restent « À valider » jusqu’à une revue humaine.</p>
      <label>Afficher <select aria-label="Filtrer le registre des décisions" value={filter} onChange={(event) => onFilterChange(event.target.value)}>
        <option value="all">Tous les éléments</option><option value="confirmed">Décisions confirmées</option><option value="pending">Autres éléments</option>
      </select></label>
      {loading && <p role="status">Chargement du registre…</p>}
      {!loading && !error && <p role="status">{selected.length} élément{selected.length > 1 ? "s" : ""} dans cette rubrique</p>}
      {error && <div role="alert"><p>{error}</p><button className="meetingBtn" type="button" onClick={() => setAttempt((current) => current + 1)}>Réessayer le registre</button></div>}
      {!loading && !error && selected.length === 0 && <p className="meetingMuted">Aucun élément dans cette rubrique.</p>}
      {!loading && !error && selected.map((item) => (
        <article className="meetingSection" key={item.id}>
          <strong>{item.note || "Repère sans commentaire"}</strong>
          <p className="meetingMuted">{item.date} · {item.title} · {Object.hasOwn(LABELS, item.classification) ? LABELS[item.classification] : "Qualification non reconnue"}</p>
          {item.responsible && <p>Responsable : {item.responsible}</p>}
          {item.dueDate && <p>Échéance : {item.dueDate}</p>}
          <button className="meetingBtn" type="button" onClick={() => onOpen(item.meetingId, item.id)}>Voir le compte rendu d’origine</button>
        </article>
      ))}
      <button className="meetingBtn" type="button" onClick={onClose}>Revenir aux réunions</button>
    </section>
  );
}
