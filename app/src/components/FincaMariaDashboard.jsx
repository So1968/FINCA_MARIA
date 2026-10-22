import { useEffect, useMemo, useRef, useState } from "react";
import { cortijoActionDesk } from "../data/cortijoActionDesk";

const ASSIGNMENTS_STORAGE_KEY = "cortijo_action_assignments_v1";
const NAV_STORAGE_KEY = "finca_maria_navigation_v2";
const ACTION_PLAN_DATE = "18/08/2026";
const BACKUP_VERSION = 2;

const RESPONSIBLE_OPTIONS = [
  "À déterminer",
  "Clemencia",
  "Ana María",
  "María Isabel",
  "María José",
  "Gloria",
  "Michèle",
  "José",
  "Sofía"
];
const STATUS_OPTIONS = ["Action à compléter", "En cours", "En attente", "Action accomplie"];
const CONTACT_MODE_OPTIONS = ["Téléphone", "WhatsApp", "Mail", "Sur place", "Rendez-vous"];
const CONTACT_WITH_OPTIONS = ["San Juan", "ASAJA", "Peláez", "Agriculteur / Vitines", "Autre interlocuteur"];

const EARTH_TABS = [
  { id: "gestion", label: "Gestion", icon: "leaf", title: "Comment la terre a été gérée" },
  { id: "analyse", label: "Analyse", icon: "search", title: "Analyse de la terre" },
  { id: "strategie", label: "Stratégie", icon: "compass", title: "Stratégie" },
  { id: "actions", label: "Actions", icon: "folder", title: "Dossiers & actions" }
];

const HOUSE_TABS = [
  { id: "gerer", label: "Gérer", icon: "home", title: "Gérer la maison" },
  { id: "afaire", label: "À faire", icon: "check", title: "À faire pendant un séjour" },
  { id: "presences", label: "Présences", icon: "people", title: "Présences & couchages" },
  { id: "inventaire", label: "Inventaire", icon: "box", title: "Inventaire & besoins" },
  { id: "jardin", label: "Jardin", icon: "leaf", title: "Patio & jardin" },
  { id: "sorties", label: "Sorties", icon: "compass", title: "Guide des vacanciers" }
];

const ACTION_SCRIPT_FR = {
  "san-juan-historique": "Bonjour. Nous reconstituons la production de la finca campagne par campagne. Nous avons déjà de nombreux documents anciens, y compris depuis 2007. Nous avons aussi des états de factures San Juan de 2019, 2020, 2021 et 2022, mais ils ne permettent pas à eux seuls de connaître les kilos d'olives ni la production totale de chaque campagne. Pour 2025/26, deux reçus de répartition utilisent la même base de 18 210 kg d'olives, 3 860,64 kg d'huile et un rendement de 21,20 % : ces kilos ne doivent donc pas être additionnés deux fois. Nous avons besoin de la liste complète des vales ou apports, des dates et kilos de chaque apport, de rattacher le premier ramassage de 7 943 kg à cette base, de clarifier la nature des 6 541 kg et de la référence 6139, puis de confirmer si 18 210 kg correspond bien au total des apports de la campagne. Nous devons aussi savoir s'il existe un troisième reparto ou une liquidation finale. Pour 2019/20 à 2022/23, il reste à récupérer l'historique complet de production et à confirmer que le relevé fourni couvre tous les apports enregistrés.",
  "asaja-pac-2026-copie": "Bonjour. Nous avons la preuve que la PAC 2026 de notre finca a été déposée le 12 mars 2026. Nous avons déjà vérifié nos documents et nous avons le dossier détaillé de 2024, mais il nous manque les pages détaillées de 2026. Pourriez-vous nous fournir une copie complète de la Demande unique PAC 2026 et du justificatif de dépôt, avec les parcelles, recintos, surfaces, cultures et aides déclarées ? Nous n'avons pas besoin de vérifier à nouveau si la PAC a été déposée ; nous avons uniquement besoin de la copie complète du dossier 2026 qui manque dans nos archives.",
  "pelaez-role-fiscal": "Bonjour. Nous mettons en ordre le dossier fiscal de la finca et nous ne voulons pas vous demander des documents que nous avons déjà. Dans nos archives figurent déjà les déclarations Modelo 100 des exercices 2017, 2018, 2019 et 2022. Nos comptes rendus familiaux de 2026 indiquent également que la déclaration d'impôts devait être gérée avec vous. Ce dont nous avons besoin maintenant, c'est uniquement de compléter ce qui manque : quels exercices fiscaux conservez-vous et qui ne figurent pas déjà dans notre liste, en particulier 2020, 2021 et ceux postérieurs à 2022 ? Si vous les avez, pourriez-vous nous remettre une copie de ces déclarations et des justificatifs agricoles utilisés pour les préparer, tels que liquidations ou certificats San Juan, subventions ou documents PAC, factures ou dépenses agricoles ? Nous n'avons pas besoin de données bancaires ; nous cherchons seulement à reconstituer le dossier fiscal et agricole année par année.",
  "vitines-378-detail": "Nous avons la facture n° 378 du 4 avril 2026 pour 5 445 euros. Dans nos notes figurent déjà trois interventions ultérieures : le 22 avril, un traitement foliaire avec une cuve de 3 000 litres ; le 29 avril, huit heures de débroussaillage ; et le 1er mai, deux cuves de liquide au sol. Nous ne voulons pas que vous nous répétiez ce que nous savons déjà. Nous avons besoin de confirmer ou corriger ces dates et de compléter le détail : quel produit et quelle matière active ont été utilisés pour chaque traitement, quelle dose, sur quelles parcelles ou zones, si les produits ont été fournis par Vitines ou achetés séparément, et comment se répartit exactement le montant de 5 445 euros entre la récolte des olives, le traitement foliaire, le débroussaillage, le traitement au sol, les produits et tout autre travail.",
  "asaja-visite-technique": "Bonjour. Nous sommes adhérents à ASAJA et nous avons une finca d'oliveraie traditionnelle à Villanueva del Rosario. Nous souhaitons demander la visite d'un technicien afin de faire un diagnostic de l'état actuel de l'exploitation, d'évaluer son potentiel productif et de savoir quels travaux devraient être réalisés au cours des douze prochains mois. Nous aimerions, si possible, disposer ensuite d'un bref rapport écrit. Ce service est-il inclus pour les adhérents et comment pouvons-nous demander la visite ?"
};

const compactChipStyle = { display: "inline-flex", alignItems: "center", gap: ".28rem", width: "auto", minWidth: 0, minHeight: "34px", margin: 0, padding: ".22rem .46rem", borderRadius: "999px", whiteSpace: "nowrap" };
const compactLabelStyle = { fontSize: ".65rem", lineHeight: 1, letterSpacing: ".25px", whiteSpace: "nowrap" };
const compactControlStyle = { width: "auto", minWidth: 0, minHeight: "26px", padding: "0 .1rem", fontSize: ".84rem", lineHeight: 1.1 };

const managementTimeline = [
  { period: "2023/24 → aujourd'hui", title: "Exploitation directe avec prestations facturées", text: "La famille pilote directement l'exploitation. José n'est plus titulaire d'une part de 85 % : les travaux doivent désormais être suivis comme prestations, avec dates, parcelles, produits, coûts et résultat obtenu." },
  { period: "Environ 2023/24", title: "Refus du nouveau contrat", text: "Gloria confirme à José qu'il n'y aura pas de nouveau bail. Cette date constitue la rupture analytique utile pour comparer l'ancien fonctionnement à 15 % et la gestion directe." },
  { period: "11/03/2020 → environ 2023/24", title: "Fin du bail écrit mais continuité du fonctionnement à 15 %", text: "Le deuxième bail écrit se termine en mars 2020. Selon la famille, José continue néanmoins à exploiter pendant la période de renégociation sur le même principe économique jusqu'à la rupture autour de 2023/24. Cette continuité doit être documentée campagne par campagne." },
  { period: "2019", title: "Décès de María et transition administrative", text: "Les démarches passent progressivement au nom de María Josefa, sans mettre fin au bail en cours. Le changement de sociétaire à San Juan ne doit pas être confondu avec un changement de mode de gestion." },
  { period: "12/03/2014 → 11/03/2020", title: "Deuxième bail écrit", text: "José López Gallego exploite la finca ; la propriétaire reçoit 15 % de la production d'olives et les frais d'exploitation sont supportés par le fermier." },
  { period: "12/02/2007 → 11/02/2013", title: "Premier bail écrit", text: "Premier cadre écrit retrouvé : María reçoit 15 % de la production d'olives. Cette règle sert de base aux reconstitutions quand les kilos du compte propriétaire sont clairement identifiés." }
];

const analysisFindings = [
  { status: "[P/C]", title: "Jusqu'à 2022/23, les kilos San Juan ne doivent pas être lus comme la production totale", text: "Le récapitulatif donne la part portée au compte de la famille. Sur la base du fonctionnement à 15 %, on reconstitue le total par kilos famille ÷ 0,15, tant que San Juan n'a pas confirmé définitivement le périmètre." },
  { status: "[C]", title: "La série reconstituée montre une alternance très forte", text: "2017/18 ≈ 26,72 t ; 2018/19 ≈ 10,60 t ; 2019/20 ≈ 35,73 t ; 2020/21 ≈ 8,17 t ; 2021/22 ≈ 25,74 t ; 2022/23 ≈ 4,56 t. Les années hautes démontrent que l'oliveraie conservait encore un fort potentiel sous l'ancien système." },
  { status: "[!]", title: "2022/23 est l'année-test prioritaire", text: "Les 684 kg correspondent à environ 4,56 t reconstituées si la règle des 15 % s'applique. C'est extrêmement bas par rapport aux années hautes et même aux anciennes années basses. La sécheresse et l'alternance peuvent l'expliquer en partie, mais il faut distinguer olives présentes, olives ramassées et olives réellement livrées." },
  { status: "[P/D]", title: "2023/24 est une campagne charnière, pas une année à multiplier automatiquement par 100/15", text: "Le récapitulatif donne 2 294 kg, mais cette campagne se situe au moment de la rupture du mode de gestion. Il faut verrouiller la date exacte de fin pratique du 15 % avant toute reconstitution." },
  { status: "[P/C]", title: "2025/26 : une seule base physique de 18 210 kg", text: "Les deux repartos documentés utilisent la même base de 18 210 kg d’olives, 3 860,64 kg d’huile et 21,20 % de rendement : ils ne doivent pas être additionnés en kilos. Le ramassage de 7 943 kg est un apport partiel à rattacher à cette base. Les 6 541 kg restent de nature non verrouillée et ne s’ajoutent pas séparément sans pièce source. L’existence d’un éventuel troisième reparto ou d’une liquidation finale reste à confirmer." },
  { status: "[H]", title: "L'hypothèse d'un effet du non-renouvellement doit être testée par des faits", text: "La famille envisage qu'après le refus du nouveau contrat José ait pu avoir intérêt à ce que la finca paraisse moins productive. Ce n'est pas une conclusion : on la teste par les travaux réellement réalisés, les dates de récolte, les olives laissées au sol, les tickets, les traitements, la taille et la comparaison avant/après 2023/24." }
];

const strategy = [
  "San Juan : ne plus redemander les kilos déjà connus ; faire confirmer ce qu'ils représentent, la règle des 15 %, la complétude des apports et les éventuels autres comptes ou destinations.",
  "Pour chaque campagne : séparer quatre colonnes — production biologique estimée, quantité ramassée, quantité livrée à San Juan, part inscrite au compte familial.",
  "2022/23 : reconstruire précisément la campagne des 684 kg pour savoir si la chute se situe sur l'arbre, pendant la récolte ou dans les apports coopératifs.",
  "Climat : comparer chaque campagne à la météo locale Antequera / Villanueva del Rosario et aux résultats de Málaga, sans utiliser la sécheresse comme explication automatique.",
  "Économie : compléter le bilan famille / agriculteur par les céréales, PAC/subventions, frais d'exploitation et liquidations manquantes afin d'obtenir un total par contrat.",
  "Après 2023/24 : rapprocher chaque facture/prestation de la date, du travail réellement exécuté, de la parcelle et de la production obtenue.",
  "ASAJA : obtenir une visite technique indépendante pour disposer d'un état agronomique actuel et d'un potentiel de production extérieur au conflit de gestion."
];

const interlocutors = [
  { id: "san-juan", label: "San Juan", subtitle: "Coopérative / campagnes / liquidations", actionIds: ["san-juan-historique"] },
  { id: "asaja", label: "ASAJA", subtitle: "PAC / SIGPAC / surfaces / aides", actionIds: ["asaja-visite-technique"] },
  { id: "pelaez", label: "Peláez", subtitle: "Fiscalité / déclarations / archives", actionIds: ["pelaez-role-fiscal"] },
  { id: "agriculteur", label: "Agriculteur / Vitines", subtitle: "Travaux / récolte / traitements / factures", actionIds: ["vitines-378-detail"] }
];

function Icon({ name, size = 24 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "leaf") return <svg {...common}><path d="M20 4c-7.5.2-12.5 3.6-13.8 9.6-.8 3.7 1.4 5.8 4.4 5.4 5.5-.7 8.8-6.3 9.4-15Z"/><path d="M5 20c2.6-5 6-8.3 10.8-10.8"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.7" cy="10.7" r="6.4"/><path d="m15.4 15.4 4.3 4.3"/></svg>;
  if (name === "compass") return <svg {...common}><circle cx="12" cy="12" r="8.6"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z"/></svg>;
  if (name === "folder") return <svg {...common}><path d="M3.5 7.5h6l1.7 2h9.3v8.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.5Z"/><path d="M3.5 7.5V5.8a1.7 1.7 0 0 1 1.7-1.7h4l1.7 2h4"/></svg>;
  if (name === "check") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></svg>;
  if (name === "people") return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.8 19c.7-3.4 2.4-5.2 5.2-5.2s4.6 1.8 5.3 5.2"/><path d="M14.7 14.4c2.9-.5 4.8 1 5.5 4.6"/></svg>;
  if (name === "box") return <svg {...common}><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>;
  return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M5.5 9.2V20h13V9.2"/><path d="M9.5 20v-6h5v6"/></svg>;
}

function BrandMark() {
  return (
    <div className="fincaBrand" aria-label="FINCA MARIA">
      <div className="fincaLogo" aria-hidden="true">
        <svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="31"/><path d="m20 38 16-14 16 14"/><path d="M25 35v17h22V35"/><path d="M29 52v-9h7v9"/><path d="M15 30c8-2 14-7 18-14"/><ellipse cx="18" cy="26" rx="4.8" ry="2.4" transform="rotate(-28 18 26)"/><ellipse cx="24" cy="21" rx="4.8" ry="2.4" transform="rotate(-38 24 21)"/><ellipse cx="30" cy="17" rx="4.4" ry="2.2" transform="rotate(-48 30 17)"/></svg>
      </div>
      <div><strong>FINCA MARIA</strong><span>Gestion familiale</span></div>
    </div>
  );
}

function actionsFor(item) { return item.actionIds.map((id) => cortijoActionDesk.find((action) => action.id === id)).filter(Boolean); }
function appViewUrl(view, params = {}, hash = "") {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", view);
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value)); });
  url.hash = hash ? `#${String(hash).replace(/^#/, "")}` : "";
  return url.toString();
}
function openDossier(contactId) { window.location.assign(appViewUrl("cortijo-memoire", { contact: contactId })); }
function openHouse(hash = "") { window.location.assign(appViewUrl("cortijo-maison", {}, hash)); }
function openVisitorGuide() { window.location.assign(appViewUrl("cortijo-maison", { mode: "vacanciers" })); }
function safeStorageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeStorageSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (error) { console.error(`FINCA MARIA : impossible d’enregistrer ${key}`, error); return false; } }
function fincaStorageEntries() {
  const entries = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && isFincaStorageKey(key)) entries.push([key, safeStorageGet(key)]);
    }
  } catch (error) {
    console.error("FINCA MARIA : lecture du stockage local impossible", error);
  }
  return entries;
}
function loadAssignments() { try { const value = JSON.parse(safeStorageGet(ASSIGNMENTS_STORAGE_KEY) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function loadNavigation() { try { const value = JSON.parse(safeStorageGet(NAV_STORAGE_KEY) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function formatDate(value) { if (!value) return "À déterminer"; const [year, month, day] = String(value).split("-"); return year && month && day ? `${day}/${month}/${year}` : value; }
function normalizeResponsible(value = "À déterminer") { if (value === "Sofia") return "Sofía"; if (value === "Isabel") return "María Isabel"; if (value === "Autre membre de la famille") return "À déterminer"; return value; }
function normalizeStatus(value = "Action à compléter") { if (value === "Terminée") return "Action accomplie"; if (value === "Attribuée") return "En cours"; return value; }
function suggestedContactMode(mode = "") { const value = mode.toLowerCase(); if (value.includes("whatsapp")) return "WhatsApp"; if (value.includes("mail") || value.includes("email")) return "Mail"; if (value.includes("rendez")) return "Rendez-vous"; if (value.includes("téléphone") || value.includes("telephone")) return "Téléphone"; if (value.includes("sur place") || value.includes("passage")) return "Sur place"; return "Téléphone"; }
function stopToggle(event) { event.stopPropagation(); }
function isFincaStorageKey(key) { return key.startsWith("finca_maria_") || key.startsWith("cortijo_"); }

function exportFincaData() {
  const data = {};
  for (const [key, value] of fincaStorageEntries()) data[key] = value;
  const payload = {
    product: "FINCA MARIA",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINCA_MARIA_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function QuickSelect({ label, value, options, onChange, className = "", hideLabel = false }) {
  return <label className={`fincaQuickField ${className}`.trim()} style={compactChipStyle} onClick={stopToggle} onKeyDown={stopToggle}>{!hideLabel && <span style={compactLabelStyle}>{label}</span>}<select aria-label={label} value={value} style={compactControlStyle} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

function DateChip({ title, value, onChange }) {
  return <label className="fincaQuickField isDue" style={compactChipStyle} onClick={stopToggle} onKeyDown={stopToggle}><span style={compactLabelStyle}>Échéance</span><input type="date" value={value} aria-label={`Échéance ${title}`} style={{ ...compactControlStyle, maxWidth: "8.5rem", colorScheme: "dark" }} onClick={(event) => { stopToggle(event); event.currentTarget.showPicker?.(); }} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ActionScript({ action }) {
  if (!action.script) return null;
  const french = ACTION_SCRIPT_FR[action.id];
  return <div style={{ marginTop: ".75rem" }}><strong>À dire en espagnol</strong><p lang="es">{action.script}</p>{french && <><strong>Traduction française</strong><p>{french}</p></>}</div>;
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
        <div className="fincaResolutionBox" style={{ marginTop: ".45rem", paddingTop: ".7rem" }}><label><span>Résolution / résultat obtenu</span><textarea rows="4" value={resolution} placeholder="Rendez-vous obtenu, réponse reçue, document récupéré…" onChange={(event) => onUpdate(action.id, { resolution: event.target.value })} /></label><small>{resolution ? "Résolution enregistrée automatiquement." : "À remplir dès que l'action avance."}</small></div>
        {action.toObtain?.length > 0 && <div style={{ marginTop: ".85rem" }}><strong>À obtenir / à faire</strong><ul>{action.toObtain.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        {action.expectedProof && <p><strong>Résultat attendu :</strong> {action.expectedProof}</p>}
        {(action.contactHint || action.script) && <details className="fincaReadScript" style={{ marginTop: ".75rem" }}><summary>Détails utiles</summary>{action.contactHint && <p><strong>À savoir :</strong> {action.contactHint}</p>}<ActionScript action={action} /></details>}
      </div>
    </details>
  );
}

function AreaChoice({ area, title, subtitle, icon, stats, onClick }) {
  return <button type="button" className={`fincaAreaChoice fincaAreaChoice--${area}`} onClick={onClick}><span className="fincaAreaIcon"><Icon name={icon} size={48} /></span><span className="fincaAreaText"><strong>{title}</strong><small>{subtitle}</small>{stats && <em>{stats}</em>}</span><span className="fincaAreaArrow" aria-hidden="true">→</span></button>;
}
function SubNav({ items, active, onChange, label }) { return <nav className="fincaSubNav" aria-label={label}>{items.map((item) => <button key={item.id} type="button" className={active === item.id ? "isActive" : ""} onClick={() => onChange(item.id)}><Icon name={item.icon} size={21} /><span>{item.label}</span></button>)}</nav>; }

export function FincaMariaDashboard() {
  const initialNavigation = useMemo(loadNavigation, []);
  const [assignments, setAssignments] = useState(loadAssignments);
  const [area, setArea] = useState("home");
  const [earthTab, setEarthTab] = useState(initialNavigation.earthTab || "gestion");
  const [houseTab, setHouseTab] = useState(initialNavigation.houseTab || "gerer");
  const importRef = useRef(null);

  useEffect(() => { safeStorageSet(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { safeStorageSet(NAV_STORAGE_KEY, JSON.stringify({ area, earthTab, houseTab })); }, [area, earthTab, houseTab]);

  function updateAssignment(actionId, patch) { setAssignments((current) => ({ ...current, [actionId]: { ...(current[actionId] || {}), ...patch } })); }
  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        if (payload?.product !== "FINCA MARIA" || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) throw new Error("Format de sauvegarde non reconnu");
        if (!window.confirm("Restaurer cette sauvegarde FINCA MARIA sur cet appareil ? Les données locales actuelles portant les mêmes noms seront remplacées.")) return;
        for (const [key, value] of Object.entries(payload.data)) {
          if (isFincaStorageKey(key) && typeof value === "string" && !safeStorageSet(key, value)) throw new Error("Stockage local saturé ou indisponible");
        }
        window.location.reload();
      } catch (error) {
        window.alert(`Impossible de restaurer cette sauvegarde : ${error.message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  const actionSummary = useMemo(() => {
    const result = { todo: 0, progress: 0, done: 0 };
    interlocutors.flatMap(actionsFor).forEach((action) => {
      const status = normalizeStatus(assignments[action.id]?.status || "Action à compléter");
      if (status === "Action accomplie") result.done += 1;
      else if (status === "En cours" || status === "En attente") result.progress += 1;
      else result.todo += 1;
    });
    return result;
  }, [assignments]);

  const currentEarth = EARTH_TABS.find((tab) => tab.id === earthTab) || EARTH_TABS[0];
  const currentHouse = HOUSE_TABS.find((tab) => tab.id === houseTab) || HOUSE_TABS[0];

  return (
    <section className="cortijoDashboard fincaMariaShell fincaTwoWorlds" aria-label="FINCA MARIA">
      <style>{`
        .fincaTwoWorlds{min-height:78vh;padding:1rem 1rem 1.4rem}.fincaTopBar{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.35rem .2rem 1.1rem}.fincaTopTools{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}.fincaTopTools button,.fincaTopTools label{min-height:40px;display:inline-flex;align-items:center;border:1px solid rgba(214,169,85,.28);border-radius:999px;padding:.45rem .72rem;background:rgba(0,0,0,.18);color:#efd99d;cursor:pointer;font:inherit;font-size:.82rem}.fincaTopTools input{display:none}.fincaBrand{display:flex;align-items:center;gap:.75rem}.fincaLogo{width:62px;height:62px;display:grid;place-items:center;border:1px solid rgba(239,217,157,.36);border-radius:18px;background:linear-gradient(145deg,rgba(239,217,157,.15),rgba(88,112,73,.12))}.fincaLogo svg{width:50px;height:50px;fill:none;stroke:#efd99d;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.fincaLogo ellipse{fill:rgba(239,217,157,.18)}.fincaBrand strong{display:block;color:#fff3d4;font-family:Georgia,'Times New Roman',serif;font-size:1.18rem;letter-spacing:.08em}.fincaBrand span{display:block;margin-top:.08rem;color:#bfae88;font-size:.74rem}
        .fincaAreaGrid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;max-width:980px;margin:4vh auto 0}.fincaAreaChoice{min-height:260px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1.1rem;text-align:left;border:1px solid rgba(214,169,85,.28);border-radius:26px;padding:2rem;background:linear-gradient(145deg,rgba(16,24,19,.95),rgba(6,10,8,.96));color:#f8e9c4;box-shadow:0 20px 50px rgba(0,0,0,.2);cursor:pointer}.fincaAreaIcon{width:92px;height:92px;display:grid;place-items:center;border-radius:24px;background:rgba(239,217,157,.09);color:#efd99d;border:1px solid rgba(239,217,157,.2)}.fincaAreaText strong{display:block;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.55rem,3vw,2.35rem);color:#fff3d4}.fincaAreaText small{display:block;margin-top:.45rem;color:#cdb98d;font-size:1rem;line-height:1.5}.fincaAreaText em{display:inline-block;margin-top:.65rem;color:#efd99d;font-size:.82rem;font-style:normal}.fincaAreaArrow{font-size:2rem;color:#d8b460}
        .fincaHomePulse{max-width:980px;margin:1rem auto 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.fincaPulseCard{border:1px solid rgba(214,169,85,.18);border-radius:14px;padding:.7rem .8rem;background:rgba(5,9,7,.45)}.fincaPulseCard strong{display:block;color:#fff3d4;font-size:1.08rem}.fincaPulseCard span{display:block;color:#cdb98d;font-size:.8rem;margin-top:.12rem}
        .fincaAreaHeader{display:flex;align-items:center;gap:1rem;margin:.45rem 0 .8rem}.fincaBack{min-height:44px;border:1px solid rgba(214,169,85,.28);border-radius:999px;padding:.55rem .85rem;background:rgba(0,0,0,.18);color:#efd99d;cursor:pointer}.fincaAreaHeader h2{margin:0;color:#fff3d4;font-size:clamp(1.6rem,3vw,2.4rem)}.fincaAreaHeader p{margin:.15rem 0 0;color:#cdb98d}.fincaSubNav{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;padding:8px;border:1px solid rgba(214,169,85,.22);border-radius:18px;background:rgba(4,8,6,.72);margin-bottom:1rem}.fincaSubNav button{min-height:58px;display:flex;align-items:center;justify-content:center;gap:.48rem;border:1px solid transparent;border-radius:12px;padding:.68rem;color:#d8c6a0;background:transparent;font:inherit;font-weight:700;cursor:pointer}.fincaSubNav button.isActive{color:#182019;background:#efd99d;border-color:#f6e5b5}.fincaPanelIntro{margin:.25rem 0 .85rem;padding:.2rem .1rem}.fincaPanelIntro strong{display:block;color:#fff3d4;font-family:Georgia,'Times New Roman',serif;font-size:1.2rem}.fincaPanelIntro span{display:block;margin-top:.18rem;color:#cdb98d;font-size:.9rem}.fincaEarthSection{border:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;margin:0!important}.fincaEarthSection>summary{display:none!important}.fincaEarthSection>:not(summary){margin-left:0!important;margin-right:0!important}.fincaHouseGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.fincaHouseCard{border:1px solid rgba(214,169,85,.2);border-radius:18px;padding:1rem 1.05rem;background:rgba(5,9,7,.5)}.fincaHouseCard h4{margin:.1rem 0 .35rem;color:#fff3d4}.fincaHouseCard p{margin:.25rem 0;color:#d7c39b}.fincaHouseCard ul{margin:.5rem 0 0;padding-left:1.2rem;color:#d7c39b}.fincaHouseOpen{margin-top:.8rem;min-height:46px;border:1px solid rgba(214,169,85,.32);border-radius:999px;padding:.55rem .85rem;background:rgba(214,169,85,.08);color:#efd99d;cursor:pointer}
        @media(max-width:760px){.fincaTwoWorlds{padding:.7rem}.fincaTopBar{align-items:flex-start;flex-direction:column}.fincaTopTools{width:100%}.fincaAreaGrid{grid-template-columns:1fr;margin-top:2vh}.fincaAreaChoice{min-height:190px;padding:1.35rem}.fincaAreaIcon{width:76px;height:76px}.fincaHomePulse{grid-template-columns:1fr}.fincaHouseGrid{grid-template-columns:1fr}.fincaSubNav{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>

      <div className="fincaTopBar">
        <BrandMark />
        <div className="fincaTopTools" aria-label="Outils FINCA MARIA">
          <button type="button" onClick={() => window.location.assign(appViewUrl("reunions"))}>Réunions</button>
          <button type="button" onClick={exportFincaData}>Sauvegarder les données</button>
          <label>Restaurer<input ref={importRef} type="file" accept="application/json,.json" onChange={handleImport} /></label>
        </div>
      </div>

      <div style={{ display: area === "home" ? "block" : "none" }}>
        <div className="fincaAreaGrid">
          <AreaChoice area="terre" title="TERRE" subtitle="Exploitation agricole" stats={`${actionSummary.todo} action${actionSummary.todo > 1 ? "s" : ""} à compléter · année-test 2022/23`} icon="leaf" onClick={() => { setArea("terre"); setEarthTab(earthTab || "gestion"); }} />
          <AreaChoice area="maison" title="MAISON" subtitle="Maison familiale" stats="Séjours · jardin · guide vacanciers" icon="home" onClick={() => { setArea("maison"); setHouseTab(houseTab || "gerer"); }} />
          <a href={appViewUrl("reunions")} className="fincaMainMeetingTile" aria-label="Ouvrir les réunions et conseils de famille"><span className="fincaMeetingIcon" aria-hidden="true">🎙️</span><span><strong>RÉUNIONS</strong><small>Conseils de famille · comptes rendus</small></span><span aria-hidden="true">→</span></a>
        </div>
        <style>{`
          .fincaAreaGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:.8rem}
          /* Accueil compact: les trois modules et les raccourcis tiennent dans un écran standard. */
          .fincaTwoWorlds:has(.fincaAreaGrid) {min-height:0;padding:.55rem .85rem .8rem}
          .fincaTwoWorlds:has(.fincaAreaGrid) .fincaTopBar{padding:0 .2rem .4rem}
          .fincaAreaGrid{margin:.5rem auto 0!important;max-width:1100px}
          .fincaAreaGrid .fincaAreaChoice{min-height:156px!important;padding:.85rem!important;gap:.65rem!important;border-radius:18px!important;box-shadow:none!important}
          .fincaAreaGrid .fincaAreaIcon{width:58px!important;height:58px!important;border-radius:15px!important}
          .fincaAreaGrid .fincaAreaIcon svg{width:34px!important;height:34px!important}
          .fincaAreaGrid .fincaAreaText strong{font-size:clamp(1.3rem,2vw,1.85rem)!important}
          .fincaAreaGrid .fincaAreaText small{font-size:.82rem!important;margin-top:.2rem!important;line-height:1.2!important}
          .fincaAreaGrid .fincaAreaText em{font-size:.7rem!important;margin-top:.35rem!important}
          .fincaAreaGrid .fincaAreaArrow{font-size:1.3rem!important}
          .fincaHomePulse{margin:.5rem auto 0!important}
          .fincaPulseCard{padding:.42rem .65rem!important}
          .fincaMainMeetingTile{min-height:156px!important}
          @media(max-width:900px){.fincaAreaGrid .fincaAreaChoice,.fincaMainMeetingTile{min-height:95px!important}}
          @media(max-height:800px) and (min-width:901px){.fincaAreaGrid .fincaAreaChoice,.fincaMainMeetingTile{min-height:126px!important}.fincaAreaGrid .fincaAreaIcon{width:48px!important;height:48px!important}}

          .fincaAreaGrid > *{min-width:0}
          .fincaAreaGrid .fincaAreaChoice{min-width:0}
          .fincaAreaGrid h2,.fincaAreaGrid strong{overflow-wrap:normal}
          .fincaMainMeetingTile{display:flex;align-items:center;justify-content:center;gap:.65rem;min-width:0;min-height:156px;padding:.8rem;border:1px solid #766332;border-radius:24px;background:#0c1610;color:#f5e3ad;text-decoration:none}
          .fincaMainMeetingTile strong{display:block;font:700 clamp(1.2rem,1.8vw,1.8rem) Georgia,serif}
          .fincaMainMeetingTile small{display:block;margin-top:.5rem;font-size:.84rem}
          .fincaMeetingIcon{font-size:1.35rem;padding:.65rem;border:1px solid #766332;border-radius:22px}
          .fincaMainMeetingTile:hover{background:#1a291d}
          @media(max-width:900px){.fincaAreaGrid{grid-template-columns:1fr!important}.fincaMainMeetingTile{min-height:130px}}
        `}</style>
        <nav aria-label="Accès aux outils familiaux" style={{display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:".55rem",margin:".55rem auto"}}>
          {[
            ["📁 BAÚL", "Documents familiaux", "baul"],
            ["🗑️ Corbeille", "Retrouver un élément", "corbeille"]
          ].map(([label, subtitle, view]) => <a key={view} href={appViewUrl(view)} style={{display:"inline-flex",alignItems:"center",gap:".5rem",padding:".55rem .8rem",border:"1px solid #766332",borderRadius:"10px",background:"#152019",color:"#f5e2aa",textDecoration:"none"}}>
            <strong style={{fontSize:".9rem"}}>{label}</strong><span style={{fontSize:".76rem",opacity:.8}}>{subtitle}</span>
          </a>)}
        </nav>
        <div className="fincaHomePulse">
          <div className="fincaPulseCard"><strong>{actionSummary.todo}</strong><span>actions à compléter</span></div>
          <div className="fincaPulseCard"><strong>{actionSummary.progress}</strong><span>actions en cours / attente</span></div>
          <div className="fincaPulseCard"><strong>{actionSummary.done}</strong><span>actions accomplies</span></div>
        </div>
      </div>

      <div style={{ display: area === "terre" ? "block" : "none" }}><div className="fincaAreaHeader"><button type="button" className="fincaBack" onClick={() => setArea("home")}>← Accueil</button><div><h2>TERRE</h2><p>Exploitation agricole</p></div></div><SubNav items={EARTH_TABS} active={earthTab} onChange={setEarthTab} label="Terre" /><div className="fincaPanelIntro"><strong>{currentEarth.title}</strong><span>Une rubrique à la fois</span></div></div>

      <div id="finca-maria-sections" className="fincaMariaSections" style={{ display: area === "terre" ? "block" : "none" }}>
        <details className="cortijoView fincaEarthSection" open style={{ display: earthTab === "gestion" ? "block" : "none" }}><summary><h3>Gestion</h3></summary><div className="cortijoWorkflow"><ol>{managementTimeline.map((item) => <li key={`${item.period}-${item.title}`}><strong>{item.period}</strong><span><b>{item.title}</b><br />{item.text}</span></li>)}</ol></div></details>
        <details className="cortijoView fincaEarthSection" open style={{ display: earthTab === "analyse" ? "block" : "none" }}><summary><h3>Analyse</h3></summary><div className="cortijoList">{analysisFindings.map((item) => <article className="cortijoCard" key={item.title}><div className="cortijoCardTop"><span className="cortijoPill">{item.status}</span></div><h4>{item.title}</h4><p>{item.text}</p></article>)}</div></details>
        <details className="cortijoView fincaEarthSection" open style={{ display: earthTab === "strategie" ? "block" : "none" }}><summary><h3>Stratégie</h3></summary><div className="cortijoWorkflow"><ol>{strategy.map((item, index) => <li key={item}><strong>{index + 1}</strong><span>{item}</span></li>)}</ol></div></details>
        <details className="cortijoView fincaEarthSection" open style={{ display: earthTab === "actions" ? "block" : "none" }}><summary><h3>Dossiers & actions</h3></summary><div className="fincaDossierStack">{interlocutors.map((item) => { const dossierActions = actionsFor(item); return <details className="fincaDossierCard" key={item.id}><summary className="fincaDossierSummary"><div><span className="cortijoPill">{item.label}</span><h4>{item.subtitle}</h4></div><span className="fincaDossierCount">{dossierActions.length} action{dossierActions.length > 1 ? "s" : ""}</span></summary><div className="fincaDossierBody"><div className="cortijoList fincaActionList">{dossierActions.map((action) => <DossierAction key={action.id} action={action} dossierLabel={item.label} assignment={assignments[action.id] || {}} onUpdate={updateAssignment} />)}</div><button type="button" className="fincaDossierOpen" onClick={() => openDossier(item.id)}>Ouvrir le dossier — {item.label}</button></div></details>; })}</div></details>
      </div>

      <div style={{ display: area === "maison" ? "block" : "none" }}>
        <div className="fincaAreaHeader"><button type="button" className="fincaBack" onClick={() => setArea("home")}>← Accueil</button><div><h2>MAISON</h2><p>Maison familiale</p></div></div>
        <SubNav items={HOUSE_TABS} active={houseTab} onChange={setHouseTab} label="Maison" />
        <div className="fincaPanelIntro"><strong>{currentHouse.title}</strong><span>Accès direct aux outils utiles pendant un séjour</span></div>

        <div style={{ display: houseTab === "gerer" ? "block" : "none" }}><div className="fincaHouseGrid"><article className="fincaHouseCard"><h4>Fonctionnement</h4><p>Clés, compteurs, eau, électricité, équipements et consignes utiles.</p></article><article className="fincaHouseCard"><h4>Ménage</h4><p>Ce qu’il faut préparer, nettoyer et laisser prêt avant un départ.</p></article><article className="fincaHouseCard"><h4>Couchages</h4><p>Qui dort où, combien de places et ce qu’il faut prévoir.</p></article><article className="fincaHouseCard"><h4>Tout le module Maison</h4><p>Visite, fonctionnement, ménage, présences, inventaire, jardin et sorties.</p><button type="button" className="fincaHouseOpen" onClick={() => openHouse()}>Ouvrir le module Maison</button></article></div></div>
        <div style={{ display: houseTab === "afaire" ? "block" : "none" }}><div className="fincaHouseGrid"><article className="fincaHouseCard"><h4>Avant l’arrivée</h4><ul><li>Vérifier eau et électricité</li><li>Préparer les couchages</li><li>Contrôler les produits indispensables</li></ul></article><article className="fincaHouseCard"><h4>Pendant le séjour</h4><ul><li>Noter les réparations à faire</li><li>Mettre à jour les besoins</li><li>Signaler tout problème de fonctionnement</li></ul></article><article className="fincaHouseCard"><h4>Avant de partir</h4><ul><li>Ménage et linge</li><li>Fermeture eau, fenêtres et accès</li><li>Rangement des clés et vérification finale</li></ul></article></div></div>
        <div style={{ display: houseTab === "presences" ? "block" : "none" }}><article className="fincaHouseCard"><h4>Planning familial</h4><p>Voir les arrivées, départs, couchages et remarques de séjour.</p><button type="button" className="fincaHouseOpen" onClick={() => openHouse("presences")}>Ouvrir les présences</button></article></div>
        <div style={{ display: houseTab === "inventaire" ? "block" : "none" }}><article className="fincaHouseCard"><h4>Inventaire de la maison</h4><p>Mobilier, linge, vaisselle, appareils, consommables, réparations et achats.</p><button type="button" className="fincaHouseOpen" onClick={() => openHouse("inventaire")}>Ouvrir l’inventaire</button></article></div>
        <div style={{ display: houseTab === "jardin" ? "block" : "none" }}><div className="fincaHouseGrid"><article className="fincaHouseCard"><h4>Patio & arbres</h4><p>Suivi du laurier, du cerisier et du citronnier : intervention, photos avant/après et réaction de l’arbre.</p><button type="button" className="fincaHouseOpen" onClick={() => openHouse("patio-jardin")}>Ouvrir le suivi du jardin</button></article><article className="fincaHouseCard"><h4>Point actuel</h4><p>Taille progressive, pas de rabattage brutal ; priorité au puits de lumière du citronnier et à la réduction du volume côté voiture.</p></article></div></div>
        <div style={{ display: houseTab === "sorties" ? "block" : "none" }}><div className="fincaHouseGrid"><article className="fincaHouseCard"><h4>Carnet des bonnes adresses</h4><p>Plages, villages, balades et excursions réellement conseillés par la famille, avec parking, meilleur moment et notes personnelles.</p><button type="button" className="fincaHouseOpen" onClick={() => openHouse("sorties")}>Gérer les lieux</button></article><article className="fincaHouseCard"><h4>Guide vacanciers</h4><p>Une vue simple à montrer ou imprimer, sans les informations privées de gestion de la maison.</p><button type="button" className="fincaHouseOpen" onClick={openVisitorGuide}>Ouvrir le guide vacanciers</button></article></div></div>
      </div>
    </section>
  );
}
