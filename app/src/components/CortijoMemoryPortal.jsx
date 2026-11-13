import { useEffect, useMemo, useState } from "react";
import { cortijoTerrainHistory } from "../data/cortijoTerrainHistory";
import { cortijoActionDesk } from "../data/cortijoActionDesk";

const ACTION_FACTS_STORAGE_KEY = "cortijo_action_facts_v1";
const ASSIGNMENTS_STORAGE_KEY = "cortijo_action_assignments_v1";
const ACTION_PLAN_DATE = "18/08/2026";
const RESPONSIBLE_OPTIONS = ["À déterminer", "Sofia", "Isabel", "Clemencia", "Autre membre de la famille"];
const STATUS_OPTIONS = ["Action à compléter", "Attribuée", "En cours", "En attente", "Terminée"];
const CONTACT_MODE_OPTIONS = ["Téléphone", "WhatsApp", "Mail", "Sur place", "Rendez-vous"];
const CONTACT_WITH_OPTIONS = ["San Juan", "ASAJA", "Peláez", "Agriculteur / Vitines", "Autre interlocuteur"];

const INTERLOCUTORS = [
  {
    id: "san-juan",
    label: "San Juan",
    subtitle: "Coopérative / apports / liquidations",
    summary: "Le dossier remonte désormais jusqu'à 2007. Pour les années anciennes, les kilos visibles dans les pièces San Juan sont ceux du compte de María : ils ne doivent pas être confondus automatiquement avec la production totale de la finca."
  },
  {
    id: "asaja",
    label: "ASAJA",
    subtitle: "PAC / SIGPAC / surfaces / aides",
    summary: "L'historique PAC retrouvé remonte à 2007. Pour 2026, la déclaration du 12/03/2026 est bien référencée, mais les pages détaillées 2026 ne figurent pas dans les pièces actuellement indexées. Les pages détaillées retrouvées sont celles de la PAC 2024 : elles restent donc séparées et ne sont pas recyclées comme données 2026."
  },
  {
    id: "pelaez",
    label: "Peláez",
    subtitle: "Comptabilité / fiscalité / archives",
    summary: "Peláez était le comptable de María et préparait ses déclarations fiscales. Ses archives peuvent aider à reconstituer les revenus et justificatifs agricoles anciens."
  },
  {
    id: "agriculteur",
    label: "Agriculteur / Vitines",
    subtitle: "Baux / travaux / récolte / traitements / factures",
    summary: "Le bail se termine en 2020. Après une période de renégociation, la famille décide vers 2023/24 de ne pas reconduire le contrat et d'exploiter directement, en confiant à José les travaux demandés."
  }
];

const ACTION_IDS = {
  "san-juan": ["san-juan-historique"],
  asaja: ["asaja-visite-technique"],
  pelaez: ["pelaez-role-fiscal"],
  agriculteur: ["vitines-378-detail"]
};

function loadArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function loadObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const projectMemoryEntries = [
  {
    date: "12/02/2007 → 11/02/2013",
    type: "Contrat",
    title: "Premier bail écrit avec José López Gallego",
    summary: "María reçoit 15 % de la production d'olives ; les frais d'exploitation sont à la charge du fermier selon le contrat.",
    location: "BAÚL privé — contrats",
    status: "[P] Prouvé",
    actors: ["agriculteur"]
  },
  {
    date: "12/07/2007",
    type: "PAC",
    title: "Contrôle terrain PAC — campagne 2006/07",
    summary: "Un lot administratif primaire retrace un contrôle terrain / photo-interprétation au nom de María Serrano García, expediente 7007204. Certaines pages portent « Sin incidencia » ; d'autres signalent que l'usage observé ne coïncide pas avec l'usage déclaré. Le lot comporte 14 images alors que la pagination interne va jusqu'à 15 : les surfaces ne sont donc pas additionnées comme surface totale tant que la complétude n'est pas vérifiée.",
    location: "BAÚL privé — PAC_CONTROLE_TERRAIN_2007 — 14 images",
    status: "[P] Pièce administrative primaire — complétude à vérifier",
    actors: ["asaja"]
  },
  {
    date: "2007/08",
    type: "Production",
    title: "Première campagne San Juan retrouvée dans le corpus",
    summary: "Les pièces San Juan lisibles indiquent 4 468 kg d'olives, 815,03 kg d'huile, un rendement de 18,24 % et une acidité de 0,68. Il s'agit de la quantité portée dans les pièces du compte de María, pas d'un total de finca à retenir automatiquement.",
    location: "BAÚL privé — San Juan — CamScanner 21.22_4, 21.22_5 et 21.22_7",
    status: "[P] Pièces San Juan lisibles",
    actors: ["san-juan"]
  },
  {
    date: "2008/09",
    type: "Production",
    title: "Campagne San Juan 2008/09",
    summary: "Les pièces indiquent 1 795 kg d'olives, 316,49 kg d'huile, un rendement de 17,63 % et une acidité de 0,36. Comme pour les autres années de bail, ce chiffre est d'abord une donnée du compte de María.",
    location: "BAÚL privé — San Juan — CamScanner 21.20_6, 21.20_7, 21.20_8 et 21.22_2",
    status: "[P] Pièces San Juan lisibles",
    actors: ["san-juan"]
  },
  {
    date: "2009/10",
    type: "Production",
    title: "Deux groupes de pièces San Juan pour 2009/10",
    summary: "Le corpus contient au moins un groupe à 1 114 kg d'olives / 231,27 kg d'huile et un autre à 2 537 kg / 520,98 kg. Ils restent séparés : on ne les transforme pas en total annuel tant que leur articulation n'est pas verrouillée.",
    location: "BAÚL privé — San Juan — groupes V25P03 et V25P04",
    status: "[P] Pièces présentes — total annuel non fixé",
    actors: ["san-juan"]
  },
  {
    date: "2010/11",
    type: "Production",
    title: "Campagne San Juan 2010/11",
    summary: "Les pièces indiquent 1 405 kg d'olives, 264,82 kg d'huile et un rendement de 18,85 %.",
    location: "BAÚL privé — San Juan — CamScanner 21.24_32, 21.24_34 et 21.24_37",
    status: "[P] Pièces San Juan lisibles",
    actors: ["san-juan"]
  },
  {
    date: "2011/12",
    type: "Production",
    title: "Campagne San Juan 2011/12",
    summary: "Les pièces indiquent 3 635 kg d'olives, 824,64 kg d'huile et un rendement de 22,69 %.",
    location: "BAÚL privé — San Juan — CamScanner 21.24_23, 21.24_26, 21.24_28 et 21.24_30",
    status: "[P] Pièces San Juan lisibles",
    actors: ["san-juan"]
  },
  {
    date: "2012/13",
    type: "Production",
    title: "Plusieurs groupes documentaires pour 2012/13",
    summary: "Le corpus contient un groupe à 2 174 kg d'olives / 390,25 kg d'huile et un autre à 489 kg. Le second présente une incohérence de lecture sur le rendement ; ces lignes restent donc séparées et ne sont pas additionnées comme total annuel.",
    location: "BAÚL privé — San Juan — groupes V25P10 et V25P11",
    status: "[P] Pièces présentes — consolidation prudente",
    actors: ["san-juan"]
  },
  {
    date: "2013/14",
    type: "Production",
    title: "Plusieurs groupes documentaires pour 2013/14",
    summary: "Le corpus contient notamment une ligne à 1 163 kg et un groupe à 3 463 kg / 696,14 kg d'huile. Une incohérence OCR touche l'une des lignes ; on conserve donc les groupes séparés au lieu d'inventer un total.",
    location: "BAÚL privé — San Juan — groupes V25P08 et V25P09",
    status: "[P] Pièces présentes — consolidation prudente",
    actors: ["san-juan"]
  },
  {
    date: "12/03/2014 → 11/03/2020",
    type: "Contrat",
    title: "Deuxième bail écrit",
    summary: "Le même principe de 15 % est reconduit. María décède en avril 2019 ; le bail continue avec les héritiers jusqu'à son terme.",
    location: "BAÚL privé — contrats",
    status: "[P] Prouvé",
    actors: ["agriculteur"]
  },
  {
    date: "2014/15 → 2017/18",
    type: "Production",
    title: "Quatre scénarios de production à confirmer",
    summary: "Les scénarios donnent environ 10,37 t ; 25,69 t ; 11,48 t ; 26,72 t uniquement si les kilos familiaux représentent exactement 15 % de tous les apports. Ce ne sont pas des totaux officiels. La base 2015/16 présente notamment un groupe de 9 064 kg non résolu.",
    location: "BAÚL privé — documents coopérative + contrat + calcul",
    status: "[C conditionnel] Hypothèse des 15 %",
    actors: ["san-juan"]
  },
  {
    date: "2017/18",
    type: "Production",
    title: "Pièces San Juan 2017/18 retrouvées",
    summary: "Un groupe documentaire lisible indique 4 008 kg d'olives et 851,60 kg d'huile. Le rendement calculé à partir de ces deux valeurs est d'environ 21,25 %. Cette donnée brute appartient au dossier coopérative ; la production totale de finca est traitée séparément par reconstitution contractuelle.",
    location: "BAÚL privé — San Juan — CamScanner 21.30_2 et 21.30_5",
    status: "[P/C] Pièces lisibles + rendement calculé",
    actors: ["san-juan"]
  },
  {
    date: "2018/19",
    type: "Production",
    title: "Repère de 1 590 kg à expliquer",
    summary: "Un document ancien fait apparaître 1 590 kg. Il reste à établir s'il s'agit d'un total de campagne, d'un apport ou d'une autre ligne comptable.",
    location: "BAÚL privé — documents San Juan",
    status: "[P] Chiffre retrouvé — nature à confirmer",
    actors: ["san-juan"]
  },
  {
    date: "2019",
    type: "PAC",
    title: "Continuité des démarches PAC après le décès de María",
    summary: "Les archives familiales retracent des démarches au nom de María puis de María Josefa, avec intervention d'ASAJA et régularisation administrative.",
    location: "BAÚL privé — PAC / correspondances 2019",
    status: "[P] Historique documentaire",
    actors: ["asaja"]
  },
  {
    date: "03/06/2019 → 21/06/2019",
    type: "Fiscalité",
    title: "Peláez intervient sur les impôts et les pièces agricoles de María",
    summary: "Les échanges familiaux le relient à la préparation fiscale et à des pièces venant de la coopérative et des subventions agricoles.",
    location: "BAÚL privé — mails familiaux 2019",
    status: "[P/D] Documenté et déclaré",
    actors: ["pelaez"]
  },
  {
    date: "24/05/2020",
    type: "Correspondance",
    title: "Projet de nouveau contrat préparé mais non signé",
    summary: "Des échanges préparent de nouvelles conditions ; aucun nouveau bail signé n'est retenu dans les pièces actuelles.",
    location: "BAÚL privé — correspondance 2020",
    status: "[P/D] Pièce + mémoire familiale",
    actors: ["agriculteur"]
  },
  {
    date: "2020 → env. 2023/24",
    type: "Gestion",
    title: "Période d'attente et de renégociation du contrat",
    summary: "Après la fin du bail, José continue à intervenir dans l'attente d'une éventuelle reconduction. Les échanges familiaux portent sur la renégociation des conditions, mais aucun nouveau contrat n'est signé.",
    location: "Correspondances et mémoire familiale — date précise à consolider",
    status: "[D/P] Déclaré + échanges à rapprocher",
    actors: ["agriculteur"]
  },
  {
    date: "2022",
    type: "PAC",
    title: "PAC 2022 refusée pour la condition d'agriculteur actif",
    summary: "Une réponse administrative retrouvée indique que le dossier PAC 2022 a été entièrement refusé parce que la condition d'agriculteur actif n'avait pas pu être justifiée. Cette information appartient à l'historique administratif et ne préjuge pas des campagnes ultérieures.",
    location: "BAÚL privé — CamScanner 18.40_2",
    status: "[P] Réponse administrative retrouvée",
    actors: ["asaja"]
  },
  {
    date: "Environ 2023/24",
    type: "Gestion",
    title: "Décision de ne pas reconduire le bail et de passer en exploitation directe",
    summary: "La famille indique à José qu'aucun nouveau contrat de fermage ne sera conclu. La finca sera exploitée directement par la famille et José continuera seulement les travaux qui lui sont confiés, notamment le labour. La date exacte doit être retrouvée dans les échanges.",
    location: "Mémoire familiale + échanges à retrouver",
    status: "[D] Décision déclarée — date exacte à documenter",
    actors: ["agriculteur"]
  },
  {
    date: "2023/24",
    type: "Production",
    title: "Trois vales totalisent 2 294 kg",
    summary: "217 + 1 562 + 515 = 2 294 kg. Les pièces indiquent aussi 389,06 kg d'huile et un rendement de 16,96 %.",
    location: "BAÚL privé — vales et liquidation CPNA 23-24",
    status: "[P] Documenté — complétude à confirmer",
    actors: ["san-juan"]
  },
  {
    date: "05/04/2024",
    type: "PAC",
    title: "PAC 2024 détaillée retrouvée — à ne pas confondre avec la PAC 2026",
    summary: "Le dossier détaillé retrouvé porte le registre du 05/04/2024 et l'expediente 01245161. Il est au nom de María Josefa de los Ríos Serrano. Les pages lisibles montrent le polígono 185 avec les parcelles 25 et 27 et plusieurs recintos ; elles mentionnent notamment l'olivier Hojiblanca, le triticale, l'aide de base au revenu (ABRS), l'aide à l'olivier à difficultés spécifiques et haute valeur environnementale, la rotation avec espèces améliorantes et la couverture végétale. Ces données servent de repère 2024, jamais de substitution au détail 2026.",
    location: "BAÚL privé — CamScanner 18.47_1 à 18.47_19",
    status: "[P] PAC 2024 identifiée et traduite",
    actors: ["asaja"]
  },
  {
    date: "2024/25",
    type: "Production",
    title: "6 551 kg avec liquidation finale",
    summary: "Les pièces indiquent 6 551 kg d'olives, 1 357,37 kg d'huile et un rendement de 20,72 %.",
    location: "BAÚL privé — liquidation CPNA 24-25",
    status: "[P] Documenté — complétude à confirmer",
    actors: ["san-juan"]
  },
  {
    date: "2025/26",
    type: "Production",
    title: "Total de campagne encore à consolider",
    summary: "Le corpus contient plusieurs mentions d'apports 2026 qui ne doivent pas être additionnées sans vérifier les tickets originaux. Le relevé officiel San Juan reste la référence pour fixer le total annuel.",
    location: "BAÚL privé — tickets / comptes rendus / relevé San Juan à rapprocher",
    status: "À consolider",
    actors: ["san-juan", "agriculteur"]
  },
  {
    date: "12/03/2026",
    type: "PAC",
    title: "PAC 2026 — audit des pièces disponibles terminé",
    summary: "La déclaration ASAJA / PAC 2026 datée du 12/03/2026 est bien référencée dans le corpus. En revanche, les pièces actuellement indexées ne contiennent pas le jeu de pages détaillées 2026 permettant d'affirmer la liste exacte des recintos, les surfaces, les cultures ou les lignes d'aide de cette campagne. Le dossier détaillé retrouvé et lisible est celui de 2024, enregistré le 05/04/2024 sous l'expediente 01245161 ; les surfaces cadastrales de 2017 sont encore une autre source. Elles ne sont donc pas recopiées dans 2026. La conclusion sur les pièces disponibles est désormais fixée : déclaration 2026 présente, détail 2026 non retrouvé dans les pièces indexées.",
    location: "BAÚL privé — référence ASAJA / PAC 2026 du 12/03/2026",
    status: "[P] Audit clos sur pièces disponibles — détail 2026 non retrouvé",
    actors: ["asaja"]
  },
  {
    date: "04/04/2026",
    type: "Facture",
    title: "Facture Agrícola Vitines n°378 — 5 445 € TTC",
    summary: "La facture regroupe récolte et travaux phytosanitaires. Les comptes rendus citent traitement foliaire, cuve de 3 000 L, 8 h de débroussaillage et deux cuves de liquide au sol ; le détail financier et technique reste à obtenir.",
    location: "BAÚL privé — facture n°378 + comptes rendus",
    status: "[P] Facture documentée",
    actors: ["agriculteur"]
  }
];

const filters = ["Tout", "Contrat", "Correspondance", "Gestion", "Production", "PAC", "Fiscalité", "Facture", "Terrain", "Cartographie", "Réponse"];

function inferActors(entry) {
  if (Array.isArray(entry.actors) && entry.actors.length) return entry.actors;
  const haystack = `${entry.title || ""} ${entry.summary || ""} ${entry.location || ""} ${entry.answerer || ""}`.toLowerCase();
  const actors = [];
  if (/san juan|coopérative|cooperativa|vale|liquidation/.test(haystack)) actors.push("san-juan");
  if (/asaja|pac|sigpac/.test(haystack)) actors.push("asaja");
  if (/peláez|pelaez|fiscal|impôt|renta|comptable/.test(haystack)) actors.push("pelaez");
  if (/agriculteur|vitines|josé|jose |traitement|récolte|recolte|travaux|terrain|bail|contrat/.test(haystack)) actors.push("agriculteur");
  return actors;
}

function actionsFor(contactId) {
  return (ACTION_IDS[contactId] || [])
    .map((id) => cortijoActionDesk.find((action) => action.id === id))
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "À déterminer";
  const [year, month, day] = String(value).split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return value;
}

function suggestedContactMode(mode = "") {
  const value = mode.toLowerCase();
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("mail") || value.includes("email")) return "Mail";
  if (value.includes("rendez")) return "Rendez-vous";
  if (value.includes("téléphone") || value.includes("telephone")) return "Téléphone";
  if (value.includes("sur place") || value.includes("passage")) return "Sur place";
  return "Téléphone";
}

function ActionControl({ label, value, children }) {
  return (
    <details className="fincaActionControl">
      <summary>
        <span>{label}</span>
        <strong>{value || "À déterminer"}</strong>
      </summary>
      <div className="fincaActionControlBody">{children}</div>
    </details>
  );
}

export function CortijoMemoryPortal() {
  const params = new URLSearchParams(window.location.search);
  const requestedContact = params.get("contact");
  const initialContact = INTERLOCUTORS.some((item) => item.id === requestedContact) ? requestedContact : "san-juan";
  const [activeContact, setActiveContact] = useState(initialContact);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tout");
  const [actionFacts] = useState(() => loadArray(ACTION_FACTS_STORAGE_KEY));
  const [assignments, setAssignments] = useState(() => loadObject(ASSIGNMENTS_STORAGE_KEY));

  useEffect(() => {
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  const activeInterlocutor = INTERLOCUTORS.find((item) => item.id === activeContact) || INTERLOCUTORS[0];
  const activeActions = actionsFor(activeContact);
  const memoryEntries = useMemo(() => [...actionFacts, ...cortijoTerrainHistory, ...projectMemoryEntries], [actionFacts]);

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return memoryEntries.filter((entry) => {
      const matchesContact = inferActors(entry).includes(activeContact);
      const matchesFilter = filter === "Tout" || entry.type === filter;
      const haystack = `${entry.date || ""} ${entry.type || ""} ${entry.title || ""} ${entry.summary || ""} ${entry.location || ""} ${entry.status || ""} ${entry.answerer || ""} ${entry.recordedBy || ""} ${entry.documentRef || ""}`.toLowerCase();
      return matchesContact && matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [query, filter, memoryEntries, activeContact]);

  function selectContact(id) {
    setActiveContact(id);
    setQuery("");
    setFilter("Tout");
    window.history.replaceState(null, "", `/?view=cortijo-memoire&contact=${id}`);
  }

  function updateAssignment(actionId, patch) {
    setAssignments((current) => ({
      ...current,
      [actionId]: {
        ...(current[actionId] || {}),
        ...patch
      }
    }));
  }

  return (
    <main className="cortijoExportApp">
      <section className="cortijoExportHero">
        <div>
          <span className="cortijoExportEyebrow">FINCA MARIA</span>
          <h1>HISTORIQUES ET ACTIONS</h1>
          <p>Choisis San Juan, ASAJA, Peláez ou l'agriculteur pour retrouver uniquement son dossier.</p>
        </div>
      </section>

      <details className="cortijoView" open>
        <summary className="cortijoPanelTitle"><span>01</span><div><h3>Les quatre dossiers</h3><p>Un dossier par interlocuteur.</p></div></summary>
        <div className="cortijoActionGrid">
          {INTERLOCUTORS.map((item, index) => (
            <button type="button" key={item.id} className={activeContact === item.id ? "isActive" : ""} onClick={() => selectContact(item.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.label}</strong>
              <p>{item.subtitle}</p>
            </button>
          ))}
        </div>
      </details>

      <details className="cortijoView" open>
        <summary className="cortijoPanelTitle"><span>R</span><div><h3>{activeInterlocutor.label}</h3><p>Repères déjà connus.</p></div></summary>
        <div className="cortijoFocusPanel">
          <div>
            <span className="cortijoEyebrow">{activeInterlocutor.label}</span>
            <h3>Repères déjà connus</h3>
            <p>{activeInterlocutor.summary}</p>
          </div>
        </div>
      </details>

      <details className="cortijoView" open aria-label={`Actions ${activeInterlocutor.label}`}>
        <summary className="cortijoPanelTitle"><span>A</span><div><h3>Carte d'actions — {activeInterlocutor.label}</h3><p>La carte reste compacte ; chaque réglage s'ouvre séparément comme un petit volet.</p></div></summary>
        <div className="cortijoList fincaActionList">
          {activeActions.length === 0 && <article className="cortijoCard"><p>Aucune action extérieure à attribuer pour le moment.</p></article>}
          {activeActions.map((action) => {
            const assignment = assignments[action.id] || {};
            const decidedAt = action.decidedAt || ACTION_PLAN_DATE;
            const responsible = assignment.assignedTo || "À déterminer";
            const dueAt = assignment.dueAt || "";
            const status = assignment.status || "Action à compléter";
            const contactMode = assignment.contactMode || suggestedContactMode(action.mode);
            const contactWith = assignment.contactWith || action.contact || activeInterlocutor.label;
            const withOptions = Array.from(new Set([contactWith, action.contact, ...CONTACT_WITH_OPTIONS].filter(Boolean)));

            return (
              <details className="cortijoCard fincaActionCard" key={action.id}>
                <summary>
                  <div className="fincaActionTopline">
                    <span className="cortijoPill">{action.priority}</span>
                    <span className="fincaMiniPill">{status}</span>
                  </div>
                  <h4>{action.title}</h4>
                  <div className="fincaActionSnapshot">
                    <span><b>Mode</b>{contactMode}</span>
                    <span><b>Avec</b>{contactWith}</span>
                    <span><b>Échéance</b>{formatDate(dueAt)}</span>
                    <span><b>Attribution</b>{responsible}</span>
                  </div>
                </summary>

                <div className="fincaActionExpanded">
                  <p className="fincaActionRegistered"><strong>Action inscrite le :</strong> {formatDate(decidedAt)}</p>

                  <div className="fincaActionControls">
                    <ActionControl label="Mode de contact" value={contactMode}>
                      <label>
                        <span>Choisir le mode</span>
                        <select value={contactMode} onChange={(event) => updateAssignment(action.id, { contactMode: event.target.value })}>
                          {CONTACT_MODE_OPTIONS.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                        </select>
                      </label>
                    </ActionControl>

                    <ActionControl label="Avec" value={contactWith}>
                      <label>
                        <span>Interlocuteur</span>
                        <select value={contactWith} onChange={(event) => updateAssignment(action.id, { contactWith: event.target.value })}>
                          {withOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </label>
                    </ActionControl>

                    <ActionControl label="Échéance" value={formatDate(dueAt)}>
                      <label>
                        <span>Date</span>
                        <input type="date" value={dueAt} onChange={(event) => updateAssignment(action.id, { dueAt: event.target.value })} />
                      </label>
                    </ActionControl>

                    <ActionControl label="Attribution" value={responsible}>
                      <label>
                        <span>Responsable</span>
                        <select value={responsible} onChange={(event) => updateAssignment(action.id, { assignedTo: event.target.value })}>
                          {RESPONSIBLE_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </label>
                    </ActionControl>

                    <ActionControl label="Suivi" value={status}>
                      <label>
                        <span>État de l'action</span>
                        <select value={status} onChange={(event) => updateAssignment(action.id, { status: event.target.value })}>
                          {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>
                    </ActionControl>
                  </div>

                  <p><strong>But :</strong> {action.goal}</p>
                  {action.contactHint && <p><strong>À savoir avant de contacter :</strong> {action.contactHint}</p>}
                  {action.toObtain?.length > 0 && (
                    <div>
                      <strong>À obtenir</strong>
                      <ul>{action.toObtain.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  )}
                  {action.expectedProof && <p><strong>Résultat attendu :</strong> {action.expectedProof}</p>}
                  {action.script && (
                    <details className="fincaReadScript">
                      <summary>{action.scriptLabel || "Texte à lire / utiliser"}</summary>
                      <p>{action.script}</p>
                    </details>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </details>

      <details className="cortijoView" open aria-label={`Historique ${activeInterlocutor.label}`}>
        <summary className="cortijoPanelTitle"><span>H</span><div><h3>Historique — {activeInterlocutor.label}</h3><p>{visibleEntries.length} repère{visibleEntries.length > 1 ? "s" : ""} dans ce dossier.</p></div></summary>
        <div className="cortijoQuickForms">
          <div className="cortijoForm">
            <input aria-label={`Chercher dans l'historique ${activeInterlocutor.label}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Chercher dans ${activeInterlocutor.label}…`} />
          </div>
          <div className="cortijoForm">
            <label htmlFor="memory-filter">Type</label>
            <select id="memory-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
              {filters.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="cortijoList">
          {visibleEntries.map((entry) => (
            <details className="cortijoCard" key={entry.id || `${entry.date}-${entry.title}`}>
              <summary>
                <div className="cortijoCardTop"><span className="cortijoPill">{entry.type}</span><small>{entry.date}</small></div>
                <h4>{entry.title}</h4>
                <p><small>• État : {entry.status}</small></p>
              </summary>
              <p>{entry.summary}</p>
              <dl>
                <div><dt>Origine</dt><dd>{entry.location}</dd></div>
                <div><dt>État</dt><dd>{entry.status}</dd></div>
                {entry.answerer && <div><dt>Réponse donnée par</dt><dd>{entry.answerer}</dd></div>}
                {entry.documentRef && <div><dt>Document</dt><dd>{entry.documentRef}</dd></div>}
              </dl>
            </details>
          ))}
        </div>
      </details>

      <details className="cortijoExportRule" open>
        <summary><strong>Retour</strong></summary>
        <div><p>Revenir à la situation générale de l'exploitation.</p></div>
        <a href="/">FINCA MARIA</a>
      </details>
    </main>
  );
}