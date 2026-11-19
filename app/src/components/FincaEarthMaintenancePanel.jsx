import { useMemo, useState } from "react";
import { maintenanceSources, oliveMaintenancePlan } from "../data/oliveMaintenancePlan.js";
import { actionsUrl } from "../lib/actionAssignments.mjs";
import { EARTH_MAINTENANCE_KEY as STORAGE_KEY, changeEarthField, earthConflicts, emptyEarthTracking, hasEarthChanges, mergeEarthChanges, validEarthTracking } from "../lib/earthMaintenance.mjs";
import { readHouseData } from "../lib/houseData.mjs";
import { HOUSE_STORAGE_EVENT, useHouseStorage } from "../lib/useHouseStorage";
import { HouseHistory, HouseRecovery, HouseSaveState, useHouseDraft } from "./house/HouseUI";

const STATUSES = ["À demander", "À décider après diagnostic", "Prévu", "Fait déclaré", "Prouvé par justificatif", "Sans intervention"];
const PARCELS = ["À préciser", "25", "27", "25 et 27", "Autres cultures"];


function campaignYears() {
  const now = new Date();
  const first = now.getMonth() >= 10 ? now.getFullYear() : now.getFullYear() - 1;
  return [first - 1, first, first + 1];
}


export function FincaEarthMaintenancePanel() {
  const years = useMemo(campaignYears, []);
  const [season, setSeason] = useState(`${years[1]}/${years[1] + 1}`);
  const store = useHouseStorage(STORAGE_KEY, emptyEarthTracking());
  const { markDraft } = useHouseDraft();
  const [changes, setChanges] = useState({});
  const [saveError, setSaveError] = useState(false);
  const readError = store.readError || !validEarthTracking(store.value);
  const source = readError ? emptyEarthTracking() : store.value;
  const draft = mergeEarthChanges(source, changes);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Tout");
  const entries = draft.campaigns?.[season] || {};
  const pending = hasEarthChanges(changes);
  const campaignOptions = [...new Set([...years.map(item => `${item}/${item + 1}`), ...Object.keys(source.campaigns)])].sort();
  const categories = ["Tout", ...new Set(oliveMaintenancePlan.map((item) => item.category))];
  const visible = category === "Tout" ? oliveMaintenancePlan : oliveMaintenancePlan.filter((item) => item.category === category);
  const documented = Object.values(entries).filter((item) => item?.status === "Prouvé par justificatif").length;
  const knownIds = new Set(oliveMaintenancePlan.map(item => item.id));
  const legacy = Object.entries(entries).filter(([id]) => !knownIds.has(id));

  function patch(id, field, value) {
    if (readError) return;
    const next = changeEarthField(source, changes, season, id, field, value);
    setChanges(next); markDraft(hasEarthChanges(next));
    setMessage("Modifications non enregistrées : appuyer sur Enregistrer.");
  }

  function persist() {
    try {
      const latest = readHouseData(localStorage, STORAGE_KEY, emptyEarthTracking());
      if (latest.error || !validEarthTracking(latest.value)) { setMessage("Lecture impossible : suivi conservé, enregistrement bloqué."); return; }
      if (earthConflicts(latest.value, changes).length && !window.confirm("Une autre personne a modifié les mêmes champs. Conserver votre saisie à leur place ? La version précédente restera dans l’historique.")) { setMessage("Votre saisie est conservée dans le formulaire ; la version reçue n’a pas été remplacée."); return; }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeEarthChanges(latest.value, changes, true)));
      setChanges({}); markDraft(false); setSaveError(false);
      window.dispatchEvent(new Event(HOUSE_STORAGE_EVENT));
      setMessage("Suivi enregistré sur cet appareil. Synchronisation familiale selon la connexion FINCA MARIA.");
    } catch {
      setSaveError(true);
      setMessage("Échec de l'enregistrement. Conservez la page et vérifiez le stockage.");
    }
  }

  return (
    <section className="fincaEarthMaintenance" aria-label="Calendrier d'entretien de la terre">
      <style>{`
        .fincaEarthMaintenance{padding:.9rem;color:inherit}
        .fincaEarthMaintenance h4{margin:.2rem 0 .5rem;color:#f8e8b7}
        .fincaEarthMaintenance p{line-height:1.5}
        .fincaEarthMaintenance .intro{border:1px solid rgba(214,169,85,.25);border-radius:14px;padding:.8rem;background:rgba(214,169,85,.05)}
        .fincaEarthMaintenance .tools{display:flex;align-items:center;flex-wrap:wrap;gap:.6rem;margin:1rem 0}
        .fincaEarthMaintenance select,.fincaEarthMaintenance input,.fincaEarthMaintenance textarea{width:100%;box-sizing:border-box;min-height:40px;padding:.55rem;border:1px solid rgba(214,169,85,.33);border-radius:9px;background:#18221b;color:#fff1ca;font:inherit}
        .fincaEarthMaintenance .tools select{width:auto;max-width:100%}
        .fincaEarthMaintenance button,.fincaEarthMaintenance .cta{min-height:42px;padding:.55rem .75rem;border:1px solid #bd9d56;border-radius:10px;background:#ead4a2;color:#152019;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}
        .fincaEarthMaintenance button[disabled]{opacity:.6;cursor:not-allowed}
        .fincaEarthMaintenance .status{font-size:.84rem;color:#e9d6a8}
        .fincaEarthMaintenance .tasks{display:grid;gap:.65rem;margin:1rem 0}
        .fincaEarthMaintenance .task{border:1px solid rgba(214,169,85,.28);border-radius:12px;background:rgba(0,0,0,.13)}
        .fincaEarthMaintenance .task summary{display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem;padding:.85rem;cursor:pointer;list-style:none}
        .fincaEarthMaintenance .task summary::-webkit-details-marker{display:none}
        .fincaEarthMaintenance .task strong{display:block;font-size:.97rem}
        .fincaEarthMaintenance .task small{display:block;margin-top:.3rem;color:#cfbc94}
        .fincaEarthMaintenance .state{padding:.26rem .45rem;border:1px solid rgba(214,169,85,.36);border-radius:8px;white-space:nowrap;font-size:.72rem;color:#efd99d}
        .fincaEarthMaintenance .taskBody{padding:0 .85rem .9rem}
        .fincaEarthMaintenance .taskBody p{margin:.6rem 0}
        .fincaEarthMaintenance .formGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin-top:.75rem}
        .fincaEarthMaintenance label{display:block;font-size:.82rem;font-weight:700}
        .fincaEarthMaintenance label>*{display:block;margin-top:.25rem}
        .fincaEarthMaintenance textarea{resize:vertical;min-height:78px}
        .fincaEarthMaintenance a{color:#f3d88e}
        @media(max-width:620px){.fincaEarthMaintenance{padding:.25rem}.fincaEarthMaintenance .formGrid{grid-template-columns:1fr}.fincaEarthMaintenance .task summary{flex-wrap:wrap}}
      `}</style>

      <div className="intro">
        <h4>Entretien des oliviers — programme provisoire</h4>
        <p>Parcelles 25 et 27, polygone 185, Villanueva del Rosario. Le calendrier indique <strong>quand poser les questions à Vitines</strong> et ce que l'ingénieur agronome doit confirmer sur place. Il ne prouve aucune intervention passée et ne prescrit aucun produit ni dosage.</p>
        <p><strong>Étape préalable :</strong> visite technique indépendante, photos datées, recommandations écrites sur les 12 prochains mois.</p>
        <a href={actionsUrl(window.location.href, { contact: "asaja", filter: "all", dossier: true })} className="cta">Préparer la demande de visite — interlocuteur à confirmer</a>
      </div>

      <HouseSaveState store={{ ...store, readError, saveError, retry: persist }} />

      <div className="tools">
        <label>Campagne
          <select aria-label="Campagne" value={season} onChange={event => setSeason(event.target.value)}>
            {campaignOptions.map(item => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label>Thème
          <select aria-label="Thème" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <span className="status">{documented} travail{documented > 1 ? "aux" : ""} avec justificatif sur cette campagne</span>
        <button type="button" onClick={persist} disabled={readError || (!pending && !saveError)}>Enregistrer mon suivi</button>
      </div>
      {message && <p className="status" role="status">{message}</p>}
      <div className="tasks">
        {visible.map((item) => {
          const record = entries[item.id] || {};
          return (
            <details className="task" key={item.id}>
              <summary>
                <span><strong>{item.title}</strong><small>{item.periode} · {item.category}</small></span>
                <span className="state">{record.status || "À demander"}</span>
              </summary>
              <div className="taskBody">
                <p><strong>À examiner :</strong> {item.action}</p>
                <p><strong>À demander à Vitines :</strong> {item.vitines}</p>
                <p><strong>Validation de l'ingénieur :</strong> {item.validation}</p>
                <p><strong>Preuve attendue :</strong> {item.evidence}</p>
                <fieldset className="formGrid" disabled={readError} style={{ border: 0, padding: 0, margin: 0 }}>
                  <label>Statut
                    <select value={record.status || "À demander"} onChange={(event) => patch(item.id, "status", event.target.value)}>
                      {[...new Set([...STATUSES, record.status].filter(Boolean))].map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <label>Parcelle ou zone
                    <select value={record.parcel || "À préciser"} onChange={(event) => patch(item.id, "parcel", event.target.value)}>
                      {[...new Set([...PARCELS, record.parcel].filter(Boolean))].map((parcel) => <option key={parcel}>{parcel}</option>)}
                    </select>
                  </label>
                  <label>Date réelle de l'intervention
                    <input type="date" value={record.actualDate || ""} onChange={(event) => patch(item.id, "actualDate", event.target.value)} />
                  </label>
                  <label>Réalisé par
                    <input value={record.operator || ""} onChange={(event) => patch(item.id, "operator", event.target.value)} placeholder="Vitines, autre prestataire…" />
                  </label>
                  <label>Ce que Vitines a répondu / a déclaré avoir fait
                    <textarea rows="3" value={record.farmerNote || ""} onChange={(event) => patch(item.id, "farmerNote", event.target.value)} placeholder="Date de l'échange, intervention, produit et dose déclarés…" />
                  </label>
                  <label>Avis ou prescription de l'ingénieur
                    <textarea rows="3" value={record.engineerNote || ""} onChange={(event) => patch(item.id, "engineerNote", event.target.value)} placeholder="Date de la visite, recommandation écrite, réserves…" />
                  </label>
                  <label>Justificatif / référence dans le BAÚL
                    <input value={record.evidence || ""} onChange={(event) => patch(item.id, "evidence", event.target.value)} placeholder="Facture, photo, rapport, ticket…" />
                  </label>
                  <label>Produits, doses, quantités ou remarques
                    <textarea rows="3" value={record.notes || ""} onChange={(event) => patch(item.id, "notes", event.target.value)} placeholder="Ne reporter que les informations reçues ou vérifiées…" />
                  </label>
                </fieldset>
                <HouseHistory item={record} />
                <small>Base documentaire : {item.sources}. « Fait déclaré » ne vaut jamais « Prouvé par justificatif ».</small>
              </div>
            </details>
          );
        })}
      </div>
      <button type="button" onClick={persist} disabled={readError || (!pending && !saveError)}>Enregistrer mon suivi</button>
      <HouseRecovery />
      {legacy.length > 0 && <details><summary>Autres suivis conservés pour cette campagne ({legacy.length})</summary>
        {legacy.map(([id, record]) => <article key={id}><h5>{id}</h5><dl>{Object.entries(record).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>)}</dl></article>)}
      </details>}
      <p className="status">Les réponses des prestataires, avis techniques et preuves sont à enregistrer sur chaque campagne. La synchronisation entre appareils n'est effective que lorsque FINCA MARIA est connectée et synchronisée.</p>
      <details><summary>Sources techniques officielles (IFAPA / RAIF)</summary><ul>{maintenanceSources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></details>
    </section>
  );
}
