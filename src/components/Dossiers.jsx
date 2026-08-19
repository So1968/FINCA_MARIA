import { useEffect, useMemo, useState } from "react";
import { actions } from "../data/actions.js";
import { dossiers } from "../data/dossiers.js";
import { ActionCard, actionBucket } from "./ActionCard.jsx";

const STORAGE_KEY = "finca_maria_action_assignments_v1";
const FILTERS = [
  ["todo", "À compléter"],
  ["progress", "En cours"],
  ["done", "Accomplies"],
  ["all", "Toutes"]
];

function loadAssignments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function Dossiers() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("contact");
  const initial = dossiers.some((item) => item.id === requested) ? requested : "san-juan";
  const [activeId, setActiveId] = useState(initial);
  const [filter, setFilter] = useState("todo");
  const [assignments, setAssignments] = useState(loadAssignments);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments)); }, [assignments]);

  const active = dossiers.find((item) => item.id === activeId) || dossiers[0];
  const activeActions = active.actionIds.map((id) => actions.find((action) => action.id === id)).filter(Boolean);

  const counts = useMemo(() => {
    const result = { todo: 0, progress: 0, done: 0, all: activeActions.length };
    activeActions.forEach((action) => result[actionBucket(assignments[action.id]?.status)] += 1);
    return result;
  }, [activeActions, assignments]);

  const visible = useMemo(() => filter === "all" ? activeActions : activeActions.filter((action) => actionBucket(assignments[action.id]?.status) === filter), [activeActions, assignments, filter]);

  function selectDossier(id) {
    setActiveId(id);
    setFilter("todo");
    window.history.replaceState(null, "", `/?view=cortijo-memoire&contact=${id}`);
    requestAnimationFrame(() => document.getElementById("action-board")?.scrollIntoView({ block: "start" }));
  }

  function updateAssignment(actionId, patch) {
    setAssignments((current) => ({ ...current, [actionId]: { ...(current[actionId] || {}), ...patch } }));
  }

  return (
    <main className="page">
      <header className="hero">
        <div><span className="eyebrow">FINCA MARIA</span><h1>Dossiers & actions</h1><p>Une action se pilote directement sur sa petite carte. On n'ouvre que pour le but, la résolution et les détails utiles.</p></div>
        <div className="top-actions"><a href="/">FINCA MARIA</a></div>
      </header>

      <section className="section" style={{ padding: "10px" }}>
        <div className="dossier-buttons">
          {dossiers.map((item, index) => <button type="button" key={item.id} className={activeId === item.id ? "is-active" : ""} onClick={() => selectDossier(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><p>{item.subtitle}</p></button>)}
        </div>
      </section>

      <section id="action-board" className="section" style={{ padding: "12px" }}>
        <div className="action-head" style={{ marginBottom: "10px" }}><div className="action-title"><span className="pill">A</span><h2>Actions — {active.label}</h2><p>Statut, échéance, attribution, mode et interlocuteur se changent directement ici.</p></div></div>
        <div className="action-filters">{FILTERS.map(([id, label]) => <button type="button" key={id} className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)}>{label}<strong>{counts[id]}</strong></button>)}</div>
        <div className="stack">
          {visible.length === 0 && <article className="card"><p>Aucune action dans cette rubrique.</p></article>}
          {visible.map((action) => <ActionCard key={action.id} action={action} dossierLabel={active.label} assignment={assignments[action.id] || {}} onUpdate={updateAssignment} />)}
        </div>
      </section>

      <details className="section">
        <summary><span className="section-index">P</span><div className="section-title"><h3>Pièces utiles & historique — {active.label}</h3><p>Tout reste conservé ici, du plus récent au plus ancien.</p></div><small className="badge">{active.history.length} dates</small></summary>
        <div className="section-body">
          <article className="card facts"><span className="pill">REPÈRES</span>{active.facts.map(([tag, text]) => <p className="fact" key={`${tag}-${text}`}><strong>{tag} :</strong> {text}</p>)}</article>
          <div className="history">{active.history.map(([date, title, text]) => <article className="card" key={`${date}-${title}`}><span className="pill">{date}</span><h4>{title}</h4><p>{text}</p></article>)}</div>
          <article className="card" style={{ marginTop: "10px" }}><span className="pill">PIÈCES</span><h4>Documents à garder sous la main</h4><ul>{active.documents.map((document) => <li key={document}>{document}</li>)}</ul></article>
        </div>
      </details>

      <footer className="footer-nav"><div><strong>Retour</strong><p className="muted">Revenir à la situation générale.</p></div><div className="footer-links"><a href="/">FINCA MARIA</a><a href="/?view=cortijo-famille">Synthèse</a><a href="/?view=cortijo-maison">Maison</a></div></footer>
    </main>
  );
}
