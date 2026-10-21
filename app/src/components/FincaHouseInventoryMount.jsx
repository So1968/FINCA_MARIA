import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HOUSE_INVENTORY_KEY,
  documentedHouseInventory,
  historicalHouseInventoryToVerify,
  houseEquipmentClues,
  houseInventoryCategories,
  houseInventoryStatuses,
  inventoryAuditCategories,
  normalizeUserInventory,
  getHouseEssentialSummary,
  getInventorySummary
} from "../data/cortijoHouseInventory.js";

function readInventory() {
  try {
    return normalizeUserInventory(JSON.parse(localStorage.getItem(HOUSE_INVENTORY_KEY) || "[]"));
  } catch {
    return [];
  }
}

function resolveHost() {
  if (new URLSearchParams(window.location.search).get("mode") === "vacanciers") return null;
  const section = document.getElementById("inventaire");
  if (!(section instanceof HTMLDetailsElement)) return null;
  let host = document.getElementById("finca-house-inventory-structured-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "finca-house-inventory-structured-host";
    const textarea = section.querySelector("textarea");
    if (textarea?.parentElement === section) textarea.insertAdjacentElement("afterend", host);
    else section.appendChild(host);
  }
  return host;
}

function quantityLabel(item) {
  if (item.quantity === null || item.quantity === undefined || item.quantity === "") return "quantité à vérifier";
  return `quantité ${item.quantity}`;
}

function InventoryCard({ item, removable = false, onRemove }) {
  return (
    <article className="fincaInventoryCard">
      <div className="fincaInventoryCardTop">
        <div><strong>{item.object}</strong><small>{item.category}</small></div>
        <span>{item.status}</span>
      </div>
      <p>{item.room || "Emplacement à préciser"} · {quantityLabel(item)}{item.size ? ` · taille ${item.size}` : ""}</p>
      {item.evidenceStatus && <p><b>Source :</b> {item.evidenceStatus}</p>}
      {item.note && <p>{item.note}</p>}
      {removable && <button type="button" onClick={() => onRemove(item.id)}>Retirer cette entrée</button>}
    </article>
  );
}

function InventoryPanel() {
  const [userInventory, setUserInventory] = useState(readInventory);
  const [form, setForm] = useState({ object: "", category: "Vaisselle", room: "", quantity: "", status: "Présent", note: "" });
  const summary = useMemo(() => getInventorySummary(userInventory), [userInventory]);
  const essential = useMemo(() => getHouseEssentialSummary(userInventory), [userInventory]);

  useEffect(() => {
    let previous = localStorage.getItem(HOUSE_INVENTORY_KEY) || "[]";
    const refresh = () => {
      const next = localStorage.getItem(HOUSE_INVENTORY_KEY) || "[]";
      if (next === previous) return;
      previous = next;
      setUserInventory(readInventory());
    };
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function persist(next) {
    setUserInventory(next);
    localStorage.setItem(HOUSE_INVENTORY_KEY, JSON.stringify(next));
  }

  function addItem(event) {
    event.preventDefault();
    if (!form.object.trim()) return;
    const parsedQuantity = form.quantity === "" ? null : Number(form.quantity);
    const item = {
      id: `maison-inventaire-${Date.now()}`,
      object: form.object.trim(),
      category: form.category,
      room: form.room.trim() || "Emplacement à préciser",
      quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null,
      status: form.status,
      evidenceStatus: "Saisie Maison",
      note: form.note.trim(),
      updatedAt: new Date().toISOString()
    };
    persist([...userInventory, item]);
    setForm({ object: "", category: form.category, room: "", quantity: "", status: "Présent", note: "" });
  }

  function removeItem(id) {
    if (!window.confirm("Retirer cette entrée de l’inventaire Maison ?")) return;
    persist(userInventory.filter((item) => item.id !== id));
  }

  function prepareCheck(check) {
    const category = check.categories?.[0]
      || (check.area === "Sécurité" ? "Matériel de sécurité" : "Autre");
    setForm({
      object: check.label,
      category,
      room: check.area,
      quantity: "1",
      status: "À vérifier",
      note: check.note
    });
  }

  return (
    <section className="fincaInventoryStructured" aria-label="Inventaire structuré de la maison">
      <style>{`
        .fincaInventoryStructured{margin-top:.8rem;border-top:1px solid rgba(214,169,85,.16);padding-top:.8rem}.fincaInventoryLead{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.fincaInventoryLead h4{margin:0;color:#fff3d4}.fincaInventoryLead p{margin:.25rem 0 0;color:#cdb98d;font-size:.82rem}.fincaInventoryLead span{white-space:nowrap;color:#efd99d;font-size:.78rem}.fincaInventoryStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin:.7rem 0}.fincaInventoryStats article{border:1px solid rgba(214,169,85,.14);border-radius:12px;padding:.6rem;background:rgba(0,0,0,.1)}.fincaInventoryStats strong{display:block;color:#fff3d4}.fincaInventoryStats small{color:#bfae88}.fincaEssentialAudit{margin:.8rem 0;border:1px solid rgba(214,169,85,.18);border-radius:16px;padding:.75rem;background:rgba(214,169,85,.035)}.fincaEssentialAuditHead{display:flex;justify-content:space-between;gap:.8rem;align-items:flex-start}.fincaEssentialAuditHead strong{color:#fff3d4}.fincaEssentialAuditHead span{color:#efd99d;font-size:.76rem}.fincaEssentialAuditHead p{margin:.2rem 0 0;color:#cdb98d;font-size:.78rem}.fincaEssentialGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.5rem;margin-top:.6rem}.fincaEssentialCard{border:1px solid rgba(214,169,85,.14);border-radius:13px;padding:.62rem;background:rgba(0,0,0,.1)}.fincaEssentialCardTop{display:flex;justify-content:space-between;gap:.45rem}.fincaEssentialCardTop strong{color:#fff3d4;font-size:.86rem}.fincaEssentialCardTop span{white-space:nowrap;color:#caa66a;font-size:.66rem}.fincaEssentialCard small{display:block;margin-top:.12rem;color:#bfae88}.fincaEssentialCard p{margin:.35rem 0 0;color:#cdb98d;font-size:.73rem;line-height:1.4}.fincaEssentialCard button{margin-top:.45rem;border:1px solid rgba(214,169,85,.2);border-radius:999px;padding:.3rem .5rem;background:transparent;color:#efd99d;cursor:pointer;font-size:.7rem}.fincaEquipmentClues{margin-top:.6rem}.fincaEquipmentClues>summary{cursor:pointer;color:#efd99d;font-weight:800}.fincaEquipmentClueGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:.5rem;margin-top:.5rem}.fincaEquipmentClue{border:1px dashed rgba(214,169,85,.2);border-radius:12px;padding:.6rem}.fincaEquipmentClue strong{display:block;color:#fff3d4}.fincaEquipmentClue span,.fincaEquipmentClue small{display:block;margin-top:.18rem;color:#bfae88;font-size:.72rem;line-height:1.35}.fincaInventoryForm{display:grid;grid-template-columns:2fr 1fr 1.2fr .7fr 1fr;gap:.45rem;margin:.75rem 0}.fincaInventoryForm input,.fincaInventoryForm select,.fincaInventoryForm textarea{min-height:42px;border:1px solid rgba(214,169,85,.2);border-radius:10px;padding:.45rem .55rem;background:rgba(0,0,0,.16);color:#f5e6c2;font:inherit}.fincaInventoryForm textarea{grid-column:1/-2;min-height:58px;resize:vertical}.fincaInventoryForm button{border:1px solid rgba(214,169,85,.3);border-radius:999px;background:rgba(214,169,85,.08);color:#efd99d;font-weight:800;cursor:pointer}.fincaInventoryGroup{margin-top:.65rem}.fincaInventoryGroup>summary{cursor:pointer;color:#efd99d;font-weight:800}.fincaInventoryGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:.55rem;margin-top:.55rem}.fincaInventoryCard{border:1px solid rgba(214,169,85,.15);border-radius:14px;padding:.68rem;background:rgba(0,0,0,.11)}.fincaInventoryCardTop{display:flex;justify-content:space-between;gap:.55rem}.fincaInventoryCardTop strong{display:block;color:#fff3d4}.fincaInventoryCardTop small{display:block;color:#bfae88;margin-top:.12rem}.fincaInventoryCardTop span{white-space:nowrap;color:#efd99d;font-size:.7rem}.fincaInventoryCard p{margin:.35rem 0 0;color:#cdb98d;font-size:.76rem;line-height:1.38}.fincaInventoryCard button{margin-top:.45rem;border:0;background:transparent;color:#caa66a;text-decoration:underline;cursor:pointer}.fincaInventoryAudit{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.55rem}.fincaInventoryAudit span{border:1px solid rgba(214,169,85,.14);border-radius:999px;padding:.26rem .45rem;font-size:.68rem;color:#cdb98d}.fincaInventoryAudit b{color:#fff3d4}@media(max-width:760px){.fincaInventoryLead,.fincaEssentialAuditHead{flex-direction:column}.fincaInventoryLead span{white-space:normal}.fincaInventoryStats{grid-template-columns:1fr}.fincaInventoryForm{grid-template-columns:1fr}.fincaInventoryForm textarea{grid-column:auto}.fincaInventoryForm button{min-height:44px}}
      `}</style>

      <div className="fincaInventoryLead">
        <div><h4>Inventaire structuré</h4><p>Les notes libres de l’inventaire restent conservées au-dessus. Ici, on transforme progressivement les relevés réels en objets suivis, sans faire passer les archives anciennes pour l’état actuel.</p></div>
        <span>{summary.categoriesStarted}/{summary.categoriesTotal} catégories commencées</span>
      </div>

      <div className="fincaInventoryStats">
        <article><strong>{summary.currentEntries}</strong><small>entrées actuelles documentées / saisies</small></article>
        <article><strong>{summary.knownQuantity}</strong><small>unités dont la quantité est connue</small></article>
        <article><strong>{summary.toVerifyHistorical}</strong><small>objets historiques à recontrôler</small></article>
      </div>

      <section className="fincaEssentialAudit" aria-label="Contrôle cuisine sanitaires équipements indispensables">
        <div className="fincaEssentialAuditHead">
          <div>
            <strong>Cuisine, sanitaires et essentiels à contrôler</strong>
            <p>Le logiciel distingue « repéré dans l’inventaire » de « fonctionnel ». Une ligne absente ici n’est pas déclarée manquante : elle reste simplement à vérifier sur place.</p>
          </div>
          <span>{essential.repereCount}/{essential.total} repérés dans l’inventaire actuel</span>
        </div>
        <div className="fincaEssentialGrid">
          {essential.checks.map((check) => (
            <article className="fincaEssentialCard" key={check.id}>
              <div className="fincaEssentialCardTop"><strong>{check.label}</strong><span>{check.priority}</span></div>
              <small>{check.area} · {check.inventoryStatus}</small>
              {check.matches.length > 0 && <p><b>Entrée(s) liée(s) :</b> {check.matches.map((item) => item.object).join(", ")}</p>}
              <p>{check.note}</p>
              {!check.matches.length && <button type="button" onClick={() => prepareCheck(check)}>Préparer la vérification dans l’inventaire</button>}
            </article>
          ))}
        </div>

        <details className="fincaEquipmentClues">
          <summary>Repères retrouvés dans les plans et archives · {houseEquipmentClues.length}</summary>
          <div className="fincaEquipmentClueGrid">
            {houseEquipmentClues.map((item) => (
              <article className="fincaEquipmentClue" key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.area}</span>
                <small>{item.source}</small>
                <small>{item.status}</small>
              </article>
            ))}
          </div>
        </details>
      </section>

      <form className="fincaInventoryForm" onSubmit={addItem}>
        <input value={form.object} onChange={(event) => setForm({ ...form, object: event.target.value })} placeholder="Objet / équipement" aria-label="Objet à inventorier" />
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} aria-label="Catégorie">{houseInventoryCategories.map((item) => <option key={item}>{item}</option>)}</select>
        <input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} placeholder="Pièce / emplacement" />
        <input type="number" min="1" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Qté" />
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} aria-label="Statut">{houseInventoryStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="État, détail, mesure, remarque…" />
        <button type="submit">+ Ajouter</button>
      </form>

      <details className="fincaInventoryGroup" open>
        <summary>Inventaire actuel documenté · {documentedHouseInventory.length + userInventory.length}</summary>
        <div className="fincaInventoryGrid">
          {documentedHouseInventory.map((item) => <InventoryCard key={item.id} item={item} />)}
          {userInventory.map((item) => <InventoryCard key={item.id} item={item} removable onRemove={removeItem} />)}
        </div>
      </details>

      <details className="fincaInventoryGroup">
        <summary>Archives à vérifier sur place · {historicalHouseInventoryToVerify.length}</summary>
        <div className="fincaInventoryGrid">{historicalHouseInventoryToVerify.map((item) => <InventoryCard key={item.id} item={item} />)}</div>
      </details>

      <details className="fincaInventoryGroup">
        <summary>Couverture de l’inventaire</summary>
        <div className="fincaInventoryAudit">{inventoryAuditCategories.map((item) => <span key={item.category}><b>{item.category}</b> · {item.status}</span>)}</div>
      </details>
    </section>
  );
}

export function FincaHouseInventoryMount() {
  const [host, setHost] = useState(null);
  useEffect(() => {
    const resolve = () => {
      const next = resolveHost();
      setHost((current) => current === next ? current : next);
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return host ? createPortal(<InventoryPanel />, host) : null;
}
