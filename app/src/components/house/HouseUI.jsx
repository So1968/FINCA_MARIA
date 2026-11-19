import { useCallback, useEffect, useRef, useState } from "react";
import { useHouseStorage } from "../../lib/useHouseStorage";
import { HOUSE_KEYS, dateLabel, houseRecords } from "../../lib/houseData.mjs";

export function HouseSaveState({ store }) {
  return <div className="houseSave" role={store.readError || store.saveError ? "alert" : "status"}>
    {store.readError ? "Lecture impossible : données conservées, modification bloquée. Réparez le fichier de sauvegarde ou le stockage avant de continuer."
      : store.saveError ? "Modifications non enregistrées. Gardez cette page ouverte et réessayez la sauvegarde."
      : "Enregistré sur cet appareil. Le partage entre appareils dépend de la connexion familiale."}
    {store.saveError && <button type="button" onClick={store.retry}>Réessayer la sauvegarde</button>}
  </div>;
}
export function HouseNote({ field, label, rows = 4 }) {
  const store = useHouseStorage(HOUSE_KEYS.notes, {});
  return <div className="houseNote"><label>{label}<textarea aria-label={label} rows={rows} disabled={store.readError}
    value={typeof store.value[field] === "string" ? store.value[field] : ""}
    onChange={(event) => { const value = event.target.value; store.update((current) => ({ ...current, [field]: value })); }} /></label><HouseSaveState store={store} /></div>;
}
export function HouseHistory({ item }) {
  if (!Array.isArray(item.history) || !item.history.length) return null;
  return <details className="houseHistory"><summary>Historique des modifications ({item.history.length})</summary><ul>
    {item.history.map((entry, index) => <li key={`${entry.at}-${index}`}><strong>{dateLabel(entry.at)} · {entry.action || "Modification"}</strong>
      <pre>{JSON.stringify(entry.before || {}, null, 2)}</pre></li>)}
  </ul></details>;
}
export function EmptyHouse({ children }) { return <p className="houseEmpty">{children}</p>; }
export function useHouseDraft() {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const markDraft = useCallback(value => {
    dirtyRef.current = Boolean(value);
    setDirty(Boolean(value));
  }, []);
  const confirmReplace = useCallback((message = "Une saisie est en cours dans ce formulaire. La remplacer par une autre fiche ?") => !dirtyRef.current || window.confirm(message), []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return { markDraft, confirmReplace };
}
export function HouseRecovery() {
  const store = useHouseStorage(HOUSE_KEYS.syncRecovery, []);
  if (!store.value.length && !store.readError) return null;
  return <details className="houseCard"><summary>Copies conservées après une mise à jour du partage ({store.value.length})</summary><HouseSaveState store={store} />
    <p>Ces copies locales préservent les séjours annulés ailleurs et les données qui n’ont pas pu être partagées. Elles sont incluses dans la sauvegarde locale FINCA MARIA.</p>
    {houseRecords(store.value).map((item) => <article key={item._key}><h3>{item.booking ? `${item.booking.name} — ${item.booking.place}` : "Copie avant conflit de partage"}</h3><p>{dateLabel(item.at)}</p>
      <details><summary>Lire la copie conservée</summary><pre>{JSON.stringify(item.booking || item.value, null, 2)}</pre></details>
      <button type="button" onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(item, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = `FINCA_MARIA-copie-${item.id}.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>Télécharger cette copie</button>
    </article>)}
  </details>;
}
