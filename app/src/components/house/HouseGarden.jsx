import { useState } from "react";
import { patioTrees } from "../../data/houseContent.mjs";
import { HOUSE_KEYS, dateLabel, historyChange, localDay, newHouseId } from "../../lib/houseData.mjs";
import { useHouseStorage } from "../../lib/useHouseStorage";
import { EmptyHouse, HouseHistory, HouseSaveState, useHouseDraft } from "./HouseUI";

async function housePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error("Choisissez une photo JPEG, PNG ou WebP de moins de 10 Mo.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Cette photo ne peut pas être préparée dans ce navigateur.");
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { id: newHouseId("photo"), name: file.name, dataUrl: canvas.toDataURL("image/jpeg", 0.76), at: new Date().toISOString() };
  } finally { URL.revokeObjectURL(url); }
}
export function HouseGarden() {
  const { markDraft, confirmReplace } = useHouseDraft();
  const store = useHouseStorage(HOUSE_KEYS.garden, {});
  const [month, setMonth] = useState("");
  const [form, setForm] = useState({ tree: "laurier-central", work: "", date: "", responsible: "" });
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  function edit(item) {
    if (editing === item.id && form.tree === item.treeId) return;
    if (!confirmReplace()) return;
    setEditing(item.id); markDraft(false); setForm({ tree: item.treeId, work: item.work, date: item.date, responsible: item.responsible || "" });
  }
  function updateTree(id, patch) {
    return store.update((current) => ({ ...current, [id]: { ...(current[id] || {}), ...patch, updatedAt: new Date().toISOString() } }));
  }
  function plan(event) {
    event.preventDefault();
    const item = { id: editing || form.id || newHouseId("intervention"), work: form.work.trim(), date: form.date, responsible: form.responsible };
    if (!item.work || !item.date) return;
    if (!editing) setForm((current) => ({ ...current, id: item.id }));
    if (store.update((current) => {
      const previous = Array.isArray(current[form.tree]?.interventions) ? current[form.tree].interventions : [];
      const next = previous.some((entry) => entry.id === item.id) ? previous.map((entry) => entry.id === item.id ? { ...entry, ...historyChange(entry, item, "Intervention modifiée") } : entry) : [...previous, { ...item, createdAt: new Date().toISOString() }];
      return { ...current, [form.tree]: { ...current[form.tree], interventions: next } };
    })) {
      setEditing(""); markDraft(false); setForm({ tree: form.tree, work: "", date: "", responsible: "" }); setMessage("Intervention enregistrée.");
    }
  }
  function changeIntervention(item, patch, action) {
    store.update((current) => ({ ...current, [item.treeId]: { ...current[item.treeId], interventions: current[item.treeId].interventions.map((entry) => entry.id === item.id ? { ...entry, ...historyChange(entry, patch, action) } : entry) } }));
  }
  async function upload(id, file, input) {
    if (!file) return;
    setUploading(true); setMessage("");
    try {
      const photo = await housePhoto(file);
      const proposed = { ...store.value, [id]: { ...store.value[id], photos: [...(Array.isArray(store.value[id]?.photos) ? store.value[id].photos : []), photo] } };
      if (new TextEncoder().encode(JSON.stringify(proposed)).length > 1800 * 1024) throw new Error("Le suivi du jardin atteint la limite de partage des photos. Conservez les originaux dans le BAÚL et ajoutez leurs repères dans les champs avant/après.");
      const saved = store.update((current) => ({ ...current, [id]: { ...current[id], photos: [...(Array.isArray(current[id]?.photos) ? current[id].photos : []), photo] } }));
      if (saved) setMessage("Photo enregistrée dans le suivi du jardin.");
    } catch (error) { setMessage(error.message || "Import de photo impossible."); }
    finally { setUploading(false); input.value = ""; }
  }
  const calendar = patioTrees.flatMap((tree) => {
    const record = store.value[tree.id] || {};
    return [
      ...(record.nextCheck ? [{ tree: tree.species, date: record.nextCheck, work: "Prochaine vérification", kind: "Prévu" }] : []),
      ...(record.interventionDate ? [{ tree: tree.species, date: record.interventionDate, work: "Intervention renseignée", kind: "Réalisé" }] : []),
      ...(Array.isArray(record.interventions) ? record.interventions : []).map((item) => ({ ...item, tree: tree.species, treeId: tree.id, kind: item.doneAt ? "Réalisé" : "Prévu" }))
    ];
  }).filter((item) => (showArchived || !item.archivedAt) && (!month || item.date?.startsWith(month))).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return <>
    <HouseSaveState store={store} /><p role="status" aria-live="polite">{uploading ? "Préparation de la photo…" : message}</p>
    <form onChangeCapture={() => markDraft(true)} className="houseCard houseForm" aria-label="Intervention jardin" onSubmit={plan}><h3>{editing ? "Modifier une intervention" : "Planifier une intervention"}</h3><fieldset disabled={store.readError}>
      <label>Arbre<select aria-label="Arbre" disabled={Boolean(editing)} value={form.tree} onChange={(e) => setForm({ ...form, tree: e.target.value })}>{patioTrees.map((tree) => <option value={tree.id} key={tree.id}>{tree.species}</option>)}</select></label>
      <label>Intervention<input aria-label="Intervention" required value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value })} /></label>
      <label>Date prévue<input aria-label="Date prévue" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label>Responsable jardin<input aria-label="Responsable jardin" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></label>
      <button type="submit">{editing ? "Enregistrer l’intervention" : "Planifier l’intervention"}</button>
      {editing && <button type="button" onClick={() => { setEditing(""); markDraft(false); setForm({ tree: form.tree, work: "", date: "", responsible: "" }); }}>Abandonner la modification</button>}
    </fieldset></form>
    <section className="houseCard" aria-label="Calendrier des interventions"><h3>Calendrier des interventions</h3><label>Filtrer le mois du jardin<input aria-label="Filtrer le mois du jardin" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label><button type="button" onClick={() => setMonth("")}>Tous les mois du jardin</button>
      <label className="houseCheck"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Inclure les interventions archivées</label>
      {calendar.map((item, index) => <article key={item.id || `${item.tree}-${index}`}><h4>{dateLabel(item.date)} · {item.tree}</h4><p>{item.work} · {item.kind}{item.responsible ? ` · ${item.responsible}` : ""}</p>
        {item.id && <div className="houseButtons">
          <button type="button" disabled={store.readError} onClick={() => edit(item)}>Modifier l’intervention — {item.work}</button>
          <button type="button" disabled={store.readError} onClick={() => changeIntervention(item, { doneAt: item.doneAt ? null : localDay() }, "Réalisation modifiée")}>{item.doneAt ? "Rouvrir" : "Marquer réalisée"} — {item.work}</button>
          <button type="button" disabled={store.readError} onClick={() => { if (item.archivedAt || window.confirm("Archiver cette intervention en conservant sa trace ?")) changeIntervention(item, { archivedAt: item.archivedAt ? null : new Date().toISOString() }, item.archivedAt ? "Restaurée" : "Archivée"); }}>{item.archivedAt ? "Restaurer" : "Archiver"} l’intervention — {item.work}</button>
        </div>}
        {item.id && <HouseHistory item={item} />}
      </article>)}{!calendar.length && <EmptyHouse>Aucune intervention renseignée pour cette période.</EmptyHouse>}
    </section>
    <div className="houseCards">{patioTrees.map((tree) => {
      const record = store.value[tree.id] || {};
      return <article className="houseCard" key={tree.id} aria-label={`Suivi ${tree.species}`}><h3>{tree.species}</h3><p>{tree.location}</p>
        <label>Dernière intervention<input aria-label="Dernière intervention" type="date" disabled={store.readError} value={record.interventionDate || ""} onChange={(e) => updateTree(tree.id, { interventionDate: e.target.value })} /></label>
        <label>Prochaine vérification<input aria-label="Prochaine vérification" type="date" disabled={store.readError} value={record.nextCheck || ""} onChange={(e) => updateTree(tree.id, { nextCheck: e.target.value })} /></label>
        <label>Observations<textarea aria-label="Observations" rows="4" disabled={store.readError} value={record.observations || ""} onChange={(e) => updateTree(tree.id, { observations: e.target.value })} /></label>
        <button type="button" disabled={store.readError} onClick={() => store.update((current) => ({ ...current, [tree.id]: { ...current[tree.id], ...historyChange(current[tree.id] || {}, {}, "Point de suivi consigné") } }))}>Consigner un point dans l’historique</button>
        <label>Repères des photos avant<input aria-label="Repères des photos avant" disabled={store.readError} value={record.beforePhotos || ""} onChange={(e) => updateTree(tree.id, { beforePhotos: e.target.value })} /></label>
        <label>Repères des photos après<input aria-label="Repères des photos après" disabled={store.readError} value={record.afterPhotos || ""} onChange={(e) => updateTree(tree.id, { afterPhotos: e.target.value })} /></label>
        <label>Ajouter une photo<input aria-label="Ajouter une photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={store.readError || uploading} onChange={(e) => upload(tree.id, e.target.files?.[0], e.target)} /></label>
        <p>Les photos de suivi sont réduites pour l’affichage. Conservez aussi les originaux dans le BAÚL.</p>
        <div className="housePhotos">{(Array.isArray(record.photos) ? record.photos : []).filter((photo) => /^data:image\/(jpeg|png|webp);base64,/.test(photo.dataUrl || "")).map((photo) => <figure key={photo.id}><img src={photo.dataUrl} alt={`${tree.species} — ${photo.name}`} loading="lazy" /><figcaption>{photo.name} · {dateLabel(photo.at)}</figcaption></figure>)}</div>
        <details><summary>Projet familial de référence — août 2026</summary><p>Ces objectifs et conseils anciens restent à confirmer selon l’état réel de l’arbre et les conditions locales avant intervention.</p><p>{tree.problem}</p><p>{tree.objective}</p><p>{tree.shape}</p><p>{tree.target}</p><ul>{tree.intervention.map((text) => <li key={text}>{text}</li>)}</ul><p>{tree.period}</p><p>{tree.intensity}</p><p>{tree.photoState}</p></details>
        <HouseHistory item={record} />
      </article>;
    })}</div>
  </>;
}
