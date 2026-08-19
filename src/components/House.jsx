import { useEffect, useState } from "react";

const PRESENCES_KEY = "finca_maria_maison_presences_v1";
const NOTES_KEY = "finca_maria_maison_notes_v1";

const visitSequence = [
  ["acces", "Accès et arrivée", "Montrer l'arrivée, le portail / l'entrée, le chemin jusqu'à la maison et le point où l'on entre réellement."],
  ["vie", "Pièces de vie", "Photographier les pièces dans l'ordre où on les découvre pour comprendre immédiatement comment elles communiquent."],
  ["cuisine", "Cuisine", "Montrer l'organisation, les rangements utiles, les appareils et ce qu'il faut savoir pour vivre dans la maison."],
  ["couchages", "Chambres et couchages", "Une fiche par chambre ou espace de couchage : emplacement, nombre de couchages, rangement et particularités."],
  ["sanitaires", "Salle(s) d'eau et sanitaires", "Montrer où ils se trouvent, ce qui est disponible et les éventuelles consignes utiles."],
  ["exterieurs", "Extérieurs et annexes", "Patio, jardin, dépendances, stockage et accès extérieurs seront ajoutés dans la continuité de la visite."]
];

const infrastructure = [
  ["Clés et accès", "Où sont les clés, quelles portes elles ouvrent, qui possède un double."],
  ["Eau", "Arrivée d'eau, coupure générale, points utiles et consignes à connaître."],
  ["Électricité", "Tableau, compteur, coupure générale et équipements importants."],
  ["Eau chaude", "Emplacement et fonctionnement du système d'eau chaude."],
  ["Déchets", "Où stocker et où déposer les déchets pendant et après un séjour."],
  ["Sécurité", "Fermetures, points sensibles et gestes à faire avant de quitter la maison."]
];

function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }

export function House() {
  const [presences, setPresences] = useState(() => load(PRESENCES_KEY, []));
  const [notes, setNotes] = useState(() => load(NOTES_KEY, {}));
  const [form, setForm] = useState({ name: "", arrival: "", departure: "", place: "", note: "" });

  useEffect(() => { localStorage.setItem(PRESENCES_KEY, JSON.stringify(presences)); }, [presences]);
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);

  function setNote(key, value) { setNotes((current) => ({ ...current, [key]: value })); }
  function addPresence(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setPresences((current) => [...current, { ...form, id: `presence-${Date.now()}`, name: form.name.trim() }]);
    setForm({ name: "", arrival: "", departure: "", place: "", note: "" });
  }

  return (
    <main className="page">
      <header className="hero"><div><span className="eyebrow">FINCA MARIA — MAISON</span><h1>Vivre et se repérer dans la maison</h1><p>Une partie séparée de l'exploitation agricole : visite des pièces, fonctionnement, ménage, couchages et présences.</p></div><div className="top-actions"><a href="/">FINCA MARIA</a></div></header>

      <details className="section"><summary><span className="section-index">01</span><div className="section-title"><h3>Visiter la maison</h3><p>Le futur parcours photo, dans l'ordre réel de déplacement.</p></div><small className="badge">6 étapes</small></summary><div className="section-body grid">{visitSequence.map(([id, title, text], index) => <article className="card" key={id}><span className="pill">Étape {index + 1}</span><h4>{title}</h4><p>{text}</p><textarea rows="4" value={notes[`visit-${id}`] || ""} onChange={(e) => setNote(`visit-${id}`, e.target.value)} placeholder="Repères, couchages, rangement, particularités…" /></article>)}</div></details>

      <details className="section"><summary><span className="section-index">02</span><div className="section-title"><h3>Infrastructure et fonctionnement</h3><p>Les informations pratiques pour utiliser la maison sans chercher partout.</p></div><small className="badge">6 repères</small></summary><div className="section-body grid">{infrastructure.map(([title, text]) => <article className="card" key={title}><h4>{title}</h4><p>{text}</p><textarea rows="4" value={notes[`infra-${title}`] || ""} onChange={(e) => setNote(`infra-${title}`, e.target.value)} placeholder="À renseigner…" /></article>)}</div></details>

      <details className="section"><summary><span className="section-index">03</span><div className="section-title"><h3>Gestion intérieure et ménage</h3><p>Une trame commune pour laisser la maison prête pour les suivants.</p></div><small className="badge">Checklist</small></summary><div className="section-body grid">{[["Avant l'arrivée", ["Aérer et remettre les pièces en service", "Préparer les couchages nécessaires", "Vérifier cuisine, salle d'eau et consommables"]], ["Pendant le séjour", ["Garder cuisine et sanitaires en état", "Gérer linge et couchages utilisés", "Sortir les déchets"]], ["Avant le départ", ["Ranger et nettoyer", "Traiter le linge utilisé", "Fermer la maison et remettre les clés à leur place", "Signaler les incidents ou réparations"]]].map(([title, items]) => <article className="card" key={title}><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul><textarea rows="4" value={notes[`menage-${title}`] || ""} onChange={(e) => setNote(`menage-${title}`, e.target.value)} placeholder="Consignes propres à la maison…" /></article>)}</div></details>

      <details className="section"><summary><span className="section-index">04</span><div className="section-title"><h3>Présences et couchages</h3><p>Qui vient, quand, et où chacun souhaite s'installer.</p></div><small className="badge">{presences.length} présence{presences.length > 1 ? "s" : ""}</small></summary><div className="section-body"><form className="form-grid" onSubmit={addPresence}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom" /><input type="date" value={form.arrival} onChange={(e) => setForm({ ...form, arrival: e.target.value })} /><input type="date" value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} /><input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Chambre / couchage" /><button type="submit">+ Ajouter</button></form><div className="stack">{presences.length === 0 && <article className="card"><p>Aucune présence enregistrée pour le moment.</p></article>}{presences.map((item) => <article className="card" key={item.id}><span className="pill">{item.name}</span><h4>{item.place || "Couchage à choisir"}</h4><p>{item.arrival || "?"} → {item.departure || "?"}</p>{item.note && <p>{item.note}</p>}<button className="btn" type="button" onClick={() => setPresences((current) => current.filter((p) => p.id !== item.id))}>Retirer</button></article>)}</div></div></details>

      <details className="section"><summary><span className="section-index">05</span><div className="section-title"><h3>Inventaire et besoins de la maison</h3><p>Ce qui existe, ce qui manque et ce qui devra être remplacé ou réparé.</p></div><small className="badge">Inventaire</small></summary><div className="section-body"><textarea rows="10" value={notes.inventory || ""} onChange={(e) => setNote("inventory", e.target.value)} placeholder="Mobilier, linge, vaisselle, appareils, produits ménagers, réparations, achats à prévoir…" /></div></details>

      <footer className="footer-nav"><div><strong>Maison</strong><p className="muted">Les photos seront ajoutées ici sans mélanger la maison avec l'exploitation agricole.</p></div><div className="footer-links"><a href="/">FINCA MARIA</a><a href="/?view=cortijo-memoire&contact=san-juan">Dossiers & actions</a></div></footer>
    </main>
  );
}
