import { useEffect, useMemo, useState } from "react";
import { cortijoActionDesk } from "../data/cortijoActionDesk";
import { CORTIJO_DOSSIERS } from "../data/cortijoDossiers";

import { ACTION_FILTERS, actionFilter, actionsUrl, matchesActionFilter, summarizeActions, normalizeActionStatus as normalizeStatus } from "../lib/actionAssignments.mjs";
import { useActionAssignments } from "../lib/useActionAssignments";
import { ActionSaveStatus } from "./ActionSaveStatus";
const ACTION_PLAN_DATE = "18/08/2026";
const RESPONSIBLE_OPTIONS = ["À déterminer", "Clemencia", "Ana María", "María Isabel", "María José", "Gloria", "Michèle", "José", "Sofía"];
const STATUS_OPTIONS = ["Action à compléter", "En cours", "En attente", "Action accomplie"];
const CONTACT_MODE_OPTIONS = ["Téléphone", "WhatsApp", "Mail", "Sur place", "Rendez-vous"];
const CONTACT_WITH_OPTIONS = ["San Juan", "ASAJA", "Peláez", "Agriculteur / Vitines", "Autre interlocuteur"];


const ACTION_SCRIPT_FR = {
  "san-juan-historique": "Bonjour. Nous reconstituons la production de notre finca campagne par campagne. Pour 2025/26, nous avons déjà deux reçus de reparto utilisant la même base de 18 210 kg d'olives, 3 860,64 kg d'huile et un rendement de 21,20 %. Nous ne vous demandons donc pas de réétablir cette base : nous avons besoin de la liste complète des vales ou apports, avec dates et kilos, de comprendre comment s'insèrent les repères 7 943 kg, 6 541 kg et la référence 6139, et de confirmer si 18 210 kg est bien le total des apports de la campagne. Nous souhaitons aussi savoir s'il existe un troisième reparto ou une liquidation finale. Pour les campagnes 2019/20 à 2022/23, nous avons encore besoin de l'historique complet de production et de la confirmation que le relevé couvre tous les apports enregistrés.",
  "asaja-pac-2026-copie": "Bonjour. Nous avons la preuve que la PAC 2026 de notre finca a été déposée le 12 mars 2026. Nous avons déjà vérifié nos documents et nous avons le dossier détaillé de 2024, mais il nous manque les pages détaillées de 2026. Pourriez-vous nous fournir une copie complète de la Demande unique PAC 2026 et du justificatif de dépôt, avec les parcelles, recintos, surfaces, cultures et aides déclarées ? Nous n'avons pas besoin de vérifier à nouveau si la PAC a été déposée ; nous avons uniquement besoin de la copie complète du dossier 2026 qui manque dans nos archives.",
  "pelaez-role-fiscal": "Bonjour. Nous mettons en ordre le dossier fiscal de la finca sans redemander les documents déjà présents. Nous avons les Modelos 100 des exercices 2017, 2018, 2019, 2022 et 2025. La déclaration 2025 a été présentée le 7 mai 2026. Nous cherchons uniquement les exercices encore manquants : 2020, 2021, 2023 et 2024 si vous les conservez, ainsi que les justificatifs agricoles utilisés pour les préparer : San Juan, PAC ou subventions, factures et dépenses. Sur les données fiscales 2025, nous avons également un écart de 2 euros entre le détail lisible des retenues et le total imprimé ; si vous conservez la pièce source qui l'explique, elle nous serait utile. Nous n'avons pas besoin de données bancaires.",
  "vitines-378-detail": "Nous avons la facture n°378 du 4 avril 2026 pour 5 445 euros, avec le libellé général récolte d'olives et travail phytosanitaire. Nous voulons ventiler cette facture précise : part récolte, part phytosanitaire, produits, doses, heures ou personnes, parcelles et dates réelles des travaux inclus. D'anciennes synthèses mentionnent également des interventions les 22 avril, 29 avril et 1er mai 2026, mais ces dates sont postérieures à la facture. Nous avons donc besoin de savoir si ce sont d'autres travaux et, si oui, quelle facture ou quel bon de travail les couvre. Le but est justement de ne pas mélanger plusieurs interventions dans une seule facture.",
  "vitines-cereales-trace": "Nous séparons maintenant le dossier des céréales du dossier des oliviers. Nous avons des factures de janvier 2024 pour 600 kg d'avoine et 500 kg de triticale, mais elles prouvent des achats et pas ce qui a ensuite été récolté. Les comptes rendus familiaux 2026 indiquent encore qu'il faut demander à Vitines la facture de ramassage de l'avoine ou d'autres céréales. Nous avons besoin de savoir quelle culture a été récoltée, sur quelle surface, combien de kilos ont été obtenus, quelle a été leur destination et s'il y a eu vente ou encaissement. Il faut aussi retrouver le document ou l'accord qui organise l'exploitation de ces terres après mars 2020. Nous ne voulons pas confondre achat de semence, travail de récolte et vente comme s'il s'agissait d'une seule opération.",
  "asaja-visite-technique": "Bonjour. Nous sommes adhérents à ASAJA et nous avons une finca d'oliveraie traditionnelle à Villanueva del Rosario. Nous souhaitons demander la visite d'un technicien afin de faire un diagnostic de l'état actuel de l'exploitation, d'évaluer son potentiel productif et de savoir quels travaux devraient être réalisés au cours des douze prochains mois. Nous aimerions, si possible, disposer ensuite d'un bref rapport écrit. Ce service est-il inclus pour les adhérents et comment pouvons-nous demander la visite ?"
};

const compactChipStyle = { display: "inline-flex", alignItems: "center", gap: ".28rem", width: "auto", minWidth: 0, minHeight: "34px", margin: 0, padding: ".22rem .46rem", borderRadius: "999px", whiteSpace: "nowrap" };
const compactLabelStyle = { fontSize: ".65rem", lineHeight: 1, letterSpacing: ".25px", whiteSpace: "nowrap" };
const compactControlStyle = { width: "auto", minWidth: 0, minHeight: "26px", padding: "0 .1rem", fontSize: ".84rem", lineHeight: 1.1 };

function formatDate(value) { if (!value) return "À déterminer"; const [year, month, day] = String(value).split("-"); return year && month && day ? `${day}/${month}/${year}` : value; }
function normalizeResponsible(value = "À déterminer") { if (value === "Sofia") return "Sofía"; if (value === "Isabel") return "María Isabel"; if (value === "Autre membre de la famille") return "À déterminer"; return value; }
function suggestedContactMode(mode = "") { const value = mode.toLowerCase(); if (value.includes("whatsapp")) return "WhatsApp"; if (value.includes("mail") || value.includes("email")) return "Mail"; if (value.includes("rendez")) return "Rendez-vous"; if (value.includes("téléphone") || value.includes("telephone")) return "Téléphone"; if (value.includes("sur place") || value.includes("passage")) return "Sur place"; return "Téléphone"; }
function actionsFor(dossier) { return dossier.actionIds.map((id) => cortijoActionDesk.find((action) => action.id === id)).filter(Boolean); }
function stopToggle(event) { event.stopPropagation(); }

function QuickSelect({ label, value, options, onChange, className = "", hideLabel = false }) {
  return <label className={`fincaQuickField ${className}`.trim()} style={compactChipStyle} onClick={stopToggle} onKeyDown={stopToggle}>{!hideLabel && <span style={compactLabelStyle}>{label}</span>}<select aria-label={label} value={value} style={compactControlStyle} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

function DateChip({ title, value, onChange }) {
  return <label className="fincaQuickField isDue" style={compactChipStyle} onClick={stopToggle} onKeyDown={stopToggle}><span style={compactLabelStyle}>Échéance</span><input type="date" value={value} aria-label={`Échéance ${title}`} style={{ ...compactControlStyle, maxWidth: "8.5rem", colorScheme: "dark" }} onClick={(event) => { stopToggle(event); event.currentTarget.showPicker?.(); }} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ActionScript({ action }) {
  if (!action.script) return null;
  const french = ACTION_SCRIPT_FR[action.id];
  return (
    <div style={{ marginTop: ".75rem" }}>
      <strong>À dire en espagnol</strong>
      <p lang="es">{action.script}</p>
      {french && <><strong>Traduction française</strong><p>{french}</p></>}
    </div>
  );
}

function DossierAction({ action, dossierLabel, assignment, onUpdate }) {
  const responsible = normalizeResponsible(assignment.assignedTo || "À déterminer");
  const status = normalizeStatus(assignment.status || "Action à compléter");
  const dueAt = assignment.dueAt || "";
  const decidedAt = action.decidedAt || ACTION_PLAN_DATE;
  const contactMode = assignment.contactMode || suggestedContactMode(action.mode);
  const contactWith = assignment.contactWith || action.contact || dossierLabel;
  const resolution = assignment.resolution || "";
  const withOptions = Array.from(new Set([contactWith, action.contact, ...CONTACT_WITH_OPTIONS].filter(Boolean)));
  const statusOptions = Array.from(new Set([status, ...STATUS_OPTIONS].filter(Boolean)));
  const responsibleOptions = Array.from(new Set([responsible, ...RESPONSIBLE_OPTIONS].filter(Boolean)));

  return (
    <details className="cortijoCard fincaActionCard fincaImmediateAction" style={{ padding: ".62rem .72rem", borderRadius: "14px" }}>
      <summary style={{ display: "grid", gap: ".38rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".65rem" }}><div style={{ minWidth: 0, flex: 1 }}><h4 style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.25 }}>{action.title}</h4><small style={{ display: "block", marginTop: ".16rem", color: "#bda980", fontSize: ".74rem" }}>Action inscrite · {formatDate(decidedAt)}</small></div><span className="cortijoPill" style={{ flex: "0 0 auto", marginLeft: "auto" }}>{action.priority}</span></div>
        <div className="fincaInlineActionBar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: ".34rem", marginTop: 0 }} onClick={stopToggle} onKeyDown={stopToggle}>
          <QuickSelect label="Suivi" value={status} options={statusOptions} onChange={(value) => onUpdate(action.id, { status: value })} className="isStatus" hideLabel />
          <DateChip title={action.title} value={dueAt} onChange={(value) => onUpdate(action.id, { dueAt: value })} />
          <QuickSelect label="Attribution" value={responsible} options={responsibleOptions} onChange={(value) => onUpdate(action.id, { assignedTo: value })} />
          <QuickSelect label="Mode" value={contactMode} options={CONTACT_MODE_OPTIONS} onChange={(value) => onUpdate(action.id, { contactMode: value })} />
          <QuickSelect label="Avec" value={contactWith} options={withOptions} onChange={(value) => onUpdate(action.id, { contactWith: value })} />
          <span className="fincaActionOpenHint" style={{ minHeight: "34px", marginLeft: "auto", padding: "0 .18rem", fontSize: ".78rem" }}>Ouvrir <span aria-hidden="true">⌄</span></span>
        </div>
      </summary>
      <div className="fincaActionExpanded" style={{ paddingTop: ".65rem" }}>
        <p style={{ marginTop: 0 }}><strong>But :</strong> {action.goal}</p>
        <div className="fincaResolutionBox" style={{ marginTop: ".45rem", paddingTop: ".7rem" }}><label><span>Résolution / résultat obtenu</span><textarea rows="4" value={resolution} placeholder="Rendez-vous obtenu, réponse reçue, document récupéré, décision prise…" onChange={(event) => onUpdate(action.id, { resolution: event.target.value })} /></label><small>{resolution ? "Résultat saisi ; consultez l’indication de sauvegarde." : "À remplir dès que l'action avance."}</small></div>
        {action.toObtain?.length > 0 && <div style={{ marginTop: ".85rem" }}><strong>À obtenir / à faire</strong><ul>{action.toObtain.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        {action.expectedProof && <p><strong>Résultat attendu :</strong> {action.expectedProof}</p>}
        {(action.contactHint || action.script) && <details className="fincaReadScript" style={{ marginTop: ".75rem" }}><summary>Détails utiles</summary>{action.contactHint && <p><strong>À savoir :</strong> {action.contactHint}</p>}<ActionScript action={action} /></details>}
      </div>
    </details>
  );
}

function DocumentVersions({ document }) {
  return (
    <li style={{ marginBottom: ".75rem" }}>
      <div style={{ fontWeight: 650 }}>{document}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginTop: ".35rem" }}>
        <span className="cortijoPill" title="Emplacement de l'original espagnol">ES · original</span>
        <span className="cortijoPill" title="Emplacement de la traduction française">FR · traduction</span>
      </div>
    </li>
  );
}

export function CortijoDossierPortal() {
  const params = new URLSearchParams(window.location.search);
  const requestedContact = params.get("contact");
  const hasRequestedContact = CORTIJO_DOSSIERS.some((item) => item.id === requestedContact);
  const initialContact = hasRequestedContact ? requestedContact : "san-juan";
  const [activeContact, setActiveContact] = useState(initialContact);
  const [selectedFilter, setActionFilter] = useState(() => actionFilter(params.get("filter")));
  const { assignments, updateAssignment, saveMessage, readError, canRetrySave, retrySave } = useActionAssignments();

  useEffect(() => { if (!hasRequestedContact) return; const frame = window.requestAnimationFrame(() => document.getElementById("finca-action-board")?.scrollIntoView({ block: "start" })); return () => window.cancelAnimationFrame(frame); }, [hasRequestedContact]);

  const activeDossier = CORTIJO_DOSSIERS.find((item) => item.id === activeContact) || CORTIJO_DOSSIERS[0];
  const activeActions = actionsFor(activeDossier);
  const counts = useMemo(() => summarizeActions(activeActions, assignments), [activeActions, assignments]);
  const visibleActions = activeActions.filter((action) => matchesActionFilter(assignments[action.id]?.status, selectedFilter));

  function selectFilter(filter) {
    setActionFilter(filter);
    window.history.replaceState(null, "", actionsUrl(window.location.href, { contact: activeContact, filter, dossier: true }));
  }

  function selectContact(id) { setActiveContact(id); setActionFilter("active"); window.history.replaceState(null, "", actionsUrl(window.location.href, { contact: id, filter: "active", dossier: true })); window.requestAnimationFrame(() => document.getElementById("finca-action-board")?.scrollIntoView({ block: "start" })); }

  return (
    <main className="cortijoExportApp fincaActionWorkspace">
      <section className="cortijoExportHero"><div><span className="cortijoExportEyebrow">FINCA MARIA</span><h1>DOSSIERS & ACTIONS</h1><p>Une action se pilote directement sur sa petite carte. On n'ouvre que pour le but, la résolution et les détails utiles.</p></div></section>

      <nav className="cortijoView" aria-label="Retour au suivi des actions">
        <a className="fincaDossierReturn" href={actionsUrl(window.location.href, { contact: activeDossier.id, filter: selectedFilter })}>← Retour à Terre · Actions — {activeDossier.label}</a>
        <ActionSaveStatus message={saveMessage} canRetry={canRetrySave} onRetry={retrySave} />
      </nav>

      <section className="cortijoView" aria-label="Choisir un dossier"><div className="cortijoActionGrid">{CORTIJO_DOSSIERS.map((item, index) => <button type="button" key={item.id} className={activeContact === item.id ? "isActive" : ""} onClick={() => selectContact(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><p>{item.subtitle}</p></button>)}</div></section>

      <section id="finca-action-board" className="cortijoView fincaActionBoard" aria-label={`Actions ${activeDossier.label}`}>
        <div className="cortijoPanelTitle fincaActionBoardTitle"><span>A</span><div><h3>Actions — {activeDossier.label}</h3><p>Statut, échéance, attribution, mode et interlocuteur : tout se change ici, sans sous-menu.</p></div></div>
        <div className="fincaActionBuckets" aria-label="Filtrer les actions par état">{ACTION_FILTERS.map((filter) => <button type="button" key={filter.id} aria-pressed={selectedFilter === filter.id} className={selectedFilter === filter.id ? "isActive" : ""} onClick={() => selectFilter(filter.id)}><span>{filter.label}</span><strong>{counts[filter.id]}</strong></button>)}</div>
        <fieldset disabled={readError} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><div className="cortijoList fincaActionList">{visibleActions.length === 0 && <article className="cortijoCard fincaEmptyActionState"><p>{selectedFilter === "done" ? "Aucune action accomplie pour ce dossier." : "Aucune action dans cette rubrique."}</p></article>}{visibleActions.map((action) => <DossierAction key={action.id} action={action} dossierLabel={activeDossier.label} assignment={assignments[action.id] || {}} onUpdate={updateAssignment} />)}</div></fieldset>
      </section>

      <details className="cortijoView fincaDocumentsDrawer">
        <summary className="cortijoPanelTitle"><span>P</span><div><h3>Pièces utiles & historique — {activeDossier.label}</h3><p>Tout reste conservé ici, du plus récent au plus ancien.</p></div><small className="cortijoSummaryBadge">{activeDossier.history.length} dates</small></summary>
        <div className="cortijoList">
          <article className="cortijoCard"><div className="cortijoCardTop"><span className="cortijoPill">REPÈRES</span></div>{activeDossier.facts.map((fact) => <p key={`${fact.tag}-${fact.text}`}><strong>{fact.tag} :</strong> {fact.text}</p>)}</article>
          {activeDossier.history.map((entry) => <article className="cortijoCard" key={`${entry.date}-${entry.title}`}><div className="cortijoCardTop"><span className="cortijoPill">{entry.date}</span></div><h4>{entry.title}</h4><p>{entry.text}</p></article>)}
          <article className="cortijoCard">
            <div className="cortijoCardTop"><span className="cortijoPill">PIÈCES</span></div>
            <h4>Documents à garder sous la main</h4>
            <p>Pour chaque document, le logiciel prévoit deux versions liées : l’original espagnol et la traduction française. On ne fabrique pas de traduction sans le document source ; on associe les deux fichiers lorsqu’ils sont disponibles.</p>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>{activeDossier.documents.map((document) => <DocumentVersions key={document} document={document} />)}</ul>
          </article>
        </div>
      </details>

      <section className="cortijoExportRule"><div><strong>Retour</strong><p>Revenir au suivi des actions du dossier ouvert.</p></div><a href={actionsUrl(window.location.href, { contact: activeDossier.id, filter: selectedFilter })}>← Terre · Actions — {activeDossier.label}</a></section>
    </main>
  );
}
