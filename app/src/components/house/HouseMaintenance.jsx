import { useState } from "react";
import { HOUSE_KEYS, changeHouseRecord, dateLabel, historyChange, houseRecords, localDay, newHouseId, searchable } from "../../lib/houseData.mjs";
import { useHouseStorage } from "../../lib/useHouseStorage";
import { STAY_GROUPS } from "../../data/houseContent.mjs";
import { HOUSE_DEPARTURE_TASKS, normalizeDepartureChecks } from "../../lib/houseDepartureChecklist.mjs";
import { HouseStatusPanel } from "../FincaHouseStatusMount";
import { EmptyHouse, HouseHistory, HouseSaveState, useHouseDraft } from "./HouseUI";

const EMPTY = { title: "", zone: "", priority: "À faire", responsible: "", dueAt: "", status: "À faire", note: "" };
function StayChecklist() {
  const store = useHouseStorage(HOUSE_KEYS.checklist, {});
  const departure = useHouseStorage(HOUSE_KEYS.departure, {});
  const checked = store.value.checked || {};
  const departureChecks = normalizeDepartureChecks(departure.value);
  function toggle(id, value) {
    store.update((current) => ({ ...current, startedAt: current.startedAt || new Date().toISOString(), checked: { ...current.checked, [id]: value } }));
  }
  return <details className="houseCard" id="menage" aria-label="Checklist du séjour"><summary>Checklists d’arrivée, de séjour et de départ</summary><HouseSaveState store={store} />
    <label>Nom / période du séjour<input aria-label="Nom / période du séjour" disabled={store.readError} value={store.value.stayLabel || ""} onChange={(e) => { const value = e.target.value; store.update((current) => ({ ...current, stayLabel: value })); }} /></label>
    <div className="houseCards">{STAY_GROUPS.map((group, groupIndex) => <div key={group.title}><h4>{group.title}</h4>{group.items.map((text, itemIndex) => {
      const id = `${groupIndex}-${itemIndex}`;
      return <label className="houseCheck" key={id}><input disabled={store.readError} type="checkbox" checked={Boolean(checked[id])} onChange={(e) => toggle(id, e.target.checked)} />{text}</label>;
    })}</div>)}</div>
    <details id="depart-maison"><summary>Contrôles de départ complémentaires — suivi existant</summary><HouseSaveState store={departure} />{HOUSE_DEPARTURE_TASKS.map((task) => <label className="houseCheck" key={task.id}><input disabled={departure.readError} type="checkbox" checked={Boolean(departureChecks[task.id])} onChange={(e) => {
      const value = e.target.checked;
      departure.update((current) => current.done && typeof current.done === "object" ? { ...current, done: { ...current.done, [task.id]: value } } : { ...current, [task.id]: value });
    }} />{task.label}</label>)}</details>
    <p>Ces coches enregistrent un suivi familial ; elles ne remplacent pas un contrôle sur place. Les anciennes coches restent conservées.</p>
  </details>;
}

export function HouseMaintenance() {
  const markDraft = useHouseDraft();
  const [showForm, setShowForm] = useState(false);
  const store = useHouseStorage(HOUSE_KEYS.maintenance, []);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState("");
  const [filter, setFilter] = useState("Ouverts");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const records = houseRecords(store.value);
  const visible = records.filter((item) => filter === "Tous" || (filter === "Archivés" ? item.archivedAt : !item.archivedAt && (filter === "Faits" ? item.status === "Fait" : item.status !== "Fait")))
    .filter((item) => !query || searchable(`${item.title} ${item.zone} ${item.responsible || item.assignedTo} ${item.note}`).includes(searchable(query)))
    .sort((a, b) => String(a.dueAt || "9999").localeCompare(String(b.dueAt || "9999")));
  function patch(item, fields, action) { return store.update((current) => changeHouseRecord(current, item._key, historyChange(item, fields, action))); }
  function submit(event) {
    event.preventDefault();
    if (editing && !records.some((item) => item._key === editing)) { setMessage("Ce travail n’est plus dans la liste. La saisie reste dans le formulaire ; vérifiez l’historique."); return; }
    if (!form.title.trim()) return;
    const { _key, history, ...fields } = form;
    const id = form.id || newHouseId("entretien");
    if (!editing) setForm((current) => ({ ...current, id }));
    const saved = editing ? patch(records.find((item) => item._key === editing), fields, "Travail modifié")
      : store.update((current) => current.some((item) => item?.id === id) ? changeHouseRecord(current, id, fields) : [{ ...fields, id, date: localDay(), createdAt: new Date().toISOString() }, ...current]);
    if (saved) { setShowForm(false); markDraft(false); setEditing(""); setForm(EMPTY); setMessage("Travail enregistré."); }
  }
  return <>
    <StayChecklist />
    <HouseSaveState store={store} />
    <details className="houseCard" open={showForm} onToggle={(e) => setShowForm(e.currentTarget.open)}><summary>Ajouter un travail ou une réparation</summary><form onChangeCapture={() => markDraft(true)} className="houseForm houseCard" onSubmit={submit} aria-label="Travail ou réparation"><h3>{editing ? "Modifier le travail" : "Ajouter un travail ou une réparation"}</h3><fieldset disabled={store.readError}>
      <label>Travail / réparation<input aria-label="Travail / réparation" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label>Zone<input aria-label="Zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></label>
      <label>Responsable<input aria-label="Responsable" value={form.responsible || ""} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></label>
      <label>Échéance<input aria-label="Échéance" type="date" value={form.dueAt || ""} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label>
      <label>Priorité<select aria-label="Priorité" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{[...new Set(["À faire", "P0", "P1", "P2", "P3", "P4", form.priority])].map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Avancement<select aria-label="Avancement" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{[...new Set(["À faire", "En cours", "En attente", "Fait", form.status])].map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="houseWide">Détails du travail<textarea aria-label="Détails du travail" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <div className="houseButtons houseWide"><button type="submit">Enregistrer le travail</button>{editing && <button type="button" onClick={() => { markDraft(false); setEditing(""); setForm(EMPTY); }}>Abandonner la modification</button>}</div>
    </fieldset></form></details><p role="status">{message}</p>
    <div className="houseFilters"><label>Rechercher un travail<input aria-label="Rechercher un travail" type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label>Filtrer les travaux<select aria-label="Filtrer les travaux" value={filter} onChange={(e) => setFilter(e.target.value)}>{["Ouverts", "Faits", "Archivés", "Tous"].map((name) => <option key={name}>{name}</option>)}</select></label></div>
    <div className="houseCards">{visible.map((item) => <article key={item._key} className="houseCard"><h3>{item.title || "Ancien travail à compléter"}</h3><p>{item.zone} · {item.priority} · {item.status}</p><p>Responsable : {item.responsible || item.assignedTo || "À attribuer"} · Échéance : {dateLabel(item.dueAt)}</p>
      {item.dueAt && item.dueAt < localDay() && item.status !== "Fait" && <p>Échéance dépassée</p>}<p>{item.note}</p>
      <div className="houseButtons"><button type="button" disabled={store.readError} onClick={() => { setShowForm(true); markDraft(false); setEditing(item._key); setForm({ ...EMPTY, ...item, responsible: item.responsible || item.assignedTo || "" }); }}>Modifier</button>
        <button type="button" disabled={store.readError} onClick={() => patch(item, { status: item.status === "Fait" ? "À faire" : "Fait" }, "Avancement modifié")}>{item.status === "Fait" ? "Rouvrir le travail" : "Marquer fait"}</button>
        <button type="button" disabled={store.readError} onClick={() => { if (item.archivedAt || window.confirm("Archiver ce travail en conservant son historique ?")) patch(item, { archivedAt: item.archivedAt ? null : new Date().toISOString() }, item.archivedAt ? "Restauré" : "Archivé"); }}>{item.archivedAt ? "Restaurer le travail" : "Archiver le travail"}</button>
      </div><HouseHistory item={item} /></article>)}</div>
    {!visible.length && <EmptyHouse>Aucun travail ne correspond aux filtres.</EmptyHouse>}
    <details className="houseCard"><summary>État documentaire de la maison et travaux déjà repérés</summary><HouseStatusPanel /></details>
  </>;
}
