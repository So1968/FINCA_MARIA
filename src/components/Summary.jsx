import { managementTimeline, analysisFindings, strategy, production } from "../data/overview.js";

const openPoints = [
  "Quels sont les totaux officiels complets enregistrés par San Juan pour chaque campagne, notamment 2018/19 puis 2019/20 à 2025/26 ?",
  "Quelle est la date exacte à laquelle la famille a indiqué à José qu'aucun nouveau bail ne serait conclu ?",
  "Quelle est la surface réellement déclarée en oliviers dans les pièces PAC / SIGPAC ?",
  "Comment se répartissent exactement les 5 445 € de la facture Vitines n°378 et quels travaux ont été réalisés sur quelles parcelles ?",
  "Quelles archives fiscales et agricoles Peláez conserve-t-il encore ?"
];

export function Summary() {
  return (
    <main className="page">
      <header className="hero"><div><span className="eyebrow">FINCA MARIA</span><h1>Synthèse de l'exploitation</h1><p>Historique de gestion, production, analyse et stratégie à partir des pièces réunies à ce jour.</p><div className="top-actions"><span className="pill">[P] Prouvé</span><span className="pill">[D] Déclaré</span><span className="pill">[C] Calculé</span><span className="pill">[H] Hypothèse</span></div></div><div className="top-actions"><a href="/">FINCA MARIA</a></div></header>

      <details className="section"><summary><span className="section-index">01</span><div className="section-title"><h3>Historique de gestion</h3><p>Les grandes phases qui permettent de comprendre comment la finca a été exploitée.</p></div><small className="badge">6 étapes</small></summary><div className="section-body"><ol className="timeline">{managementTimeline.map(([period, title, text]) => <li key={`${period}-${title}`}><strong>{period}</strong><span><b>{title}</b><br />{text}</span></li>)}</ol></div></details>

      <details className="section"><summary><span className="section-index">02</span><div className="section-title"><h3>Repères de production</h3><p>Les chiffres connus ou reconstitués, avec leur niveau de preuve.</p></div><small className="badge">8 campagnes</small></summary><div className="section-body grid">{production.map(([campaign, value, detail]) => <article className="card" key={campaign}><span className="pill">{campaign}</span><h4>{value}</h4><p>{detail}</p></article>)}</div></details>

      <details className="section"><summary><span className="section-index">03</span><div className="section-title"><h3>Analyse de l'exploitation</h3><p>Ce que l'ensemble des éléments permet de comprendre aujourd'hui.</p></div><small className="badge">6 constats</small></summary><div className="section-body grid">{analysisFindings.map(([status, title, text]) => <article className="card" key={title}><span className="pill">{status}</span><h4>{title}</h4><p>{text}</p></article>)}</div></details>

      <details className="section"><summary><span className="section-index">04</span><div className="section-title"><h3>Stratégie</h3><p>Les contrôles à mener avant de tirer une conclusion sur la gestion.</p></div><small className="badge">6 étapes</small></summary><div className="section-body"><ol className="timeline">{strategy.map((item, index) => <li key={item}><strong>{index + 1}</strong><span>{item}</span></li>)}</ol></div></details>

      <details className="section"><summary><span className="section-index">05</span><div className="section-title"><h3>Points encore ouverts</h3><p>Uniquement ce qui manque encore pour consolider l'analyse.</p></div><small className="badge">5 points</small></summary><div className="section-body stack">{openPoints.map((item) => <article className="card" key={item}><p>{item}</p></article>)}</div></details>

      <footer className="footer-nav"><div><strong>Retour</strong><p className="muted">Revenir à la situation générale, aux dossiers ou à la Maison.</p></div><div className="footer-links"><a href="/">FINCA MARIA</a><a href="/?view=cortijo-memoire&contact=san-juan">Dossiers & actions</a><a href="/?view=cortijo-maison">Maison</a></div></footer>
    </main>
  );
}
