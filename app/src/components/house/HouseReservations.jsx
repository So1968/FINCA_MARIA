import { useMemo, useRef, useState } from "react";
import { HOUSE_KEYS, HOUSE_ROOMS, addHouseDays, bookingConflict, changeHouseRecord, dateLabel, historyChange, houseRecords, localDay, newHouseId, readHouseData, removeHouseRecord, searchable, syncableHouseBookings, validHouseDate } from "../../lib/houseData.mjs";
import { useHouseStorage } from "../../lib/useHouseStorage";
import { EmptyHouse, HouseSaveState, useHouseDraft } from "./HouseUI";

const EMPTY = { name: "", place: HOUSE_ROOMS[0], arrival: "", departure: "", note: "" };
export function HouseReservations() {
  const { markDraft, confirmReplace } = useHouseDraft();
  const bookings = useHouseStorage(HOUSE_KEYS.bookings, []);
  const trash = useHouseStorage(HOUSE_KEYS.bookingTrash, []);
  const ready = useHouseStorage(HOUSE_KEYS.ready, {});
  const plan = useHouseStorage(HOUSE_KEYS.rooms, {});
  const [month, setMonth] = useState(() => localDay().slice(0, 7));
  const [room, setRoom] = useState("Toutes les chambres");
  const [query, setQuery] = useState("");
  const [allDates, setAllDates] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState("");
  const [message, setMessage] = useState("");
  const nameRef = useRef(null);
  const records = houseRecords(bookings.value).filter((item) => !item.cancelledAt);
  const shareableIds = new Set(syncableHouseBookings(bookings.value).map((item) => item.id));
  const rooms = [...new Set([...HOUSE_ROOMS, ...records.map((item) => item.place).filter(Boolean), ...Object.keys(plan.value.rooms || {}), ...Object.keys(ready.value)])];
  const [year, number] = month.split("-").map(Number);
  const title = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, number - 1, 1));
  const days = useMemo(() => Array.from({ length: new Date(year, number, 0).getDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`), [year, number, month]);
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
  const visible = records.filter((item) => (room === "Toutes les chambres" || item.place === room)
    && (!query || searchable(`${item.name} ${item.place} ${item.note}`).includes(searchable(query)))
    && (allDates || !validHouseDate(item.arrival) || !validHouseDate(item.departure) || (item.arrival <= days.at(-1) && item.departure > days[0])))
    .sort((a, b) => String(a.arrival || "").localeCompare(String(b.arrival || "")));

  function shift(delta) { setMonth(localDay(new Date(year, number - 1 + delta, 1, 12)).slice(0, 7)); }
  function edit(item) {
    if (editing === item._key) { nameRef.current?.focus(); return; }
    if (!confirmReplace()) return;
    markDraft(false);
    setEditing(item._key);
    setForm({ ...EMPTY, ...item, name: item.name || "", place: item.place || "", arrival: item.arrival || "", departure: item.departure || "", note: item.note || "" });
    if (validHouseDate(item.arrival)) setMonth(item.arrival.slice(0, 7));
    nameRef.current?.focus();
  }
  function submit(event) {
    event.preventDefault(); setMessage("");
    if (editing && !records.some((item) => item._key === editing)) { setMessage("Ce séjour n’est plus actif. Votre formulaire est conservé ; vérifiez l’historique avant de recréer une réservation."); return; }
    if (!form.name.trim() || !form.place.trim() || !validHouseDate(form.arrival) || !validHouseDate(form.departure) || form.departure <= form.arrival) {
      setMessage("Indiquez un occupant, une chambre et un départ après l’arrivée."); return;
    }
    if (form.name.length > 160 || form.place.length > 160 || form.note.length > 1000) {
      setMessage("Le partage accepte 160 caractères pour l’occupant ou la chambre et 1 000 pour la remarque. Abrégez ces champs avant l’enregistrement ; les anciennes données sont conservées."); return;
    }
    const latest = readHouseData(localStorage, HOUSE_KEYS.bookings, []);
    if (latest.error) { setMessage("Stockage illisible : réservation non modifiée."); return; }
    const conflict = bookingConflict(latest.value, form, editing);
    if (conflict) { setMessage(`Conflit : ${conflict.name || "un autre séjour"} occupe déjà ${form.place} sur cette période.`); return; }
    const { _key, history, ...fields } = form;
    const duplicateId = form.id && latest.value.filter((item) => item?.id === form.id).length > 1;
    const oldIdNeedsRepair = typeof form.id === "string" && (!form.id.trim() || form.id !== form.id.trim());
    const id = duplicateId || oldIdNeedsRepair ? newHouseId("presence") : form.id || newHouseId("presence");
    const patch = { ...fields, id, name: form.name.trim(), place: form.place.trim() };
    setForm((current) => ({ ...current, id }));
    const previous = records.find((item) => item._key === editing);
    const saved = bookings.update((current) => editing ? changeHouseRecord(current, editing, historyChange(previous, patch, "Réservation modifiée"))
      : current.some((item) => item?.id === id) ? changeHouseRecord(current, id, patch) : [...current, patch]);
    if (saved) { markDraft(false); setMonth(form.arrival.slice(0, 7)); setForm(EMPTY); setEditing(""); setMessage("Réservation enregistrée."); }
  }
  function cancel(item) {
    if (!window.confirm(`Annuler la réservation de ${item.name || "cet occupant"} ? Elle restera dans l’historique des annulations.`)) return;
    const { _key, ...original } = item;
    const archived = { ...original, id: original.id || newHouseId("presence"), cancelledAt: new Date().toISOString(), archiveId: newHouseId("annulation") };
    // Conserver une copie avant tout retrait du calendrier actif.
    if (!trash.update((current) => [...current, archived])) { setMessage("Annulation non effectuée : l’historique n’a pas pu être enregistré."); return; }
    const saved = bookings.update((current) => removeHouseRecord(current, item._key));
    if (saved) { setMessage("Réservation annulée et conservée dans l’historique."); if (editing === item._key) { markDraft(false); setEditing(""); setForm(EMPTY); } }
  }
  function restore(item) {
    const { _key, cancelledAt, removedAt, deletedAt, archiveId, ...original } = item;
    const latest = readHouseData(localStorage, HOUSE_KEYS.bookings, []);
    if (latest.error || bookingConflict(latest.value, original)) { setMessage("Restauration impossible : vérifiez le stockage et les réservations en conflit."); return; }
    // Une nouvelle identité permet aussi de restaurer un séjour supprimé côté serveur,
    // dont l'identité initiale reste dans la corbeille et le journal serveur.
    if (bookings.update((current) => [...current, { ...original, id: newHouseId("presence"), restoredFrom: original.id }])) setMessage("Séjour restauré dans le calendrier ; l’annulation reste conservée.");
  }
  function updateRoom(name, field, value) {
    plan.update((current) => ({ ...current, rooms: { ...(current.rooms || {}), [name]: { ...(current.rooms?.[name] || {}), [field]: value } }, updatedAt: new Date().toISOString() }));
  }
  return <>
    <HouseSaveState store={bookings} />
    <div className="houseFilters">
      <label>Chambre affichée<select aria-label="Chambre affichée" value={room} onChange={(e) => setRoom(e.target.value)}><option>Toutes les chambres</option>{rooms.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Rechercher un séjour<input aria-label="Rechercher un séjour" type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
    </div>
    <section aria-label="Calendrier mensuel" className="houseCard">
      <div className="houseMonth"><button type="button" aria-label="Mois précédent" onClick={() => shift(-1)}>←</button><h3 aria-live="polite">{title}</h3><button type="button" aria-label="Mois suivant" onClick={() => shift(1)}>→</button><button type="button" onClick={() => setMonth(localDay().slice(0, 7))}>Aujourd’hui</button></div>
      <p>Une nuit est comptée du jour d’arrivée au jour de départ exclu. Touchez un jour pour préparer une réservation, ou un nom pour modifier le séjour.</p>
      <div className="houseCalendar">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <b key={day}>{day}</b>)}
        {Array.from({ length: offset }, (_, i) => <span key={`offset-${i}`} />)}
        {days.map((date) => <div key={date} className={`houseDay ${date === localDay() ? "isToday" : ""}`}>
          <button type="button" className="houseDayPick" aria-label={`Réserver le ${dateLabel(date)}`} disabled={bookings.readError}
            onClick={() => { if (!confirmReplace("Une saisie est en cours dans ce formulaire. La remplacer par une nouvelle réservation ?")) return; markDraft(false); setEditing(""); setForm({ ...EMPTY, arrival: date, departure: addHouseDays(date, 1), place: room === "Toutes les chambres" ? HOUSE_ROOMS[0] : room }); nameRef.current?.focus(); }}>{Number(date.slice(-2))}</button>
          {visible.filter((item) => item.arrival <= date && item.departure > date).map((item) => <button type="button" key={item._key} className="houseBookingChip" title={`${item.name} — ${item.place}`} onClick={() => edit(item)}>{item.name}</button>)}
        </div>)}
      </div>
    </section>
    <form onChangeCapture={() => markDraft(true)} className="houseCard houseForm" onSubmit={submit} aria-label="Réservation">
      <h3>{editing ? "Modifier la réservation" : "Nouvelle réservation"}</h3>
      <fieldset disabled={bookings.readError}>
        <label>Occupant<input aria-label="Occupant" ref={nameRef} required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Chambre<select aria-label="Chambre" required value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })}>{[...new Set([...rooms, form.place])].map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Arrivée<input aria-label="Arrivée" type="date" required value={form.arrival} onChange={(e) => setForm({ ...form, arrival: e.target.value })} /></label>
        <label>Départ<input aria-label="Départ" type="date" required min={form.arrival ? addHouseDays(form.arrival, 1) : undefined} value={form.departure} onChange={(e) => setForm({ ...form, departure: e.target.value })} /></label>
        <label className="houseWide">Remarque<textarea aria-label="Remarque" maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        <div className="houseButtons houseWide"><button type="submit">{editing ? "Enregistrer les modifications" : "Créer la réservation"}</button>{editing && <button type="button" onClick={() => { markDraft(false); setEditing(""); setForm(EMPTY); }}>Abandonner la modification</button>}</div>
      </fieldset>
    </form>
    <p role="status" aria-live="polite">{message}</p>
    <section aria-label="Liste des séjours"><h3>Séjours enregistrés</h3><label className="houseCheck"><input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />Toutes les dates, y compris les anciens séjours</label>
      <div className="houseCards">{visible.map((item) => <article className="houseCard" key={item._key}><h4>{item.name || "Occupant à préciser"}</h4><p>{item.place || "Chambre à préciser"} · {dateLabel(item.arrival)} → {dateLabel(item.departure)}</p><p>{item.note}</p>
        {!shareableIds.has(item.id) && <p>Ancien enregistrement conservé sur cet appareil : vérifiez les dates, l’identifiant et la longueur des champs avant partage.</p>}
        <div className="houseButtons"><button type="button" onClick={() => edit(item)} disabled={bookings.readError}>Modifier</button><button type="button" onClick={() => cancel(item)} disabled={bookings.readError || trash.readError}>Annuler le séjour</button></div></article>)}</div>
      {!visible.length && <EmptyHouse>Aucun séjour ne correspond aux filtres.</EmptyHouse>}
    </section>
    <details className="houseCard"><summary>Historique des annulations ({trash.value.length})</summary><HouseSaveState store={trash} />{houseRecords(trash.value).map((item) => <article key={item._key}><h4>{item.name} — {item.place}</h4><p>{dateLabel(item.arrival)} → {dateLabel(item.departure)}</p><button type="button" disabled={bookings.readError} onClick={() => restore(item)}>Restaurer ce séjour</button></article>)}</details>
    <details className="houseCard" id="preparer-chambres"><summary>Chambres, couchages et préparation</summary><HouseSaveState store={plan} /><HouseSaveState store={ready} />
      <div className="houseCards">{rooms.map((name) => <article key={name} className="houseCard"><h4>{name}</h4>
        <label className="houseCheck"><input type="checkbox" checked={Boolean(ready.value[name])} disabled={ready.readError} onChange={(e) => { const checked = e.target.checked; ready.update((current) => ({ ...current, [name]: checked })); }} />Chambre prête</label>
        <label>Couchages<input aria-label="Couchages" type="number" min="0" disabled={plan.readError} value={plan.value.rooms?.[name]?.beds ?? ""} onChange={(e) => updateRoom(name, "beds", e.target.value === "" ? "" : Number(e.target.value))} /></label>
        <label>Types de lits<input aria-label="Types de lits" disabled={plan.readError} value={plan.value.rooms?.[name]?.bedTypes || ""} onChange={(e) => updateRoom(name, "bedTypes", e.target.value)} /></label>
        <label>Note de chambre<textarea aria-label="Note de chambre" disabled={plan.readError} value={plan.value.rooms?.[name]?.note || ""} onChange={(e) => updateRoom(name, "note", e.target.value)} /></label>
      </article>)}</div>
    </details>
  </>;
}
