import { useState } from "react";
import { defaultTouristPlaces, STATUS_ORDER } from "../../data/houseContent.mjs";
import { HOUSE_KEYS, changeHouseRecord, historyChange, houseRecords, houseUrl, newHouseId, safeWebUrl, searchable } from "../../lib/houseData.mjs";
import { copyHouseText, downloadHouseGuide, houseGuideText, publicHousePlaces } from "../../lib/houseGuide.mjs";
import { useHouseStorage } from "../../lib/useHouseStorage";
import { EmptyHouse, HouseHistory, HouseSaveState, useHouseDraft } from "./HouseUI";

const EMPTY = { name: "", zone: "", category: "", duration: "", note: "", status: "À tester", bestTime: "", parking: "", practical: "", mapUrl: "", familyNote: "", publicNote: "" };
function GuideTools({ places, includePreview = true, disabled = false }) {
  const [message, setMessage] = useState("");
  async function share(copyOnly) {
    const text = houseGuideText(places);
    try {
      if (!copyOnly && navigator.share) { await navigator.share({ title: "FINCA MARIA — Guide des sorties", text }); setMessage("Guide partagé."); }
      else { await copyHouseText(text); setMessage("Guide copié : vous pouvez le coller dans un message."); }
    } catch (error) { if (error.name !== "AbortError") setMessage("Partage indisponible. Téléchargez le guide pour le transmettre."); }
  }
  return <div className="houseCard"><p>Le guide contient les lieux conseillés, sans les notes privées ni les données de gestion de la maison.</p><div className="houseButtons">
    {includePreview && <a href={houseUrl("sorties", true)}>Aperçu du guide vacanciers</a>}
    <button type="button" disabled={disabled} onClick={() => share(true)}>Copier le guide</button><button type="button" disabled={disabled} onClick={() => share(false)}>Partager le guide</button><button type="button" disabled={disabled} onClick={() => downloadHouseGuide(places)}>Télécharger le guide partageable</button>
  </div><p role="status">{message}</p></div>;
}
export function HouseVisitorGuide() {
  const store = useHouseStorage(HOUSE_KEYS.places, defaultTouristPlaces);
  const places = publicHousePlaces(store.value);
  return <main className="houseWorkspace houseVisitor"><nav aria-label="Retour au carnet"><a href={houseUrl("sorties")}>← Maison · Sorties</a></nav><h1>Guide vacanciers — les sorties</h1><HouseSaveState store={store} />
    <GuideTools places={store.value} disabled={store.readError} includePreview={false} /><button type="button" disabled={store.readError} onClick={() => window.print()}>Imprimer le guide</button>
    <div className="houseCards">{places.map((item, index) => <article key={`${item.name}-${index}`} className="houseCard"><h2>{item.name}</h2><p>{item.zone} · {item.category} · {item.duration}</p><p>{item.note}</p><p>{item.publicNote}</p>{item.bestTime && <p>Quand : {item.bestTime}</p>}{item.parking && <p>Accès : {item.parking}</p>}<p>{item.practical}</p>{item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noreferrer">Voir la carte</a>}</article>)}</div>
    {!places.length && <EmptyHouse>Aucun lieu n’est encore sélectionné pour le guide.</EmptyHouse>}
  </main>;
}
export function HouseOutings() {
  const markDraft = useHouseDraft();
  const [showForm, setShowForm] = useState(false);
  const store = useHouseStorage(HOUSE_KEYS.places, defaultTouristPlaces);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Tous"); const [category, setCategory] = useState("Tous");
  const [archives, setArchives] = useState(false); const [editing, setEditing] = useState(""); const [form, setForm] = useState(EMPTY);
  const records = houseRecords(store.value);
  const [message, setMessage] = useState("");
  const categories = [...new Set(records.map((item) => item.category).filter(Boolean))].sort();
  const visible = records.filter((item) => Boolean(item.archivedAt) === archives)
    .filter((item) => status === "Tous" || item.status === status).filter((item) => category === "Tous" || item.category === category)
    .filter((item) => !query || searchable(`${item.name} ${item.zone} ${item.category} ${item.note} ${item.familyNote}`).includes(searchable(query)));
  function patch(item, changes, action) { return store.update((current) => changeHouseRecord(current, item._key, historyChange(item, changes, action))); }
  function submit(event) {
    event.preventDefault();
    if (editing && !records.some((item) => item._key === editing)) { setMessage("Ce lieu a changé sur un autre écran. La saisie reste dans le formulaire ; vérifiez le carnet."); return; }
    if (!form.name.trim()) return;
    const { _key, history, ...fields } = form;
    const id = form.id || newHouseId("lieu");
    if (!editing) setForm((current) => ({ ...current, id }));
    const saved = editing ? patch(records.find((item) => item._key === editing), fields, "Lieu modifié") : store.update((current) => current.some((item) => item?.id === id) ? changeHouseRecord(current, id, fields) : [{ ...fields, id }, ...current]);
    if (saved) { setShowForm(false); markDraft(false); setEditing(""); setForm(EMPTY); }
  }
  return <><HouseSaveState store={store} /><GuideTools places={store.value} disabled={store.readError} />
    <details className="houseCard" open={showForm} onToggle={(e) => setShowForm(e.currentTarget.open)}><summary>Ajouter un lieu ou modifier une fiche</summary><form onChangeCapture={() => markDraft(true)} className="houseCard houseForm" aria-label="Fiche sortie" onSubmit={submit}><h3>{editing ? "Modifier un lieu" : "Ajouter un lieu"}</h3><fieldset disabled={store.readError}>
      {[["name", "Lieu"], ["zone", "Zone / ville"], ["category", "Type de sortie"], ["duration", "Durée"], ["bestTime", "Meilleur moment"], ["parking", "Accès / parking"], ["practical", "Bon à savoir / réservation"], ["mapUrl", "Lien carte"]].map(([key, label]) => <label key={key}>{label}<input aria-label={label} required={key === "name"} type={key === "mapUrl" ? "url" : "text"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
      <label>Notre avis<select aria-label="Notre avis" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{[...new Set([...Object.keys(STATUS_ORDER), form.status])].map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="houseWide">Description pour le guide<textarea aria-label="Description pour le guide" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <label className="houseWide">Conseil pour les visiteurs<textarea aria-label="Conseil pour les visiteurs" value={form.publicNote} onChange={(e) => setForm({ ...form, publicNote: e.target.value })} /></label>
      <label className="houseWide">Note privée familiale<textarea aria-label="Note privée familiale" value={form.familyNote} onChange={(e) => setForm({ ...form, familyNote: e.target.value })} /></label>
      <div className="houseButtons houseWide"><button type="submit">Enregistrer le lieu</button>{editing && <button type="button" onClick={() => { markDraft(false); setEditing(""); setForm(EMPTY); }}>Abandonner la modification</button>}</div>
    </fieldset></form></details><p role="status">{message}</p>
    <div className="houseFilters"><label>Rechercher une sortie<input aria-label="Rechercher une sortie" type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label>Filtrer les avis<select aria-label="Filtrer les avis" value={status} onChange={(e) => setStatus(e.target.value)}><option>Tous</option>{Object.keys(STATUS_ORDER).map((name) => <option key={name}>{name}</option>)}</select></label><label>Filtrer les types<select aria-label="Filtrer les types" value={category} onChange={(e) => setCategory(e.target.value)}><option>Tous</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label></div>
    <label className="houseCheck"><input type="checkbox" checked={archives} onChange={(e) => setArchives(e.target.checked)} />Afficher les lieux archivés</label>
    <div className="houseCards">{visible.map((item) => <article className="houseCard" key={item._key}><h3>{item.name || "Ancien lieu à compléter"}</h3><p>{item.zone} · {item.category} · {item.duration}</p><p>{item.status}</p><p>{item.note}</p>{item.familyNote && <p>Note privée : {item.familyNote}</p>}
      <div className="houseButtons">{safeWebUrl(item.mapUrl) && <a href={safeWebUrl(item.mapUrl)} target="_blank" rel="noreferrer">Carte</a>}<button type="button" disabled={store.readError} onClick={() => { setShowForm(true); markDraft(false); setEditing(item._key); setForm({ ...EMPTY, ...item }); }}>Modifier</button><button type="button" disabled={store.readError} onClick={() => { if (item.archivedAt || window.confirm(`Archiver « ${item.name} » en conservant sa fiche ?`)) patch(item, { archivedAt: item.archivedAt ? null : new Date().toISOString() }, item.archivedAt ? "Restauré" : "Archivé"); }}>{item.archivedAt ? "Restaurer le lieu" : "Archiver le lieu"}</button></div><HouseHistory item={item} /></article>)}</div>
    {!visible.length && <EmptyHouse>Aucun lieu ne correspond aux filtres.</EmptyHouse>}
  </>;
}
