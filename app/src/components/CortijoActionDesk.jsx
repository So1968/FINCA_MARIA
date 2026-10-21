import { useEffect, useMemo, useState } from "react";
import { cortijoActionDesk } from "../data/cortijoActionDesk";

const LOGS_STORAGE_KEY = "cortijo_action_logs_v1";
const FACTS_STORAGE_KEY = "cortijo_action_facts_v1";
const FOLLOWUPS_STORAGE_KEY = "cortijo_followups_v1";
const ASSIGNMENTS_STORAGE_KEY = "cortijo_action_assignments_v1";
const CONTACTS_STORAGE_KEY = "cortijo_action_contacts_v1";
const TEAM_STORAGE_KEY = "cortijo_team_v1";
const MISSIONS_STORAGE_KEY = "cortijo_custom_missions_v1";
const NOTIFICATIONS_STORAGE_KEY = "cortijo_notification_stamps_v1";

const DEFAULT_TEAM = [
  { id: "team-sofia", name: "Sofia", email: "", phone: "", whatsapp: "" }
];

function loadObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function loadArray(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function emptyEntry(defaultAssignee = "Sofia") {
  return {
    contactedAt: localToday(),
    channel: "Téléphone",
    answerer: "",
    recordedBy: "Sofia",
    response: "",
    nextStep: "",
    nextStepDate: "",
    nextAssignee: defaultAssignee,
    documentReceived: "Non",
    documentRef: ""
  };
}

function emptyMission(defaultAssignee = "À attribuer") {
  return {
    title: "",
    category: "Travaux terre",
    assignedTo: defaultAssignee,
    dueAt: "",
    notifyAt: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactWhatsapp: "",
    instructions: "",
    priority: "Normal"
  };
}

function evidenceStatus(documentReceived) {
  if (documentReceived === "Oui") {
    return "Réponse enregistrée + document signalé reçu — contenu à valider dans le BAÚL";
  }
  if (documentReceived === "Partiellement") {
    return "Réponse enregistrée + preuve partielle — à compléter";
  }
  return "Déclaration enregistrée — à confirmer par une pièce";
}

function cleanPhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function nextDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function icsEscape(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCalendar(item) {
  if (!item.dueAt) return;
  const start = item.dueAt.replaceAll("-", "");
  const end = nextDate(item.dueAt);
  const description = [
    item.category ? `Catégorie : ${item.category}` : "",
    item.assignedTo ? `Mission confiée à : ${item.assignedTo}` : "",
    item.contact ? `Interlocuteur / prévenir : ${item.contact}` : "",
    item.notifyAt ? `Prévenir à partir du : ${item.notifyAt}` : "",
    item.instructions || "",
    "Source : FINCA MARIA"
  ].filter(Boolean).join("\n");

  const event = [
    "BEGIN:VEVENT",
    `UID:${item.id}@cortijo-alemanes`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(item.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P7D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Dans 7 jours : ${item.title}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P3D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Dans 3 jours : ${item.title}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Demain : ${item.title}`)}`,
    "END:VALARM",
    "END:VEVENT"
  ].join("\r\n");

  const extraEvent = item.notifyAt && item.notifyAt !== item.dueAt
    ? [
        "BEGIN:VEVENT",
        `UID:${item.id}-prevenir@cortijo-alemanes`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
        `DTSTART;VALUE=DATE:${item.notifyAt.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${nextDate(item.notifyAt)}`,
        `SUMMARY:${icsEscape(`Prévenir — ${item.title}`)}`,
        `DESCRIPTION:${icsEscape(item.contact ? `Contacter : ${item.contact}` : "Préparer la mission")}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsEscape(`Demain : prévenir pour ${item.title}`)}`,
        "END:VALARM",
        "END:VEVENT"
      ].join("\r\n")
    : "";

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Azoth Studio//Finca Maria//FR",
    "CALSCALE:GREGORIAN",
    event,
    extraEvent,
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");

  downloadText(`FINCA_MARIA_${item.dueAt}_${item.id}.ics`, calendar, "text/calendar;charset=utf-8");
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const today = new Date(`${localToday()}T12:00:00`);
  const target = new Date(`${dateString}T12:00:00`);
  return Math.round((target - today) / 86400000);
}

function urgencyLabel(dateString) {
  const days = daysUntil(dateString);
  if (days === null) return "Sans date";
  if (days < 0) return `En retard de ${Math.abs(days)} j`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days <= 3) return `Dans ${days} jours`;
  if (days <= 7) return `Cette semaine · J-${days}`;
  return `J-${days}`;
}

function urgencyClass(dateString) {
  const days = daysUntil(dateString);
  if (days === null) return "isUndated";
  if (days < 0) return "isLate";
  if (days === 0) return "isToday";
  if (days <= 3) return "isSoon";
  return "";
}

function sortAgenda(items) {
  return [...items].sort((a, b) => {
    if (a.status === "Fait" && b.status !== "Fait") return 1;
    if (a.status !== "Fait" && b.status === "Fait") return -1;
    if (!a.dueAt && b.dueAt) return 1;
    if (a.dueAt && !b.dueAt) return -1;
    return String(a.dueAt || a.createdAt || "9999").localeCompare(String(b.dueAt || b.createdAt || "9999"));
  });
}

function mergeById(current, incoming) {
  const map = new Map();
  [...current, ...incoming].forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

function teamMember(team, name) {
  return team.find((member) => member.name === name);
}

function assignmentMessage(item) {
  return [
    "FINCA MARIA",
    `Mission : ${item.title}`,
    item.assignedTo ? `Confiée à : ${item.assignedTo}` : "",
    item.dueAt ? `À faire pour le : ${item.dueAt}` : "",
    item.notifyAt ? `Prévenir / commencer le : ${item.notifyAt}` : "",
    item.contact ? `Interlocuteur : ${item.contact}` : "",
    item.instructions ? `Consigne : ${item.instructions}` : ""
  ].filter(Boolean).join("\n");
}

function TeamPanel({ team, setTeam }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", whatsapp: "" });

  function addMember(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const next = [
      ...team.filter((member) => member.name.toLowerCase() !== name.toLowerCase()),
      { id: `team-${Date.now()}`, name, email: form.email.trim(), phone: form.phone.trim(), whatsapp: form.whatsapp.trim() }
    ];
    setTeam(next);
    save(TEAM_STORAGE_KEY, next);
    setForm({ name: "", email: "", phone: "", whatsapp: "" });
  }

  function updateMember(id, field, value) {
    const next = team.map((member) => member.id === id ? { ...member, [field]: value } : member);
    setTeam(next);
    save(TEAM_STORAGE_KEY, next);
  }

  return (
    <details className="actionTeamPanel">
      <summary>Équipe familiale — qui peut prendre une mission ? ({team.length})</summary>
      <div className="actionTeamGrid">
        {team.map((member) => (
          <article key={member.id}>
            <strong>{member.name}</strong>
            <label>Email<input value={member.email} onChange={(event) => updateMember(member.id, "email", event.target.value)} placeholder="adresse@email…" /></label>
            <label>Téléphone<input value={member.phone} onChange={(event) => updateMember(member.id, "phone", event.target.value)} placeholder="+33… / +34…" /></label>
            <label>WhatsApp<input value={member.whatsapp} onChange={(event) => updateMember(member.id, "whatsapp", event.target.value)} placeholder="numéro WhatsApp" /></label>
          </article>
        ))}
      </div>
      <form className="actionTeamAdd" onSubmit={addMember}>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ajouter un frère / une sœur…" />
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Téléphone" />
        <input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="WhatsApp" />
        <button type="submit">+ Ajouter à l'équipe</button>
      </form>
    </details>
  );
}

function ActionCard({ action, logs, team, assignment, contactDetails, onAssignmentChange, onContactChange, onAddLog }) {
  const defaultAssignee = assignment?.assignedTo && assignment.assignedTo !== "À attribuer" ? assignment.assignedTo : (team[0]?.name || "Sofia");
  const [entry, setEntry] = useState(() => emptyEntry(defaultAssignee));
  const [showRecord, setShowRecord] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(action.script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  function update(field, value) {
    setEntry((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!entry.response.trim()) return;

    onAddLog(action, {
      ...entry,
      id: `${action.id}-${Date.now()}`,
      response: entry.response.trim(),
      answerer: entry.answerer.trim() || "Non précisé",
      recordedBy: entry.recordedBy.trim() || "Non précisé",
      nextStep: entry.nextStep.trim(),
      nextAssignee: entry.nextAssignee || "À attribuer",
      documentRef: entry.documentRef.trim()
    });

    setEntry(emptyEntry(defaultAssignee));
    setShowRecord(false);
  }

  const latest = logs[0];
  const status = assignment?.status === "Fait"
    ? "Mission faite"
    : latest
      ? (latest.documentReceived === "Oui" ? "Document reçu" : "Réponse enregistrée")
      : "À faire";

  const phone = contactDetails?.phone || "";
  const email = contactDetails?.email || "";
  const whatsapp = contactDetails?.whatsapp || "";
  const waNumber = cleanPhone(whatsapp || phone);
  const whatsappHref = `https://wa.me/${waNumber ? waNumber : ""}?text=${encodeURIComponent(action.script)}`;
  const emailHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(`Finca Maria — ${action.title}`)}&body=${encodeURIComponent(action.script)}`
    : "";

  return (
    <article className="actionDeskCard">
      <div className="actionDeskCardTop">
        <div>
          <span className="actionCategory">{action.category}</span>
          <span className="actionPriority">{action.priority}</span>
        </div>
        <span className={`actionStatus ${assignment?.status === "Fait" ? "isDone" : latest ? "isAnswered" : ""}`}>{status}</span>
      </div>

      <h4>{action.title}</h4>

      <div className="actionAssignmentBar">
        <label>
          Mission confiée à
          <select value={assignment?.assignedTo || "À attribuer"} onChange={(event) => onAssignmentChange(action.id, "assignedTo", event.target.value)}>
            <option>À attribuer</option>
            {team.map((member) => <option key={member.id}>{member.name}</option>)}
          </select>
        </label>
        <label>
          Date cible
          <input type="date" value={assignment?.dueAt || ""} onChange={(event) => onAssignmentChange(action.id, "dueAt", event.target.value)} />
        </label>
        <div className={`actionReminderBadge ${urgencyClass(assignment?.dueAt)}`}>
          <span>Rappel</span>
          <strong>{urgencyLabel(assignment?.dueAt)}</strong>
        </div>
        <button type="button" onClick={() => onAssignmentChange(action.id, "status", assignment?.status === "Fait" ? "À faire" : "Fait")}>
          {assignment?.status === "Fait" ? "Rouvrir" : "Mission faite"}
        </button>
      </div>

      <div className="actionContactBlock">
        <span>À qui je m'adresse</span>
        <strong>{action.contact}</strong>
        <small>{action.contactHint}</small>
        <em>{action.mode}</em>
        <div className="actionContactButtons">
          {phone && <a href={`tel:${phone}`}>📞 Appeler</a>}
          {emailHref && <a href={emailHref}>✉️ Email prêt</a>}
          <a href={whatsappHref} target="_blank" rel="noreferrer">💬 WhatsApp</a>
        </div>
        <details className="actionContactDetails">
          <summary>Coordonnées de cet interlocuteur</summary>
          <div>
            <input value={phone} onChange={(event) => onContactChange(action.id, "phone", event.target.value)} placeholder="Téléphone" />
            <input value={email} onChange={(event) => onContactChange(action.id, "email", event.target.value)} placeholder="Email" />
            <input value={whatsapp} onChange={(event) => onContactChange(action.id, "whatsapp", event.target.value)} placeholder="WhatsApp" />
          </div>
        </details>
      </div>

      <div className="actionGoal">
        <span>Pourquoi j'appelle</span>
        <p>{action.goal}</p>
      </div>

      <details className="actionChecklistDetails">
        <summary>Ce que je dois obtenir</summary>
        <ul>
          {action.toObtain.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </details>

      <div className="actionScriptBlock">
        <div className="actionScriptTitle">
          <strong>{action.scriptLabel}</strong>
          <button type="button" onClick={copyScript}>{copied ? "Copié" : "Copier le texte"}</button>
        </div>
        <p>{action.script}</p>
      </div>

      <div className="actionExpectedProof">
        <span>À ramener dans FINCA MARIA</span>
        <strong>{action.expectedProof}</strong>
      </div>

      {assignment?.dueAt && (
        <button type="button" className="actionCalendarButton" onClick={() => downloadCalendar({
          id: `action-${action.id}`,
          title: action.title,
          dueAt: assignment.dueAt,
          category: action.category,
          assignedTo: assignment.assignedTo,
          contact: action.contact,
          instructions: action.goal
        })}>
          📅 Ajouter au calendrier · rappels J-7 / J-3 / J-1
        </button>
      )}

      <button type="button" className="actionRecordButton" onClick={() => setShowRecord((value) => !value)}>
        {showRecord ? "Fermer la saisie" : "+ Enregistrer la réponse obtenue"}
      </button>

      {showRecord && (
        <form className="actionResponseForm" onSubmit={submit}>
          <div className="actionFormRow">
            <label>
              Date de l'échange
              <input type="date" value={entry.contactedAt} onChange={(event) => update("contactedAt", event.target.value)} />
            </label>
            <label>
              Moyen
              <select value={entry.channel} onChange={(event) => update("channel", event.target.value)}>
                <option>Téléphone</option>
                <option>Sur place</option>
                <option>Email</option>
                <option>WhatsApp</option>
                <option>Autre</option>
              </select>
            </label>
          </div>

          <div className="actionFormRow">
            <label>
              Réponse donnée par
              <input value={entry.answerer} onChange={(event) => update("answerer", event.target.value)} placeholder="Nom + fonction si connue" />
            </label>
            <label>
              Saisie dans FINCA MARIA par
              <select value={entry.recordedBy} onChange={(event) => update("recordedBy", event.target.value)}>
                {team.map((member) => <option key={member.id}>{member.name}</option>)}
                <option>Autre</option>
              </select>
            </label>
          </div>

          <label>
            Réponse obtenue
            <textarea value={entry.response} onChange={(event) => update("response", event.target.value)} placeholder="Écrire ici exactement ce qu'on vous a répondu…" rows="5" />
          </label>

          <div className="actionFormRow">
            <label>
              Suite à faire
              <input value={entry.nextStep} onChange={(event) => update("nextStep", event.target.value)} placeholder="Ex. rappeler Mme X, récupérer le dossier…" />
            </label>
            <label>
              Quand ?
              <input type="date" value={entry.nextStepDate} onChange={(event) => update("nextStepDate", event.target.value)} />
            </label>
          </div>

          <label>
            À qui confier cette suite ?
            <select value={entry.nextAssignee} onChange={(event) => update("nextAssignee", event.target.value)}>
              <option>À attribuer</option>
              {team.map((member) => <option key={member.id}>{member.name}</option>)}
            </select>
          </label>

          <div className="actionFormRow">
            <label>
              Document récupéré ?
              <select value={entry.documentReceived} onChange={(event) => update("documentReceived", event.target.value)}>
                <option>Non</option>
                <option>Oui</option>
                <option>Partiellement</option>
              </select>
            </label>
            <label>
              Nom / repère du document
              <input value={entry.documentRef} onChange={(event) => update("documentRef", event.target.value)} placeholder="Ex. accusé PAC 2026, PDF reçu par mail…" />
            </label>
          </div>

          <div className="actionAutoMemoryNote">
            <strong>À l'enregistrement</strong>
            <span>La réponse devient un repère de mémoire. La suite devient automatiquement une mission datée et attribuée.</span>
          </div>

          <button type="submit" className="actionSaveButton">Enregistrer la réponse</button>
        </form>
      )}

      {logs.length > 0 && (
        <details className="actionHistory">
          <summary>Historique des réponses ({logs.length})</summary>
          <div className="actionHistoryList">
            {logs.map((log) => (
              <article key={log.id}>
                <div>
                  <strong>{log.contactedAt}</strong>
                  <span>{log.channel}</span>
                </div>
                <p>{log.response}</p>
                <dl>
                  <div><dt>Réponse donnée par</dt><dd>{log.answerer}</dd></div>
                  <div><dt>Saisie par</dt><dd>{log.recordedBy}</dd></div>
                  <div><dt>Document</dt><dd>{log.documentReceived}{log.documentRef ? ` — ${log.documentRef}` : ""}</dd></div>
                  {log.nextStep && <div><dt>Suite</dt><dd>{log.nextStep}{log.nextStepDate ? ` — ${log.nextStepDate}` : ""}{log.nextAssignee ? ` · ${log.nextAssignee}` : ""}</dd></div>}
                </dl>
              </article>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

function MissionComposer({ team, onAddMission }) {
  const [mission, setMission] = useState(() => emptyMission(team[0]?.name || "À attribuer"));

  useEffect(() => {
    if (mission.assignedTo === "À attribuer" && team.length === 1) {
      setMission((current) => ({ ...current, assignedTo: team[0].name }));
    }
  }, [team, mission.assignedTo]);

  function submit(event) {
    event.preventDefault();
    if (!mission.title.trim()) return;
    onAddMission({
      ...mission,
      id: `mission-${Date.now()}`,
      title: mission.title.trim(),
      contactName: mission.contactName.trim(),
      instructions: mission.instructions.trim(),
      createdAt: localToday(),
      status: "À faire"
    });
    setMission(emptyMission(team[0]?.name || "À attribuer"));
  }

  function template(category, title) {
    setMission((current) => ({ ...current, category, title }));
  }

  return (
    <details className="actionMissionComposer">
      <summary>+ Ajouter une mission / un travail à faire</summary>
      <div className="actionMissionTemplates">
        <button type="button" onClick={() => template("Travaux terre", "")}>Travail sur la terre</button>
        <button type="button" onClick={() => template("Terrain", "")}>Observation terrain</button>
        <button type="button" onClick={() => template("Appel", "")}>Appel / démarche</button>
        <button type="button" onClick={() => template("Document", "")}>Document à récupérer</button>
      </div>
      <form onSubmit={submit} className="actionMissionForm">
        <label className="wide">Mission<input value={mission.title} onChange={(event) => setMission({ ...mission, title: event.target.value })} placeholder="Ex. faire le broyage de la parcelle 27…" /></label>
        <label>Catégorie<select value={mission.category} onChange={(event) => setMission({ ...mission, category: event.target.value })}><option>Travaux terre</option><option>Terrain</option><option>PAC</option><option>Coopérative</option><option>Appel</option><option>Document</option><option>Maison</option><option>Famille</option><option>Autre</option></select></label>
        <label>Confiée à<select value={mission.assignedTo} onChange={(event) => setMission({ ...mission, assignedTo: event.target.value })}><option>À attribuer</option>{team.map((member) => <option key={member.id}>{member.name}</option>)}</select></label>
        <label>Date prévue<input type="date" value={mission.dueAt} onChange={(event) => setMission({ ...mission, dueAt: event.target.value })} /></label>
        <label>Prévenir à partir du<input type="date" value={mission.notifyAt} onChange={(event) => setMission({ ...mission, notifyAt: event.target.value })} /></label>
        <label>Qui prévenir<input value={mission.contactName} onChange={(event) => setMission({ ...mission, contactName: event.target.value })} placeholder="Prestataire, coop, famille…" /></label>
        <label>Priorité<select value={mission.priority} onChange={(event) => setMission({ ...mission, priority: event.target.value })}><option>Normal</option><option>Important</option><option>Urgent</option></select></label>
        <label>Téléphone<input value={mission.contactPhone} onChange={(event) => setMission({ ...mission, contactPhone: event.target.value })} placeholder="Numéro à appeler" /></label>
        <label>Email<input value={mission.contactEmail} onChange={(event) => setMission({ ...mission, contactEmail: event.target.value })} placeholder="Email" /></label>
        <label>WhatsApp<input value={mission.contactWhatsapp} onChange={(event) => setMission({ ...mission, contactWhatsapp: event.target.value })} placeholder="Numéro WhatsApp" /></label>
        <label className="wide">Consigne<textarea rows="3" value={mission.instructions} onChange={(event) => setMission({ ...mission, instructions: event.target.value })} placeholder="Ce qu'il faut faire, demander, vérifier ou apporter…" /></label>
        <button type="submit">Créer la mission</button>
      </form>
    </details>
  );
}

function AgendaPanel({ items, team, onToggle, onDelete }) {
  const openItems = sortAgenda(items).filter((item) => item.status !== "Fait");
  const doneItems = sortAgenda(items).filter((item) => item.status === "Fait");

  function shareLinks(item) {
    const member = teamMember(team, item.assignedTo);
    const message = assignmentMessage(item);
    const waNumber = cleanPhone(member?.whatsapp || member?.phone || "");
    return {
      whatsapp: `https://wa.me/${waNumber ? waNumber : ""}?text=${encodeURIComponent(message)}`,
      email: member?.email ? `mailto:${member.email}?subject=${encodeURIComponent(`FINCA MARIA — ${item.title}`)}&body=${encodeURIComponent(message)}` : ""
    };
  }

  return (
    <section className="actionAgendaPanel">
      <div className="actionAgendaHeading">
        <div>
          <span className="cortijoEyebrow">Agenda opérationnel</span>
          <h4>Qui fait quoi, quand, et qui faut-il prévenir ?</h4>
        </div>
        <strong>{openItems.length}</strong>
      </div>

      <div className="actionAgendaList">
        {openItems.length === 0 && <p className="actionEmpty">Aucune mission ouverte.</p>}
        {openItems.map((item) => {
          const links = shareLinks(item);
          return (
            <article key={item.id} className={urgencyClass(item.dueAt)}>
              <div className="actionAgendaDate">
                <strong>{item.dueAt || "Sans date"}</strong>
                <span>{urgencyLabel(item.dueAt)}</span>
                {item.notifyAt && <small>Prévenir : {item.notifyAt}</small>}
              </div>
              <div className="actionAgendaMain">
                <div className="actionAgendaTags"><span>{item.category}</span><span>{item.assignedTo || "À attribuer"}</span>{item.priority && <span>{item.priority}</span>}</div>
                <h5>{item.title}</h5>
                {item.contact && <p><b>À prévenir / contacter :</b> {item.contact}</p>}
                {item.instructions && <p>{item.instructions}</p>}
                <div className="actionAgendaButtons">
                  {item.phone && <a href={`tel:${item.phone}`}>📞 Appeler</a>}
                  {item.email && <a href={`mailto:${item.email}?subject=${encodeURIComponent(`FINCA MARIA — ${item.title}`)}&body=${encodeURIComponent(assignmentMessage(item))}`}>✉️ Email</a>}
                  <a href={item.whatsapp ? `https://wa.me/${cleanPhone(item.whatsapp)}?text=${encodeURIComponent(assignmentMessage(item))}` : links.whatsapp} target="_blank" rel="noreferrer">💬 WhatsApp</a>
                  {links.email && <a href={links.email}>✉️ Envoyer à {item.assignedTo}</a>}
                  {item.dueAt && <button type="button" onClick={() => downloadCalendar(item)}>📅 Calendrier + rappels</button>}
                  <button type="button" onClick={() => onToggle(item)}>✓ Fait</button>
                  {item.kind === "custom" && <button type="button" onClick={() => onDelete(item.id)}>Supprimer</button>}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {doneItems.length > 0 && (
        <details className="actionDoneList">
          <summary>Missions terminées ({doneItems.length})</summary>
          {doneItems.map((item) => (
            <article key={item.id}>
              <span>{item.dueAt || item.createdAt || ""}</span>
              <strong>{item.title}</strong>
              <small>{item.assignedTo || ""}</small>
              <button type="button" onClick={() => onToggle(item)}>Rouvrir</button>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}

export function CortijoActionDesk() {
  const [logsByAction, setLogsByAction] = useState(() => loadObject(LOGS_STORAGE_KEY));
  const [facts, setFacts] = useState(() => loadArray(FACTS_STORAGE_KEY));
  const [followUps, setFollowUps] = useState(() => loadArray(FOLLOWUPS_STORAGE_KEY));
  const [assignments, setAssignments] = useState(() => loadObject(ASSIGNMENTS_STORAGE_KEY));
  const [contacts, setContacts] = useState(() => loadObject(CONTACTS_STORAGE_KEY));
  const [team, setTeam] = useState(() => loadArray(TEAM_STORAGE_KEY, DEFAULT_TEAM));
  const [customMissions, setCustomMissions] = useState(() => loadArray(MISSIONS_STORAGE_KEY));
  const [filter, setFilter] = useState("Tout");
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === "undefined" ? "indisponible" : Notification.permission);
  const [importMessage, setImportMessage] = useState("");

  const categories = useMemo(() => ["Tout", ...new Set(cortijoActionDesk.map((action) => action.category))], []);
  const visibleActions = filter === "Tout" ? cortijoActionDesk : cortijoActionDesk.filter((action) => action.category === filter);
  const completedCount = cortijoActionDesk.filter((action) => (logsByAction[action.id] || []).length > 0).length;

  const agendaItems = useMemo(() => {
    const actionItems = cortijoActionDesk
      .map((action) => {
        const assignment = assignments[action.id] || {};
        if (!assignment.assignedTo && !assignment.dueAt && assignment.status !== "Fait") return null;
        const contact = contacts[action.id] || {};
        return {
          id: `action-${action.id}`,
          kind: "action",
          sourceId: action.id,
          title: action.title,
          category: action.category,
          assignedTo: assignment.assignedTo || "À attribuer",
          dueAt: assignment.dueAt || "",
          notifyAt: "",
          contact: action.contact,
          phone: contact.phone || "",
          email: contact.email || "",
          whatsapp: contact.whatsapp || "",
          instructions: action.goal,
          priority: action.priority,
          status: assignment.status || "À faire"
        };
      })
      .filter(Boolean);

    const followUpItems = followUps.map((item) => ({
      ...item,
      kind: "followup",
      contact: item.contact || "",
      phone: "",
      email: "",
      whatsapp: "",
      instructions: `Créée depuis : ${item.sourceTitle || "une réponse enregistrée"}`,
      priority: item.priority || "Suivi"
    }));

    const customItems = customMissions.map((item) => ({
      ...item,
      kind: "custom",
      contact: item.contactName || "",
      phone: item.contactPhone || "",
      email: item.contactEmail || "",
      whatsapp: item.contactWhatsapp || ""
    }));

    return [...actionItems, ...followUpItems, ...customItems];
  }, [assignments, contacts, followUps, customMissions]);

  const activeAlerts = useMemo(() => agendaItems.filter((item) => {
    if (item.status === "Fait") return false;
    const due = daysUntil(item.dueAt);
    const notify = daysUntil(item.notifyAt);
    return (due !== null && due <= 1) || (notify !== null && notify <= 0);
  }), [agendaItems]);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || activeAlerts.length === 0) return;
    const stamps = loadObject(NOTIFICATIONS_STORAGE_KEY);
    const today = localToday();
    let changed = false;

    activeAlerts.slice(0, 5).forEach((item) => {
      const stampId = `${today}:${item.id}`;
      if (stamps[stampId]) return;
      new Notification("FINCA MARIA", {
        body: `${urgencyLabel(item.dueAt)} — ${item.title}${item.assignedTo ? ` · ${item.assignedTo}` : ""}`
      });
      stamps[stampId] = true;
      changed = true;
    });

    if (changed) save(NOTIFICATIONS_STORAGE_KEY, stamps);
  }, [activeAlerts]);

  function addLog(action, log) {
    setLogsByAction((current) => {
      const next = {
        ...current,
        [action.id]: [log, ...(current[action.id] || [])]
      };
      save(LOGS_STORAGE_KEY, next);
      return next;
    });

    const fact = {
      id: `fact-${action.id}-${Date.now()}`,
      date: log.contactedAt,
      type: "Réponse",
      title: action.title,
      summary: log.response,
      location: `${action.contact} — ${log.channel}`,
      status: evidenceStatus(log.documentReceived),
      answerer: log.answerer,
      recordedBy: log.recordedBy,
      documentRef: log.documentRef,
      actionId: action.id,
      linkedTo: action.linkedTo
    };

    setFacts((current) => {
      const next = [fact, ...current];
      save(FACTS_STORAGE_KEY, next);
      return next;
    });

    if (log.nextStep) {
      const followUp = {
        id: `followup-${action.id}-${Date.now()}`,
        title: log.nextStep,
        dueAt: log.nextStepDate,
        notifyAt: "",
        createdAt: localToday(),
        contact: action.contact,
        category: action.category,
        assignedTo: log.nextAssignee || "À attribuer",
        sourceActionId: action.id,
        sourceTitle: action.title,
        recordedBy: log.recordedBy,
        status: "À faire"
      };
      setFollowUps((current) => {
        const next = [followUp, ...current];
        save(FOLLOWUPS_STORAGE_KEY, next);
        return next;
      });
    }
  }

  function updateAssignment(actionId, field, value) {
    setAssignments((current) => {
      const next = {
        ...current,
        [actionId]: {
          assignedTo: "À attribuer",
          dueAt: "",
          status: "À faire",
          ...(current[actionId] || {}),
          [field]: value
        }
      };
      save(ASSIGNMENTS_STORAGE_KEY, next);
      return next;
    });
  }

  function updateContact(actionId, field, value) {
    setContacts((current) => {
      const next = {
        ...current,
        [actionId]: { ...(current[actionId] || {}), [field]: value }
      };
      save(CONTACTS_STORAGE_KEY, next);
      return next;
    });
  }

  function addMission(mission) {
    setCustomMissions((current) => {
      const next = [mission, ...current];
      save(MISSIONS_STORAGE_KEY, next);
      return next;
    });
  }

  function toggleAgendaItem(item) {
    if (item.kind === "action") {
      updateAssignment(item.sourceId, "status", item.status === "Fait" ? "À faire" : "Fait");
      return;
    }
    if (item.kind === "followup") {
      setFollowUps((current) => {
        const next = current.map((row) => row.id === item.id ? { ...row, status: row.status === "Fait" ? "À faire" : "Fait" } : row);
        save(FOLLOWUPS_STORAGE_KEY, next);
        return next;
      });
      return;
    }
    setCustomMissions((current) => {
      const next = current.map((row) => row.id === item.id ? { ...row, status: row.status === "Fait" ? "À faire" : "Fait" } : row);
      save(MISSIONS_STORAGE_KEY, next);
      return next;
    });
  }

  function deleteMission(id) {
    const next = customMissions.filter((item) => item.id !== id);
    setCustomMissions(next);
    save(MISSIONS_STORAGE_KEY, next);
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  function exportFamilyWork() {
    const payload = {
      schema: "cortijo-family-work-v1",
      exportedAt: new Date().toISOString(),
      team,
      assignments,
      contacts,
      logsByAction,
      facts,
      followUps,
      customMissions
    };
    downloadText(`FINCA_MARIA_TRAVAIL_FAMILLE_${localToday()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function importFamilyWork(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        if (payload.schema !== "cortijo-family-work-v1") throw new Error("format");

        const nextTeam = mergeById(team, payload.team || []);
        const nextAssignments = { ...assignments, ...(payload.assignments || {}) };
        const nextContacts = { ...contacts, ...(payload.contacts || {}) };
        const nextLogs = { ...logsByAction };
        Object.entries(payload.logsByAction || {}).forEach(([actionId, logs]) => {
          nextLogs[actionId] = mergeById(nextLogs[actionId] || [], Array.isArray(logs) ? logs : []);
        });
        const nextFacts = mergeById(facts, payload.facts || []);
        const nextFollowUps = mergeById(followUps, payload.followUps || []);
        const nextMissions = mergeById(customMissions, payload.customMissions || []);

        setTeam(nextTeam); save(TEAM_STORAGE_KEY, nextTeam);
        setAssignments(nextAssignments); save(ASSIGNMENTS_STORAGE_KEY, nextAssignments);
        setContacts(nextContacts); save(CONTACTS_STORAGE_KEY, nextContacts);
        setLogsByAction(nextLogs); save(LOGS_STORAGE_KEY, nextLogs);
        setFacts(nextFacts); save(FACTS_STORAGE_KEY, nextFacts);
        setFollowUps(nextFollowUps); save(FOLLOWUPS_STORAGE_KEY, nextFollowUps);
        setCustomMissions(nextMissions); save(MISSIONS_STORAGE_KEY, nextMissions);
        setImportMessage("État familial importé et fusionné sans effacer les éléments existants.");
      } catch {
        setImportMessage("Ce fichier n'est pas un export FINCA MARIA Travail famille valide.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <section className="actionDesk" aria-label="Bureau des démarches FINCA MARIA">
      <header className="actionDeskHero">
        <div>
          <span className="cortijoEyebrow">Missions & démarches</span>
          <h3>J'ouvre FINCA MARIA : je sais quoi faire, qui s'en charge et qui prévenir</h3>
          <p>Les appels, travaux, documents et visites peuvent être attribués, datés, rappelés et transmis à la personne qui s'en charge. Les réponses continuent d'alimenter la mémoire.</p>
        </div>
        <div className="actionDeskProgress">
          <strong>{agendaItems.filter((item) => item.status !== "Fait").length}</strong>
          <span>missions ouvertes dans l'agenda</span>
        </div>
      </header>

      <section className="actionCollaborationStrip">
        <div>
          <span className="cortijoEyebrow">Phase famille</span>
          <strong>Travail partagé : prêt en mode échange de fichier</strong>
          <p>Chaque ordinateur garde encore ses données localement. Pour travailler à plusieurs dès maintenant, exportez l'état familial puis importez-le sur l'autre appareil : FINCA MARIA fusionne les éléments au lieu de tout écraser.</p>
        </div>
        <div className="actionCollaborationButtons">
          <button type="button" onClick={exportFamilyWork}>Exporter le travail famille</button>
          <label className="actionImportButton">Importer / fusionner<input type="file" accept="application/json,.json" onChange={importFamilyWork} /></label>
          <button type="button" onClick={requestNotifications} disabled={notificationPermission === "indisponible"}>
            Notifications : {notificationPermission === "granted" ? "activées" : notificationPermission === "denied" ? "bloquées" : notificationPermission === "indisponible" ? "indisponibles" : "activer"}
          </button>
        </div>
        {importMessage && <small>{importMessage}</small>}
        <small>Les notifications navigateur fonctionnent quand FINCA MARIA est ouverte. Pour les rappels même fermé, utilise le bouton Calendrier : le fichier ajoute J-7, J-3 et J-1 dans ton agenda.</small>
      </section>

      <TeamPanel team={team} setTeam={setTeam} />
      <MissionComposer team={team} onAddMission={addMission} />
      <AgendaPanel items={agendaItems} team={team} onToggle={toggleAgendaItem} onDelete={deleteMission} />

      {activeAlerts.length > 0 && (
        <section className="actionAlertStrip">
          <strong>{activeAlerts.length} rappel{activeAlerts.length > 1 ? "s" : ""} opérationnel{activeAlerts.length > 1 ? "s" : ""}</strong>
          <span>{activeAlerts.slice(0, 3).map((item) => `${urgencyLabel(item.dueAt)} : ${item.title}`).join(" · ")}</span>
        </section>
      )}

      <div className="actionDeskFilters">
        {categories.map((category) => (
          <button type="button" key={category} className={filter === category ? "isActive" : ""} onClick={() => setFilter(category)}>{category}</button>
        ))}
      </div>

      <div className="actionDeskGrid">
        {visibleActions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            logs={logsByAction[action.id] || []}
            team={team}
            assignment={assignments[action.id] || { assignedTo: "À attribuer", dueAt: "", status: "À faire" }}
            contactDetails={contacts[action.id] || {}}
            onAssignmentChange={updateAssignment}
            onContactChange={updateContact}
            onAddLog={addLog}
          />
        ))}
      </div>

      <details className="actionFactsPanel">
        <summary>Mémoire créée par les appels ({facts.length})</summary>
        <div className="actionFactsList">
          {facts.length === 0 ? (
            <p>Aucune réponse enregistrée pour le moment.</p>
          ) : (
            facts.slice(0, 8).map((fact) => (
              <article key={fact.id}>
                <div>
                  <span>{fact.date}</span>
                  <strong>{fact.title}</strong>
                </div>
                <p>{fact.summary}</p>
                <small>{fact.status} · réponse de {fact.answerer} · saisie par {fact.recordedBy}</small>
              </article>
            ))
          )}
        </div>
        <a href="/?view=cortijo-memoire">Ouvrir toute la mémoire FINCA MARIA</a>
      </details>
    </section>
  );
}
