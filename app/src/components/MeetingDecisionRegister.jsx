import { useEffect, useState } from "react";
import { searchDecisionRegister } from "../lib/decisionRegisterSearch.mjs";

const LABELS = {
  decision_confirmee: "Décision confirmée", action_confirmee: "Action confirmée",
  a_valider: "À valider", a_verifier: "À vérifier", proposition: "Proposition",
  declaration: "Déclaration", desaccord: "Désaccord", question_ouverte: "Question ouverte", decision_reportee: "Décision reportée", document_evoque: "Document évoqué"
};

export default function MeetingDecisionRegister({ onOpen, onClose, filter, onFilterChange, search, onSearchChange, page, onPageChange, criteria, onCriteriaChange }) {
  const [decisions, setDecisions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({q:search,year:criteria.year,person:criteria.person,status:criteria.status});
    const timer=window.setTimeout(() => {
    fetch(`/api/meetings/decision-register?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || "Impossible de charger le registre");
        if (!Array.isArray(json.decisions) || json.decisions.some((item) => !item || typeof item.id !== "string" || typeof item.meetingId !== "string")) throw new Error("Le registre reçu est incomplet. Réessayez son chargement.");
        if (!cancelled) setDecisions(json.decisions);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    }, search || criteria.person ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort(); };
  }, [attempt,search,criteria.year,criteria.person,criteria.status]);

  const selected = searchDecisionRegister(decisions, search).filter((item) => filter === "all" || (filter === "confirmed" ? item.classification === "decision_confirmee" : item.classification !== "decision_confirmee"));
  const lastPage = Math.max(0, Math.ceil(selected.length / 25) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * 25;
  const visible = selected.slice(start, start + 25);
  return (
    <section className="meetingSection">
      <h2>Registre des décisions de famille</h2>
      <p className="meetingMuted">Chaque décision reste reliée au compte rendu et à sa date. Les pistes extraites des archives restent « À valider » jusqu’à une revue humaine.</p>
      <label>Afficher <select aria-label="Filtrer le registre des décisions" value={filter} onChange={(event) => { onPageChange(0); onFilterChange(event.target.value); }}>
        <option value="all">Tous les éléments</option><option value="confirmed">Décisions confirmées</option><option value="pending">Autres éléments</option>
      </select></label>
      <label>Rechercher dans le registre
        <input type="search" value={search} maxLength={200} onChange={(event) => { onPageChange(0); onSearchChange(event.target.value); }} placeholder="Note, responsable ou réunion…" />
      </label>
      {search && <button className="meetingBtn" type="button" onClick={() => { onPageChange(0); onSearchChange(""); }}>Effacer la recherche du registre</button>}
      {!loading && !error && decisions.length >= 5000 && <p className="meetingMuted">Ce registre affiche les 5 000 repères les plus récents. La recherche porte sur ces éléments.</p>}
      <div className="meetingGrid">
        <label className="meetingField"><span>Année du registre</span><input inputMode="numeric" maxLength={4} value={criteria.year} placeholder="Toutes" onChange={(e)=>{onPageChange(0);onCriteriaChange({...criteria,year:e.target.value.replace(/[^0-9]/g,'')});}}/></label>
        <label className="meetingField"><span>Responsable du registre</span><input type="search" value={criteria.person} maxLength={180} onChange={(e)=>{onPageChange(0);onCriteriaChange({...criteria,person:e.target.value});}}/></label>
        <label className="meetingField"><span>Statut précis du registre</span><select value={criteria.status} onChange={(e)=>{onPageChange(0);onCriteriaChange({...criteria,status:e.target.value});}}><option value="">Tous les statuts</option>{Object.entries(LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {loading && <p role="status">Chargement du registre…</p>}
      {!loading && !error && <p role="status">{selected.length} élément{selected.length > 1 ? "s" : ""} dans cette rubrique</p>}
      {error && <div role="alert"><p>{error}</p><button className="meetingBtn" type="button" onClick={() => setAttempt((current) => current + 1)}>Réessayer le registre</button></div>}
      {!loading && !error && selected.length === 0 && <p className="meetingMuted">{search.trim() ? "Aucun élément ne correspond à cette recherche dans cette rubrique." : "Aucun élément dans cette rubrique."}</p>}
      {!loading && !error && selected.length > 25 && <nav className="meetingActions" aria-label="Pages du registre">
        <button className="meetingBtn" type="button" disabled={currentPage === 0} onClick={() => onPageChange(currentPage - 1)}>Page précédente du registre</button>
        <span role="status">Éléments {start + 1} à {Math.min(start + 25, selected.length)} sur {selected.length} · Page {currentPage + 1} sur {lastPage + 1}</span>
        <button className="meetingBtn" type="button" disabled={currentPage === lastPage} onClick={() => onPageChange(currentPage + 1)}>Page suivante du registre</button>
      </nav>}
      {!loading && !error && visible.map((item) => (
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
