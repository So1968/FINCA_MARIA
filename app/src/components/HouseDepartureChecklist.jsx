import { useEffect, useState } from "react";
import {
  HOUSE_DEPARTURE_TASKS,
  changeDepartureCheck,
  countDepartureChecks,
  normalizeDepartureChecks
} from "../lib/houseDepartureChecklist.mjs";

const STORAGE_KEY = "finca_maria_maison_depart_checklist_v1";

function readChecks() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeDepartureChecks(raw ? JSON.parse(raw) : {});
  } catch {
    return {};
  }
}

export function HouseDepartureChecklist() {
  const [checks, setChecks] = useState(readChecks);
  const [saveError, setSaveError] = useState(false);
  const count = countDepartureChecks(checks);
  const total = HOUSE_DEPARTURE_TASKS.length;

  useEffect(() => {
    function syncAcrossTabs(event) {
      if (event.key === STORAGE_KEY || event.key === null) {
        setChecks(readChecks());
        setSaveError(false);
      }
    }
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  function store(next) {
    setChecks(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, done: next }));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }

  function reset() {
    if (!window.confirm("Remettre à zéro les étapes de départ pour un prochain séjour ?")) return;
    store({});
  }

  return (
    <section className="fincaDepartureChecklist" aria-label="Checklist du départ">
      <style>{`
        .fincaDepartureChecklist{display:grid;gap:.65rem}
        .fincaDepartureChecklistProgress{margin:0;color:#efd99d;font-weight:800}
        .fincaDepartureChecklistTasks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}
        .fincaDepartureChecklistTasks label{display:flex;align-items:flex-start;gap:.65rem;min-height:54px;padding:.75rem;border:1px solid rgba(214,169,85,.2);border-radius:12px;background:rgba(0,0,0,.12);cursor:pointer;line-height:1.4}
        .fincaDepartureChecklistTasks label.isDone{background:rgba(65,113,74,.22)}
        .fincaDepartureChecklistTasks input{flex:none;accent-color:#efd99d;width:19px;height:19px;margin:.06rem 0 0}
        .fincaDepartureChecklistTasks label.isDone span{text-decoration:line-through;opacity:.75}
        .fincaDepartureChecklistFooter{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}
        .fincaDepartureChecklistFooter small{color:#cdb98d;flex:1;min-width:210px}
        .fincaDepartureChecklistError{margin:0;color:#ffd1c7}
        @media(max-width:760px){.fincaDepartureChecklistTasks{grid-template-columns:1fr}}
      `}</style>
      <p className="fincaDepartureChecklistProgress" role="status">
        {count === total ? "Départ : toutes les étapes ont été cochées." : `${count} étape${count > 1 ? "s" : ""} cochée${count > 1 ? "s" : ""} sur ${total}`}
      </p>
      <div className="fincaDepartureChecklistTasks" role="group" aria-label="Vérifications à effectuer avant le départ">
        {HOUSE_DEPARTURE_TASKS.map((task) => (
          <label className={checks[task.id] ? "isDone" : ""} key={task.id}>
            <input
              type="checkbox"
              checked={Boolean(checks[task.id])}
              onChange={(event) => store(changeDepartureCheck(checks, task.id, event.target.checked))}
            />
            <span>{task.label}</span>
          </label>
        ))}
      </div>
      <div className="fincaDepartureChecklistFooter">
        <small>Les coches sont conservées sur cet appareil. Elles ne prouvent pas qu'une vérification a été faite par tous les membres de la famille.</small>
        <button type="button" className="fincaStayButton" disabled={count === 0} onClick={reset}>
          Réinitialiser pour un autre séjour
        </button>
      </div>
      {saveError && <p className="fincaDepartureChecklistError" role="alert">Impossible d'enregistrer les coches sur cet appareil. Elles risquent d'être perdues en fermant la page.</p>}
    </section>
  );
}
