import { useMemo } from "react";

export const RESPONSIBLE_OPTIONS = ["À déterminer", "Clemencia", "Ana María", "María Isabel", "María José", "Gloria", "Michèle", "José", "Sofía"];
export const STATUS_OPTIONS = ["Action à compléter", "En cours", "En attente", "Action accomplie"];
export const CONTACT_MODE_OPTIONS = ["Téléphone", "WhatsApp", "Mail", "Sur place", "Rendez-vous"];
export const CONTACT_WITH_OPTIONS = ["San Juan", "ASAJA", "Peláez", "Agriculteur / Vitines", "Autre interlocuteur"];

export function actionBucket(status = "Action à compléter") {
  if (status === "Action accomplie" || status === "Terminée") return "done";
  if (["En cours", "En attente", "Attribuée"].includes(status)) return "progress";
  return "todo";
}

export function suggestedContactMode(mode = "") {
  const value = mode.toLowerCase();
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("mail")) return "Mail";
  if (value.includes("rendez")) return "Rendez-vous";
  if (value.includes("sur place") || value.includes("passage")) return "Sur place";
  return "Téléphone";
}

function stop(event) { event.stopPropagation(); }

function SelectChip({ label, value, options, onChange, hideLabel = false }) {
  return (
    <label className="chip" onClick={stop} onKeyDown={stop}>
      {!hideLabel && <span>{label}</span>}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function ActionCard({ action, dossierLabel, assignment, onUpdate }) {
  const responsible = assignment.assignedTo || "À déterminer";
  const status = assignment.status === "Terminée" ? "Action accomplie" : (assignment.status || "Action à compléter");
  const dueAt = assignment.dueAt || "";
  const contactMode = assignment.contactMode || suggestedContactMode(action.mode);
  const contactWith = assignment.contactWith || action.contact || dossierLabel;
  const resolution = assignment.resolution || "";
  const withOptions = useMemo(() => Array.from(new Set([contactWith, action.contact, ...CONTACT_WITH_OPTIONS].filter(Boolean))), [contactWith, action.contact]);
  const responsibleOptions = useMemo(() => Array.from(new Set([responsible, ...RESPONSIBLE_OPTIONS])), [responsible]);
  const statusOptions = useMemo(() => Array.from(new Set([status, ...STATUS_OPTIONS])), [status]);

  return (
    <details className="card action-card">
      <summary>
        <div className="action-head">
          <div className="action-title">
            <h4>{action.title}</h4>
            <small>Action inscrite · 18/08/2026</small>
          </div>
          <span className="pill priority">{action.priority}</span>
        </div>

        <div className="action-controls" onClick={stop} onKeyDown={stop}>
          <SelectChip label="Suivi" value={status} options={statusOptions} onChange={(value) => onUpdate(action.id, { status: value })} hideLabel />
          <label className="chip" onClick={stop} onKeyDown={stop}>
            <span>Échéance</span>
            <input
              type="date"
              value={dueAt}
              aria-label={`Échéance ${action.title}`}
              onClick={(event) => { stop(event); event.currentTarget.showPicker?.(); }}
              onChange={(event) => onUpdate(action.id, { dueAt: event.target.value })}
            />
          </label>
          <SelectChip label="Attribution" value={responsible} options={responsibleOptions} onChange={(value) => onUpdate(action.id, { assignedTo: value })} />
          <SelectChip label="Mode" value={contactMode} options={CONTACT_MODE_OPTIONS} onChange={(value) => onUpdate(action.id, { contactMode: value })} />
          <SelectChip label="Avec" value={contactWith} options={withOptions} onChange={(value) => onUpdate(action.id, { contactWith: value })} />
          <span className="open-hint">Ouvrir ⌄</span>
        </div>
      </summary>

      <div className="action-expanded">
        <p><strong>But :</strong> {action.goal}</p>
        <label className="resolution">
          <span>Résolution / résultat obtenu</span>
          <textarea rows="4" value={resolution} placeholder="Rendez-vous obtenu, réponse reçue, document récupéré, décision prise…" onChange={(e) => onUpdate(action.id, { resolution: e.target.value })} />
        </label>
        {action.toObtain?.length > 0 && <div><strong>À obtenir / à faire</strong><ul>{action.toObtain.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        {action.expectedProof && <p><strong>Résultat attendu :</strong> {action.expectedProof}</p>}
        {(action.contactHint || action.script) && (
          <details className="details-useful">
            <summary>Détails utiles</summary>
            {action.contactHint && <p><strong>À savoir :</strong> {action.contactHint}</p>}
            {action.script && <><strong>{action.scriptLabel || "Texte à lire / utiliser"}</strong><p>{action.script}</p></>}
          </details>
        )}
      </div>
    </details>
  );
}
