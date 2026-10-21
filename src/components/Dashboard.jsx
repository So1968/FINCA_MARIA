import { BrandMark, FincaNavigation } from "./FincaNavigation.jsx";
import { FincaDocumentChecklist } from "./FincaDocumentChecklist.jsx";
import { KEYS } from "../lib/storage.js";
import { useStoredState } from "../lib/useStoredState.js";
import { actions } from "../data/actions.js";
import { managementTimeline, analysisFindings, strategy } from "../data/overview.js";
import { dossiers } from "../data/dossiers.js";
import { ActionCard } from "./ActionCard.jsx";

const immediateActionIds = {
  "san-juan": ["san-juan-historique"],
  asaja: ["asaja-pac-2026-copie"],
  pelaez: ["pelaez-role-fiscal"],
  agriculteur: ["vitines-378-detail"]
};

export function Dashboard() {
  const [activeTab, setActiveTab] = useStoredState(KEYS.navigation);
  const [assignments, setAssignments] = useStoredState(KEYS.actions);

  function updateAssignment(actionId, patch) {
    setAssignments((current) => ({ ...current, [actionId]: { ...(current[actionId] || {}), ...patch } }));
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <BrandMark />
          <h1>Situation de l'exploitation</h1>
          <p>Comprendre comment la finca a été gérée, ce que montrent les pièces et ce qu'il faut vérifier maintenant.</p>
        </div>

      </header>

      <FincaNavigation activeTab={activeTab} onChange={setActiveTab} />
      <div className="dashboard-sections">
        <section className="section" id="panel-gestion" role="tabpanel" aria-labelledby="tab-gestion" tabIndex="0" hidden={activeTab !== "gestion"}>
          <header className="panel-heading"><span className="section-index">01</span><div className="section-title"><h3>Comment l'exploitation a été gérée</h3><p>Du premier bail écrit à l'exploitation directe.</p></div><small className="badge">6 étapes</small></header>
          <div className="section-body"><ol className="timeline">{managementTimeline.map(([period, title, text]) => <li key={`${period}-${title}`}><strong>{period}</strong><span><b>{title}</b><br />{text}</span></li>)}</ol></div>
        </section>

        <section className="section" id="panel-analyse" role="tabpanel" aria-labelledby="tab-analyse" tabIndex="0" hidden={activeTab !== "analyse"}>
          <header className="panel-heading"><span className="section-index">02</span><div className="section-title"><h3>Analyse de l'exploitation</h3><p>La lecture d'ensemble des documents réunis à ce jour.</p></div><small className="badge">6 constats</small></header>
          <div className="section-body grid">{analysisFindings.map(([status, title, text]) => <article className="card" key={title}><span className="pill">{status}</span><h4>{title}</h4><p>{text}</p></article>)}</div>
        </section>

        <section className="section" id="panel-strategie" role="tabpanel" aria-labelledby="tab-strategie" tabIndex="0" hidden={activeTab !== "strategie"}>
          <header className="panel-heading"><span className="section-index">03</span><div className="section-title"><h3>Stratégie</h3><p>L'ordre de travail qui découle de cette analyse.</p></div><small className="badge">6 étapes</small></header>
          <div className="section-body"><ol className="timeline">{strategy.map((item, index) => <li key={item}><strong>{index + 1}</strong><span>{item}</span></li>)}</ol></div>
        </section>

        <section className="section" id="panel-actions" role="tabpanel" aria-labelledby="tab-actions" tabIndex="0" hidden={activeTab !== "actions"}>
          <header className="panel-heading"><span className="section-index">04</span><div className="section-title"><h3>Dossiers & actions</h3><p>Chaque interlocuteur : l'action immédiate, sans parcourir l'historique.</p></div><small className="badge">4 dossiers</small></header>
          <div className="section-body stack">
            <FincaDocumentChecklist />
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
        </section>

        <section className="section" id="panel-travaux" role="tabpanel" aria-labelledby="tab-travaux" tabIndex="0" hidden={activeTab !== "travaux"}>
          <header className="panel-heading"><span className="section-index">05</span><div className="section-title"><h3>Travaux à faire</h3><p>Maison, jardin, patio et oliviers : suivre ce qui reste à faire.</p></div><small className="badge">26 travaux</small></header>
          <div className="section-body"><article className="card"><span className="pill">TRAVAUX</span><h4>Liste opérationnelle de la finca</h4><p>Chaque travail possède une zone, une priorité, un statut et une zone de notes.</p><a className="btn" href="/?view=cortijo-travaux">Ouvrir les travaux à faire</a></article></div>
        </section>

        <section className="section" id="panel-maison" role="tabpanel" aria-labelledby="tab-maison" tabIndex="0" hidden={activeTab !== "maison"}>
          <header className="panel-heading"><span className="section-index">06</span><div className="section-title"><h3>Maison</h3><p>Pièces, fonctionnement, ménage, couchages et présences.</p></div><small className="badge">Maison</small></header>
          <div className="section-body"><article className="card"><span className="pill">MAISON</span><h4>Visiter et gérer la maison</h4><p>Module séparé de l'exploitation agricole.</p><a className="btn" href="/?view=cortijo-maison">Ouvrir la Maison</a></article></div>
        </section>
      </div>

      <footer className="footer-nav">
        <div><strong>Synthèse</strong><p className="muted">Version courte de la frise, des chiffres, de l'analyse et de la stratégie.</p></div>
        <div className="footer-links"><a href="/?view=cortijo-travaux">Travaux à faire</a><a href="/?view=cortijo-famille">Ouvrir la synthèse</a><a href="/?view=cortijo-memoire&contact=san-juan">Dossiers & actions</a></div>
      </footer>
    </main>
  );
}
