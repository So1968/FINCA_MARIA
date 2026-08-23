import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "finca_maria_travaux_v1";

const initialWorks = [
  { id: "g-taille-cerisier", zone: "Jardin", title: "Terminer la taille du cerisier", detail: "Diminuer l’ombre sur le citronnier sans abîmer l’arbre.", priority: "Haute" },
  { id: "g-laurier-reduction", zone: "Jardin", title: "Terminer la réduction du laurier", detail: "Le ramener progressivement à une forme plus basse et arrondie.", priority: "Haute" },
  { id: "g-laurier-marcotte", zone: "Jardin", title: "Choisir les branches du laurier à marcotter", detail: "Repérer les grosses branches intéressantes avant suppression.", priority: "Normale" },
  { id: "g-citronnier", zone: "Jardin", title: "Contrôler le citronnier après dégagement", detail: "Vérifier lumière, branches abîmées et état général.", priority: "Haute" },
  { id: "g-amandier", zone: "Jardin", title: "Examiner l’amandier à l’arrière", detail: "Repérer les besoins de taille, soin ou surveillance.", priority: "Normale" },
  { id: "g-guepes", zone: "Jardin / piscine", title: "Régler le problème du nid de guêpes", detail: "Zone du yucca à proximité de la piscine.", priority: "Urgente" },
  { id: "g-tour-arbres", zone: "Jardin", title: "Faire le tour des autres arbres", detail: "Repérer ceux qui nécessitent taille ou dégagement.", priority: "Normale" },

  { id: "m-fissures-inventaire", zone: "Maison", title: "Reprendre l’inventaire précis des fissures", detail: "Localiser, photographier et suivre les fissures de la maison.", priority: "Haute" },
  { id: "m-fissures-tri", zone: "Maison", title: "Trier les fissures à surveiller", detail: "Distinguer les fissures superficielles de celles qui nécessitent un suivi.", priority: "Haute" },
  { id: "m-fond-joint", zone: "Maison", title: "Poser les fonds de joint en mousse PE nécessaires", detail: "Préparer les zones concernées avant rebouchage.", priority: "Normale" },
  { id: "m-reparations-structure", zone: "Maison", title: "Déterminer les réparations structurelles à prévoir", detail: "Selon les zones : agrafage, tirants, chaînage ou autre solution adaptée.", priority: "Haute" },
  { id: "m-photos-fissures", zone: "Maison", title: "Photographier les fissures importantes avec repère", detail: "Permettre de comparer leur évolution dans le temps.", priority: "Haute" },

  { id: "e-infiltration", zone: "Porte / étanchéité", title: "Traiter l’infiltration au niveau de la porte", detail: "Identifier le point d’entrée de l’eau et reprendre l’étanchéité.", priority: "Urgente" },
  { id: "e-joints", zone: "Porte / étanchéité", title: "Refaire les joints nécessaires", detail: "Après identification précise de l’entrée d’eau.", priority: "Haute" },
  { id: "e-test", zone: "Porte / étanchéité", title: "Tester l’étanchéité après réparation", detail: "Contrôler par arrosage ou lors de la prochaine pluie.", priority: "Normale" },

  { id: "p-amenagement", zone: "Patio", title: "Finir l’aménagement du patio", detail: "Autour du laurier, du cerisier et du citronnier.", priority: "Normale" },
  { id: "p-pierres", zone: "Patio", title: "Réorganiser les grosses et petites pierres", detail: "Rendre l’espace plus clair et praticable.", priority: "Normale" },
  { id: "p-assise", zone: "Patio", title: "Prévoir une zone d’assise", detail: "Créer une petite zone confortable dans le patio.", priority: "Basse" },
  { id: "p-securite", zone: "Patio", title: "Vérifier passages et zones glissantes", detail: "Repérer les endroits dangereux ou gênants pour l’entretien.", priority: "Haute" },

  { id: "o-comptage", zone: "Oliviers", title: "Finaliser le comptage des oliviers", detail: "Comptage précis dans les deux polygones jaunes.", priority: "Haute" },
  { id: "o-productifs", zone: "Oliviers", title: "Repérer les oliviers actuellement productifs", detail: "Préparer leur identification sur le terrain.", priority: "Haute" },
  { id: "o-rubans", zone: "Oliviers", title: "Poser les rubans de marquage", detail: "Marquer les arbres productifs avec le système retenu.", priority: "Normale" },
  { id: "o-soins", zone: "Oliviers", title: "Repérer les arbres à tailler, soigner ou surveiller", detail: "Constituer progressivement l’état des travaux parcelle par parcelle.", priority: "Normale" },

  { id: "i-tour-exterieur", zone: "Maison / extérieur", title: "Faire un tour complet extérieur de la maison", detail: "Murs, toiture accessible, portes, fenêtres et évacuations.", priority: "Normale" },
  { id: "i-tour-interieur", zone: "Maison / intérieur", title: "Faire un tour complet intérieur", detail: "Photographier chaque réparation nécessaire.", priority: "Normale" },
  { id: "i-classer", zone: "Pilotage", title: "Classer les travaux par niveau de priorité", detail: "Urgent / à faire cette année / amélioration future.", priority: "Normale" }
];

const priorities = ["Urgente", "Haute", "Normale", "Basse"];
const statuses = ["À faire", "En cours", "Terminé"];

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

export function Works() {
  const [state, setState] = useState(loadState);
  const [filter, setFilter] = useState("Tous");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  function patch(id, value) {
    setState((current) => ({ ...current, [id]: { ...(current[id] || {}), ...value } }));
  }

  const works = useMemo(() => initialWorks.map((work) => ({ ...work, ...(state[work.id] || {}), status: state[work.id]?.status || "À faire" })), [state]);
  const visible = filter === "Tous" ? works : works.filter((work) => work.status === filter);
  const done = works.filter((work) => work.status === "Terminé").length;

  return (
    <main className="page">
      <header className="hero">
        <div><span className="eyebrow">FINCA MARIA — TRAVAUX</span><h1>Travaux à faire</h1><p>La liste opérationnelle de la finca : maison, jardin, patio et oliviers.</p></div>
        <div className="top-actions"><a href="/">FINCA MARIA</a><a href="/?view=cortijo-maison">Maison</a></div>
      </header>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <div className="action-head"><div><span className="pill">{done}/{works.length} terminés</span><h4>Suivi des travaux</h4></div><div className="top-actions">{["Tous", ...statuses].map((item) => <button type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      </section>

      <div className="stack">
        {visible.map((work) => (
          <article className="card" key={work.id}>
            <div className="action-head">
              <div className="action-title"><span className="pill">{work.zone}</span><h4>{work.title}</h4></div>
              <span className="badge">{work.priority}</span>
            </div>
            <p>{work.detail}</p>
            <div className="form-grid">
              <select value={work.status} onChange={(e) => patch(work.id, { status: e.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={work.priority} onChange={(e) => patch(work.id, { priority: e.target.value })}>{priorities.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <textarea rows="3" value={work.note || ""} onChange={(e) => patch(work.id, { note: e.target.value })} placeholder="Note, matériel nécessaire, personne chargée, date prévue…" />
          </article>
        ))}
      </div>

      <footer className="footer-nav"><div><strong>Travaux</strong><p className="muted">Les statuts, priorités et notes restent enregistrés sur cet appareil.</p></div><div className="footer-links"><a href="/">FINCA MARIA</a><a href="/?view=cortijo-maison">Maison</a></div></footer>
    </main>
  );
}
