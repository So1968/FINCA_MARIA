import { useEffect, useState } from "react";
import { actions } from "../data/actions.js";
import { managementTimeline, analysisFindings, strategy } from "../data/overview.js";
import { dossiers } from "../data/dossiers.js";
import { ActionCard } from "./ActionCard.jsx";

const STORAGE_KEY = "finca_maria_action_assignments_v1";
const immediateActionIds = {
  "san-juan": ["san-juan-historique"],
  asaja: ["asaja-pac-2026-copie"],
  pelaez: ["pelaez-role-fiscal"],
  agriculteur: ["vitines-378-detail"]
};

function loadAssignments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function Dashboard() {
  const [assignments, setAssignments] = useState(loadAssignments);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments)); }, [assignments]);

  function updateAssignment(actionId, patch) {
    setAssignments((current) => ({ ...current, [actionId]: { ...(current[actionId] || {}), ...patch } }));
  }

  function setAll(open) {
    document.querySelectorAll(".dashboard-sections > details.section").forEach((item) => { item.open = open; });
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <span className="eyebrow">FINCA MARIA</span>
          <h1>Situation de l'exploitation</h1>
          <p>Comprendre comment la finca a été gérée, ce que montrent les pièces et ce qu'il faut vérifier maintenant.</p>
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => setAll(true)}>Tout ouvrir</button>
          <button type="button" onClick={() => setAll(false)}>Tout replier</button>
        </div>
      </header>

      <div className="dashboard-sections">
        <details className="section">
          <summary><span className="section-index">01</span><div className="section-title"><h3>Comment l'exploitation a été gérée</h3><p>Du premier bail écrit à l'exploitation directe.</p></div><small className="badge">6 étapes</small></summary>
          <div className="section-body"><ol className="timeline">{managementTimeline.map(([period, title, text]) => <li key={`${period}-${title}`}><strong>{period}</strong><span><b>{title}</b><br />{text}</span></li>)}</ol></div>
        </details>

        <details className="section">
          <summary><span className="section-index">02</span><div className="section-title"><h3>Analyse de l'exploitation</h3><p>La lecture d'ensemble des documents réunis à ce jour.</p></div><small className="badge">6 constats</small></summary>
          <div className="section-body grid">{analysisFindings.map(([status, title, text]) => <article className="card" key={title}><span className="pill">{status}</span><h4>{title}</h4><p>{text}</p></article>)}</div>
        </details>

        <details className="section">
          <summary><span className="section-index">03</span><div className="section-title"><h3>Stratégie</h3><p>L'ordre de travail qui découle de cette analyse.</p></div><small className="badge">6 étapes</small></summary>
          <div className="section-body"><ol className="timeline">{strategy.map((item, index) => <li key={item}><strong>{index + 1}</strong><span>{item}</span></li>)}</ol></div>
        </details>

        <details className="section">
          <summary><span className="section-index">04</span><div className="section-title"><h3>Dossiers & actions</h3><p>Chaque interlocuteur : l'action immédiate, sans parcourir l'historique.</p></div><small className="badge">4 dossiers</small></summary>
          <div className="section-body stack">
            {dossiers.map((dossier) => {
              const dossierActions = (immediateActionIds[dossier.id] || []).map((id) => actions.find((action) => action.id === id)).filter(Boolean);
              return (
                <details className="card" key={dossier.id}>
                  <summary>
                    <div className="action-head"><div className="action-title"><span className="pill">{dossier.label}</span><h4>{dossier.subtitle}</h4></div><span className="badge">{dossierActions.length} action</span></div>
                  </summary>
                  <div className="stack" style={{ marginTop: ".7rem" }}>
                    {dossierActions.map((action) => <ActionCard key={action.id} action={action} dossierLabel={dossier.label} assignment={assignments[action.id] || {}} onUpdate={updateAssignment} />)}
                    <a className="btn" href={`/?view=cortijo-memoire&contact=${dossier.id}`}>Ouvrir le dossier — {dossier.label}</a>
                  </div>
                </details>
              );
            })}
          </div>
        </details>

        <details className="section">
          <summary><span className="section-index">05</span><div className="section-title"><h3>Maison</h3><p>Pièces, fonctionnement, ménage, couchages et présences.</p></div><small className="badge">Maison</small></summary>
          <div className="section-body"><article className="card"><span className="pill">MAISON</span><h4>Visiter et gérer la maison</h4><p>Module séparé de l'exploitation agricole.</p><a className="btn" href="/?view=cortijo-maison">Ouvrir la Maison</a></article></div>
        </details>
      </div>

      <footer className="footer-nav">
        <div><strong>Synthèse</strong><p className="muted">Version courte de la frise, des chiffres, de l'analyse et de la stratégie.</p></div>
        <div className="footer-links"><a href="/?view=cortijo-famille">Ouvrir la synthèse</a><a href="/?view=cortijo-memoire&contact=san-juan">Dossiers & actions</a></div>
      </footer>
    </main>
  );
}
