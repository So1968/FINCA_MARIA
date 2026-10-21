import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cortijoActionDesk } from "../data/cortijoActionDesk";

const ACTIONS_KEY = "cortijo_action_assignments_v1";
const NAV_KEY = "finca_maria_navigation_v2";
const PRESENCES_KEY = "finca_maria_maison_presences_v1";
const GARDEN_KEY = "finca_maria_jardin_suivi_v1";
const CHECKLIST_KEY = "finca_maria_sejour_checklist_v1";
const MAINTENANCE_KEY = "finca_maria_entretien_maison_v1";
const LAST_BACKUP_KEY = "finca_maria_last_backup_v1";
const REFRESH_EVENT = "finca-maria-storage-updated";

const MAIN_ACTION_IDS = ["san-juan-historique", "asaja-visite-technique", "pelaez-role-fiscal", "vitines-378-detail"];
const TREE_LABELS = {
  "laurier-central": "Laurier",
  cerisier: "Cerisier",
  citronnier: "Citronnier"
};

const STAY_GROUPS = [
  {
    title: "Avant l'arrivée",
    items: [
      "Aérer et remettre les pièces en service",
      "Vérifier eau, électricité et eau chaude",
      "Préparer les couchages nécessaires",
      "Contrôler cuisine, sanitaires et consommables"
    ]
  },
  {
    title: "Pendant le séjour",
    items: [
      "Noter les réparations ou anomalies constatées",
      "Gérer le linge et les couchages utilisés",
      "Sortir les déchets et maintenir les sanitaires",
      "Noter les achats communs et ce qui manque"
    ]
  },
  {
    title: "Avant le départ",
    items: [
      "Ranger et nettoyer les espaces utilisés",
      "Traiter le linge utilisé",
      "Vider ce qui doit l'être et sortir les déchets",
      "Fermer eau, fenêtres, accès et remettre les clés à leur place"
    ]
  }
];

function readLocal(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeLocal(key, value) { try { localStorage.setItem(key, value); return true; } catch (error) { console.error(`FINCA MARIA : impossible d’enregistrer ${key}`, error); return false; } }

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(readLocal(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  if (!writeLocal(key, JSON.stringify(value))) return false;
  window.dispatchEvent(new Event(REFRESH_EVENT));
  return true;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "À préciser";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function dayDiff(from, to) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end - start) / 86400000);
}

function actionStatus(assignments, id) {
  const value = assignments[id]?.status || "Action à compléter";
  if (value === "Terminée") return "Action accomplie";
  if (value === "Attribuée") return "En cours";
  return value;
}

function actionTitle(id) {
  return cortijoActionDesk.find((action) => action.id === id)?.title || id;
}

function openEarthActions() {
  const current = loadJson(NAV_KEY, {});
  saveJson(NAV_KEY, { ...current, area: "terre", earthTab: "actions" });
  window.location.reload();
}

function openHouse(hash) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", "cortijo-maison");
  url.hash = hash ? `#${String(hash).replace(/^#/, "")}` : "";
  window.location.assign(url.toString());
}

function backupLabel(value, today) {
  if (!value) return { title: "Sauvegarde à faire", detail: "Aucune sauvegarde locale repérée" };
  const date = String(value).slice(0, 10);
  const age = dayDiff(date, today);
  if (age > 14) return { title: "Sauvegarde ancienne", detail: `Dernière copie : ${formatDate(date)} · il y a ${age} jours` };
  return { title: "Sauvegarde à jour", detail: `Dernière copie : ${formatDate(date)}` };
}

function HomePilot({ revision }) {
  const today = todayIso();
  const assignments = useMemo(() => loadJson(ACTIONS_KEY, {}), [revision]);
  const presences = useMemo(() => loadJson(PRESENCES_KEY, []), [revision]);
  const garden = useMemo(() => loadJson(GARDEN_KEY, {}), [revision]);
  const lastBackup = readLocal(LAST_BACKUP_KEY) || "";

  const unfinished = MAIN_ACTION_IDS.filter((id) => actionStatus(assignments, id) !== "Action accomplie");
  const dueActions = unfinished
    .map((id) => ({ id, dueAt: assignments[id]?.dueAt || "" }))
    .filter((item) => item.dueAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const overdue = dueActions.filter((item) => item.dueAt < today);
  const nextAction = overdue[0] || dueActions[0] || (unfinished[0] ? { id: unfinished[0], dueAt: "" } : null);

  const sortedPresences = Array.isArray(presences)
    ? [...presences].sort((a, b) => String(a.arrival || "9999").localeCompare(String(b.arrival || "9999")))
    : [];
  const currentStay = sortedPresences.find((item) => item.arrival && item.arrival <= today && (!item.departure || item.departure >= today));
  const nextStay = currentStay || sortedPresences.find((item) => item.arrival && item.arrival >= today);

  const gardenAlerts = Object.entries(TREE_LABELS)
    .map(([id, label]) => ({ id, label, date: garden?.[id]?.nextCheck || "" }))
    .filter((item) => item.date && item.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const backup = backupLabel(lastBackup, today);

  function triggerBackup() {
    const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes("Sauvegarder les données"));
    button?.click();
  }

  return (
    <section className="fincaPilotPanel" aria-label="À regarder maintenant">
      <div className="fincaPilotHeading">
        <div><strong>À regarder maintenant</strong><span>Les points qui demandent vraiment ton attention</span></div>
      </div>
      <div className="fincaPilotGrid">
        <button type="button" className={overdue.length ? "isAlert" : ""} onClick={openEarthActions}>
          <small>ACTIONS</small>
          <strong>{overdue.length ? `${overdue.length} en retard` : nextAction ? "Prochaine action" : "Actions à jour"}</strong>
          <span>{nextAction ? `${actionTitle(nextAction.id)}${nextAction.dueAt ? ` · ${formatDate(nextAction.dueAt)}` : " · échéance à fixer"}` : "Aucune action ouverte"}</span>
        </button>
        <button type="button" onClick={() => openHouse("presences")}>
          <small>SÉJOUR</small>
          <strong>{nextStay ? nextStay.name : "Aucun séjour daté"}</strong>
          <span>{nextStay ? `${formatDate(nextStay.arrival)} → ${formatDate(nextStay.departure)}` : "Ajouter la prochaine présence"}</span>
        </button>
        <button type="button" className={gardenAlerts.length ? "isAlert" : ""} onClick={() => openHouse("patio-jardin")}>
          <small>JARDIN</small>
          <strong>{gardenAlerts.length ? `${gardenAlerts.length} suivi${gardenAlerts.length > 1 ? "s" : ""} à faire` : "Rien d'urgent"}</strong>
          <span>{gardenAlerts.length ? gardenAlerts.map((item) => `${item.label} ${formatDate(item.date)}`).join(" · ") : "Les prochaines vérifications apparaîtront ici"}</span>
        </button>
        <button type="button" className={!lastBackup || dayDiff(String(lastBackup).slice(0, 10), today) > 14 ? "isAlert" : ""} onClick={triggerBackup}>
          <small>SAUVEGARDE</small>
          <strong>{backup.title}</strong>
          <span>{backup.detail}</span>
        </button>
      </div>
    </section>
  );
}

function StayChecklistPanel() {
  const total = STAY_GROUPS.reduce((sum, group) => sum + group.items.length, 0);
  const [state, setState] = useState(() => loadJson(CHECKLIST_KEY, { stayLabel: "", checked: {}, startedAt: "", completedAt: "" }));
  const checked = state.checked || {};
  const done = Object.values(checked).filter(Boolean).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  function commit(next) {
    setState(next);
    saveJson(CHECKLIST_KEY, next);
  }

  function toggle(id) {
    const nextChecked = { ...checked, [id]: !checked[id] };
    const nextDone = Object.values(nextChecked).filter(Boolean).length;
    commit({
      ...state,
      checked: nextChecked,
      startedAt: state.startedAt || new Date().toISOString(),
      completedAt: nextDone === total ? new Date().toISOString() : ""
    });
  }

  function reset() {
    if (done && !window.confirm("Commencer une nouvelle checklist de séjour ? Les coches actuelles seront remises à zéro.")) return;
    commit({ stayLabel: "", checked: {}, startedAt: new Date().toISOString(), completedAt: "" });
  }

  return (
    <section className="fincaOpsCard fincaStayChecklist">
      <div className="fincaOpsHeader">
        <div><span className="cortijoPill">CHECKLIST ACTIVE</span><h4>Séjour : ce qui est réellement fait</h4></div>
        <strong>{done}/{total}</strong>
      </div>
      <div className="fincaProgress" aria-label={`${progress} % terminé`}><span style={{ width: `${progress}%` }} /></div>
      <div className="fincaStayMeta">
        <label><span>Nom / période du séjour</span><input value={state.stayLabel || ""} onChange={(event) => commit({ ...state, stayLabel: event.target.value })} placeholder="Ex. Août 2026 · famille" /></label>
        <button type="button" onClick={reset}>Nouveau séjour / remettre à zéro</button>
      </div>
      <div className="fincaChecklistGrid">
        {STAY_GROUPS.map((group, groupIndex) => (
          <div key={group.title}>
            <strong>{group.title}</strong>
            {group.items.map((item, itemIndex) => {
              const id = `${groupIndex}-${itemIndex}`;
              return <label className={checked[id] ? "isDone" : ""} key={id}><input type="checkbox" checked={Boolean(checked[id])} onChange={() => toggle(id)} /><span>{item}</span></label>;
            })}
          </div>
        ))}
      </div>
      <p className="fincaOpsHint">{state.completedAt ? `Checklist terminée le ${formatDate(state.completedAt)}` : "Les coches restent enregistrées sur cet appareil et sont incluses dans la sauvegarde FINCA MARIA."}</p>
    </section>
  );
}

function MaintenancePanel() {
  const [items, setItems] = useState(() => {
    const value = loadJson(MAINTENANCE_KEY, []);
    return Array.isArray(value) ? value : [];
  });
  const [filter, setFilter] = useState("Ouverts");
  const [form, setForm] = useState({ title: "", zone: "", priority: "À faire", date: todayIso(), note: "" });

  function commit(next) {
    setItems(next);
    saveJson(MAINTENANCE_KEY, next);
  }

  function add(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    commit([{
      id: `entretien-${Date.now()}`,
      title: form.title.trim(),
      zone: form.zone.trim(),
      priority: form.priority,
      status: "À faire",
      date: form.date || todayIso(),
      note: form.note.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, ...items]);
    setForm({ title: "", zone: "", priority: "À faire", date: todayIso(), note: "" });
  }

  function update(id, patch) {
    commit(items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
  }

  function remove(id) {
    const item = items.find((entry) => entry.id === id);
    if (!window.confirm(`Retirer « ${item?.title || "cet élément"} » du suivi ?`)) return;
    commit(items.filter((entry) => entry.id !== id));
  }

  const openCount = items.filter((item) => item.status !== "Fait").length;
  const visible = [...items]
    .filter((item) => filter === "Tous" || (filter === "Faits" ? item.status === "Fait" : item.status !== "Fait"))
    .sort((a, b) => (a.status === "Fait") - (b.status === "Fait") || String(b.date || "").localeCompare(String(a.date || "")));

  return (
    <section className="fincaOpsCard fincaMaintenance">
      <div className="fincaOpsHeader">
        <div><span className="cortijoPill">ENTRETIEN</span><h4>Réparations & points à surveiller</h4></div>
        <strong>{openCount} ouvert{openCount > 1 ? "s" : ""}</strong>
      </div>
      <p className="fincaOpsHint">Un petit journal pour ne plus perdre les problèmes de maison entre deux séjours : quoi, où, priorité, état et date.</p>
      <form className="fincaMaintenanceForm" onSubmit={add}>
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Problème / intervention : infiltration, fissure, WC…" />
        <input value={form.zone} onChange={(event) => setForm({ ...form, zone: event.target.value })} placeholder="Zone : patio, façade, salle d'eau…" />
        <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>Urgent</option><option>À faire</option><option>Amélioration</option></select>
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Note courte / ce qu'il faut vérifier" />
        <button type="submit">+ Ajouter</button>
      </form>
      <div className="fincaMaintenanceTools"><button type="button" className={filter === "Ouverts" ? "isActive" : ""} onClick={() => setFilter("Ouverts")}>Ouverts</button><button type="button" className={filter === "Faits" ? "isActive" : ""} onClick={() => setFilter("Faits")}>Faits</button><button type="button" className={filter === "Tous" ? "isActive" : ""} onClick={() => setFilter("Tous")}>Tous</button></div>
      <div className="fincaMaintenanceList">
        {visible.length === 0 && <p>Aucun élément dans cette vue.</p>}
        {visible.map((item) => (
          <article key={item.id}>
            <div className="fincaMaintenanceTop"><div><span className="cortijoPill">{item.priority}</span><h5>{item.title}</h5></div><small>{formatDate(item.date)}</small></div>
            <div className="fincaMaintenanceEdit">
              <select value={item.status || "À faire"} onChange={(event) => update(item.id, { status: event.target.value })}><option>À faire</option><option>En cours</option><option>En attente</option><option>Fait</option></select>
              <select value={item.priority || "À faire"} onChange={(event) => update(item.id, { priority: event.target.value })}><option>Urgent</option><option>À faire</option><option>Amélioration</option></select>
              <input value={item.zone || ""} onChange={(event) => update(item.id, { zone: event.target.value })} placeholder="Zone" />
              <input type="date" value={item.date || ""} onChange={(event) => update(item.id, { date: event.target.value })} />
            </div>
            <textarea rows="3" value={item.note || ""} onChange={(event) => update(item.id, { note: event.target.value })} placeholder="Diagnostic, devis, personne à appeler, suite à donner…" />
            <button type="button" className="fincaRemoveSmall" onClick={() => remove(item.id)}>Retirer</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function GlobalStyles() {
  return <style>{`
    .fincaPilotPanel{grid-column:1/-1;border:1px solid rgba(214,169,85,.24);border-radius:18px;padding:.8rem;background:rgba(5,9,7,.5)}.fincaPilotHeading{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem}.fincaPilotHeading strong{display:block;color:#fff3d4;font-size:1.05rem}.fincaPilotHeading span{display:block;margin-top:.12rem;color:#cdb98d;font-size:.8rem}.fincaPilotGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem}.fincaPilotGrid button{min-height:112px;text-align:left;border:1px solid rgba(214,169,85,.18);border-radius:14px;padding:.7rem;background:rgba(0,0,0,.16);color:inherit;cursor:pointer}.fincaPilotGrid button.isAlert{border-color:rgba(239,217,157,.55);background:rgba(214,169,85,.09)}.fincaPilotGrid small{display:block;color:#bfae88;font-size:.68rem;letter-spacing:.08em}.fincaPilotGrid strong{display:block;margin-top:.28rem;color:#fff3d4}.fincaPilotGrid span{display:block;margin-top:.28rem;color:#cdb98d;font-size:.78rem;line-height:1.35}
    .fincaOpsCard{margin:.9rem .8rem 1rem;border:1px solid rgba(214,169,85,.24);border-radius:16px;padding:.85rem;background:rgba(0,0,0,.12)}.fincaOpsHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem}.fincaOpsHeader h4{margin:.35rem 0 0}.fincaOpsHeader>strong{white-space:nowrap;color:#efd99d}.fincaOpsHint{font-size:.84rem;opacity:.8;line-height:1.45}.fincaProgress{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:.7rem 0}.fincaProgress span{display:block;height:100%;background:#efd99d;border-radius:999px}.fincaStayMeta{display:flex;gap:.5rem;align-items:end;flex-wrap:wrap;margin:.65rem 0}.fincaStayMeta label{flex:1;min-width:220px}.fincaStayMeta label span{display:block;font-weight:700;font-size:.8rem;margin-bottom:.25rem}.fincaStayMeta input,.fincaStayMeta button{min-height:42px}.fincaChecklistGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.fincaChecklistGrid>div{border:1px solid rgba(214,169,85,.14);border-radius:12px;padding:.65rem}.fincaChecklistGrid>div>strong{display:block;margin-bottom:.4rem}.fincaChecklistGrid label{display:flex;align-items:flex-start;gap:.5rem;padding:.38rem 0;line-height:1.35}.fincaChecklistGrid label.isDone span{text-decoration:line-through;opacity:.58}.fincaChecklistGrid input{margin-top:.2rem;transform:scale(1.15)}
    .fincaMaintenanceForm{display:grid;grid-template-columns:2fr 1.2fr .8fr 1fr 2fr auto;gap:.45rem;margin:.7rem 0}.fincaMaintenanceForm>*{min-height:42px}.fincaMaintenanceTools{display:flex;gap:.35rem;margin:.6rem 0}.fincaMaintenanceTools button{min-height:36px;border:1px solid rgba(214,169,85,.2);border-radius:999px;padding:.35rem .65rem;background:transparent;color:inherit}.fincaMaintenanceTools button.isActive{background:#efd99d;color:#182019}.fincaMaintenanceList{display:grid;gap:.55rem}.fincaMaintenanceList article{border:1px solid rgba(214,169,85,.14);border-radius:12px;padding:.65rem}.fincaMaintenanceTop{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem}.fincaMaintenanceTop h5{margin:.3rem 0 0;font-size:1rem}.fincaMaintenanceEdit{display:grid;grid-template-columns:1fr 1fr 1.4fr 1fr;gap:.4rem;margin:.55rem 0}.fincaMaintenanceEdit>*{min-height:38px}.fincaMaintenanceList textarea{width:100%;box-sizing:border-box}.fincaRemoveSmall{margin-top:.45rem;min-height:34px;font-size:.78rem}
    @media(max-width:900px){.fincaPilotGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.fincaMaintenanceForm{grid-template-columns:1fr 1fr}.fincaChecklistGrid{grid-template-columns:1fr}.fincaMaintenanceEdit{grid-template-columns:1fr 1fr}}@media(max-width:560px){.fincaPilotGrid{grid-template-columns:1fr}.fincaMaintenanceForm,.fincaMaintenanceEdit{grid-template-columns:1fr}.fincaOpsCard{margin:.75rem 0}.fincaStayMeta{align-items:stretch}.fincaStayMeta button{width:100%}}
  `}</style>;
}

function findTargets() {
  return {
    home: document.querySelector(".fincaHomePulse"),
    maintenance: document.getElementById("fonctionnement"),
    checklist: document.getElementById("menage")
  };
}

export function FincaOperationsMount() {
  const [targets, setTargets] = useState(findTargets);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const resolve = () => {
      const next = findTargets();
      setTargets((current) => current.home === next.home && current.maintenance === next.maintenance && current.checklist === next.checklist ? current : next);
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    const onVisibility = () => { if (!document.hidden) refresh(); };
    window.addEventListener("storage", refresh);
    window.addEventListener(REFRESH_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(REFRESH_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const markBackup = (event) => {
      const button = event.target?.closest?.("button");
      if (!button?.textContent?.includes("Sauvegarder les données")) return;
      if (writeLocal(LAST_BACKUP_KEY, new Date().toISOString())) window.dispatchEvent(new Event(REFRESH_EVENT));
    };
    document.addEventListener("click", markBackup, true);
    return () => document.removeEventListener("click", markBackup, true);
  }, []);

  if (!targets.home && !targets.maintenance && !targets.checklist) return null;

  return (
    <>
      <GlobalStyles />
      {targets.home && createPortal(<HomePilot revision={revision} />, targets.home)}
      {targets.maintenance && createPortal(<MaintenancePanel />, targets.maintenance)}
      {targets.checklist && createPortal(<StayChecklistPanel />, targets.checklist)}
    </>
  );
}
