import { useState } from "react";
import { documentedHouseInventory, historicalHouseInventoryToVerify, houseEquipmentClues, houseInventoryCategories, houseInventoryStatuses, getHouseEssentialSummary } from "../../data/cortijoHouseInventory";
import { HOUSE_KEYS, changeHouseRecord, historyChange, houseRecords, newHouseId, searchable } from "../../lib/houseData.mjs";
import { useHouseStorage } from "../../lib/useHouseStorage";
import { EmptyHouse, HouseHistory, HouseNote, HouseSaveState, useHouseDraft } from "./HouseUI";

const EMPTY = { object: "", category: "Meubles", room: "", quantity: "", status: "Présent", note: "" };
export function HouseInventory() {
  const { markDraft, confirmReplace } = useHouseDraft();
  const [showForm, setShowForm] = useState(false);
  const store = useHouseStorage(HOUSE_KEYS.inventory, []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [status, setStatus] = useState("Tous");
  const [archives, setArchives] = useState(false);
  const [editing, setEditing] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const user = houseRecords(store.value);
  const userById = new Map(user.map((item) => [item.id, item]));
  const defaults = documentedHouseInventory.map((item) => ({ ...item, _key: item.id, ...(userById.get(item.id) || {}) }));
  const defaultIds = new Set(documentedHouseInventory.map((item) => item.id));
  const items = [...defaults, ...user.filter((item) => !defaultIds.has(item.id))];
  const categories = [...new Set([...houseInventoryCategories, ...items.map((item) => item.category).filter(Boolean)])];
  const visible = items.filter((item) => Boolean(item.archivedAt) === archives)
    .filter((item) => category === "Toutes" || item.category === category)
    .filter((item) => status === "Tous" || item.status === status)
    .filter((item) => !query || searchable(`${item.object} ${item.room} ${item.note}`).includes(searchable(query)));
  function edit(item) {
    if (editing === item._key) { setShowForm(true); return; }
    if (!confirmReplace()) return;
    setShowForm(true); markDraft(false); setEditing(item._key); setForm({ ...EMPTY, ...item, quantity: item.quantity ?? "" });
  }
  function patch(item, changes, action) {
    const patch = historyChange(item, changes, action);
    return store.update((current) => houseRecords(current).some((row) => row._key === item._key)
      ? changeHouseRecord(current, item._key, patch)
      : [...current, { ...documentedHouseInventory.find((row) => row.id === item.id), ...patch }]);
  }
  function submit(event) {
    event.preventDefault();
    if (editing && !items.some((item) => item._key === editing)) { setMessage("Cette fiche a changé sur un autre écran. La saisie reste dans le formulaire ; vérifiez les données avant de poursuivre."); return; }
    const quantity = form.quantity === "" ? null : Number(form.quantity);
    if (!form.object.trim() || (quantity !== null && (!Number.isFinite(quantity) || quantity < 0))) return;
    const fields = { object: form.object.trim(), category: form.category, room: form.room.trim(), quantity, status: form.status, note: form.note, updatedAt: new Date().toISOString() };
    const id = form.id || newHouseId("maison-inventaire");
    if (!editing) setForm((current) => ({ ...current, id }));
    const saved = editing ? patch(items.find((item) => item._key === editing), fields, "Inventaire modifié")
      : store.update((current) => current.some((item) => item?.id === id) ? changeHouseRecord(current, id, fields) : [...current, { ...fields, id, evidenceStatus: "Saisie Maison" }]);
    if (saved) { setShowForm(false); markDraft(false); setEditing(""); setForm(EMPTY); setMessage("Inventaire enregistré."); }
  }
  function archive(item) {
    if (!window.confirm(`Archiver « ${item.object} » ? La fiche et son historique seront conservés.`)) return;
    patch(item, { archivedAt: new Date().toISOString() }, "Archivé");
  }
  const essentials = getHouseEssentialSummary(items);
  return <>
    <HouseSaveState store={store} />
    <details className="houseCard" open={showForm} onToggle={(e) => setShowForm(e.currentTarget.open)}><summary>Ajouter un objet ou modifier une fiche</summary><form onChangeCapture={() => markDraft(true)} className="houseCard houseForm" aria-label="Fiche inventaire" onSubmit={submit}><h3>{editing ? "Modifier un objet" : "Ajouter un objet"}</h3><fieldset disabled={store.readError}>
      <label>Objet<input aria-label="Objet" required value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })} /></label>
      <label>Catégorie<select aria-label="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Emplacement<input aria-label="Emplacement" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></label>
      <label>Quantité<input aria-label="Quantité" type="number" min="0" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
      <label>État / besoin<select aria-label="État / besoin" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{[...new Set([...houseInventoryStatuses, form.status])].map((name) => <option key={name}>{name}</option>)}</select></label>
      <label className="houseWide">Note<textarea aria-label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <div className="houseButtons houseWide"><button type="submit">Enregistrer l’objet</button>{editing && <button type="button" onClick={() => { markDraft(false); setEditing(""); setForm(EMPTY); }}>Abandonner la modification</button>}</div>
    </fieldset></form></details><p role="status">{message}</p>
    <div className="houseFilters"><label>Rechercher dans l’inventaire<input aria-label="Rechercher dans l’inventaire" type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label>Filtrer les catégories<select aria-label="Filtrer les catégories" value={category} onChange={(e) => setCategory(e.target.value)}><option>Toutes</option>{categories.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Filtrer les besoins<select aria-label="Filtrer les besoins" value={status} onChange={(e) => setStatus(e.target.value)}><option>Tous</option>{houseInventoryStatuses.map((name) => <option key={name}>{name}</option>)}</select></label></div>
    <label className="houseCheck"><input type="checkbox" checked={archives} onChange={(e) => setArchives(e.target.checked)} />Afficher les objets archivés</label>
    <div className="houseCards">{visible.map((item) => <article className="houseCard" key={item._key}><h3>{item.object || "Ancien objet à compléter"}</h3><p>{item.category} · {item.room || "Emplacement à préciser"}</p><p>{item.quantity === null || item.quantity === undefined ? "Quantité à vérifier" : `Quantité : ${item.quantity}`} · {item.status}</p><small>{item.evidenceStatus || "Saisie Maison — état renseigné"}</small><p>{item.note}</p>
      <div className="houseButtons"><button type="button" disabled={store.readError} onClick={() => edit(item)}>Modifier</button>{item.archivedAt ? <button type="button" onClick={() => patch(item, { archivedAt: null }, "Restauré")} disabled={store.readError}>Restaurer l’objet</button> : <button type="button" onClick={() => archive(item)} disabled={store.readError}>Archiver l’objet</button>}</div><HouseHistory item={item} /></article>)}</div>
    {!visible.length && <EmptyHouse>Aucun objet ne correspond aux filtres.</EmptyHouse>}
    <HouseNote field="inventory" label="Anciennes notes libres d’inventaire" />
    <details className="houseCard"><summary>Équipements essentiels à contrôler</summary><p>Un élément repéré ne prouve pas son bon fonctionnement.</p>{essentials.checks.map((check) => <article key={check.id}><h4>{check.label}</h4><p>{check.inventoryStatus} · {check.note}</p></article>)}</details>
    <details className="houseCard"><summary>Repères documentaires et inventaires historiques</summary>{[...historicalHouseInventoryToVerify, ...houseEquipmentClues].map((item) => <article key={item.id}><h4>{item.object || item.label}</h4><p>{item.note || item.source}</p><p>{item.status}</p></article>)}</details>
  </>;
}
