import { useEffect, useState } from "react";
import { cortijoAnomalies, cortijoQuestions, cortijoReminderRhythm } from "../data/cortijo";
import { BaulImportPanel } from "./BaulImportPanel";
import { CortijoTerrainPanel } from "./CortijoTerrainPanel";
import { CortijoActionDesk } from "./CortijoActionDesk";

const QUESTIONS_STORAGE_KEY = "finca_maria_questions_v44_20260913";
const ANOMALIES_STORAGE_KEY = "finca_maria_anomalies_v44_20260913";
const PROJECT_VERSION = "V44";
const DOCUMENTARY_STATE = "13/09/2026";

const NAV_ITEMS = [
  { id: "accueil", label: "Accueil", helper: "Voir l'essentiel à jour" },
  { id: "terrain", label: "Terrain", helper: "Oliviers, sol, eau et limites" },
  { id: "suivi", label: "À faire", helper: "Uniquement les vrais manques" },
  { id: "baul", label: "BAÚL", helper: "Entrer, lire et classer les documents" },
  { id: "export", label: "Export", helper: "Préparer une transmission" }
];

const emptyQuestion = { title: "", assignee: "", linkedTo: "", proof: "" };
const emptyAnomaly = { title: "", type: "", linkedTo: "", question: "" };

function loadFromStorage(key, fallbackValue) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function StatusPill({ children }) {
  return <span className="cortijoPill">{children}</span>;
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function CortijoDashboard() {
  const [activeView, setActiveView] = useState("accueil");
  const [questions, setQuestions] = useState(() => loadFromStorage(QUESTIONS_STORAGE_KEY, cortijoQuestions));
  const [anomalies, setAnomalies] = useState(() => loadFromStorage(ANOMALIES_STORAGE_KEY, cortijoAnomalies));
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [anomalyForm, setAnomalyForm] = useState(emptyAnomaly);

  useEffect(() => localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questions)), [questions]);
  useEffect(() => localStorage.setItem(ANOMALIES_STORAGE_KEY, JSON.stringify(anomalies)), [anomalies]);

  const openQuestions = questions.filter((question) => question.status !== "Réponse complète");
  const openAnomalies = anomalies.filter((anomaly) => anomaly.status !== "Justifié" && anomaly.status !== "Corrigé");

  function addQuestion(event) {
    event.preventDefault();
    if (!questionForm.title.trim()) return;
    setQuestions((current) => [{
      id: `q-${Date.now()}`,
      title: questionForm.title.trim(),
      type: "Question ajoutée",
      assignee: questionForm.assignee.trim() || "À identifier",
      createdAt: new Date().toISOString().slice(0, 10),
      expectedAt: "À définir",
      status: "À poser",
      linkedTo: questionForm.linkedTo.trim() || "À relier",
      urgency: "À qualifier",
      proof: questionForm.proof.trim() || "Preuve à préciser",
      nextReminder: "J+1 — rappel doux"
    }, ...current]);
    setQuestionForm(emptyQuestion);
  }

  function addAnomaly(event) {
    event.preventDefault();
    if (!anomalyForm.title.trim()) return;
    setAnomalies((current) => [{
      id: `a-${Date.now()}`,
      title: anomalyForm.title.trim(),
      type: anomalyForm.type.trim() || "À qualifier",
      severity: "À qualifier",
      status: "À vérifier",
      linkedTo: anomalyForm.linkedTo.trim() || "À relier",
      question: anomalyForm.question.trim() || "Question de contrôle à formuler"
    }, ...current]);
    setAnomalyForm(emptyAnomaly);
  }

  function resetLocalData() {
    if (!window.confirm(`Remettre le board sur l'état documentaire ${PROJECT_VERSION} du ${DOCUMENTARY_STATE} ? Les preuves du BAÚL ne seront pas supprimées.`)) return;
    setQuestions(cortijoQuestions);
    setAnomalies(cortijoAnomalies);
    localStorage.removeItem(QUESTIONS_STORAGE_KEY);
    localStorage.removeItem(ANOMALIES_STORAGE_KEY);
  }

  function exportProjectFollowUp() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`FINCA_MARIA_SUIVI_${date}.json`, {
      project: "FINCA MARIA",
      version: PROJECT_VERSION,
      documentaryState: DOCUMENTARY_STATE,
      exportedAt: new Date().toISOString(),
      questions,
      anomalies,
      reminders: cortijoReminderRhythm,
      note: `Les anciennes clés localStorage restent intactes. Ce board ${PROJECT_VERSION} utilise des clés versionnées pour charger l'état documentaire du ${DOCUMENTARY_STATE} sans être masqué par une ancienne copie locale.`
    });
  }

  return (
    <section className="cortijoDashboard" aria-label={`Espace de travail FINCA MARIA ${PROJECT_VERSION}`}>
      <header className="cortijoHeader">
        <div>
          <span className="cortijoEyebrow">{PROJECT_VERSION} — état documentaire mis à jour le {DOCUMENTARY_STATE}</span>
          <h2>Poste de travail FINCA MARIA</h2>
          <p>Le board ne doit afficher que les informations et questions encore pertinentes après lecture des documents déjà reçus.</p>
        </div>
        <div className="cortijoPrivacyBadge"><strong>Local et privé</strong><span>Les originaux sensibles restent hors de GitHub et du frontend.</span></div>
      </header>

      <nav className="cortijoNav" aria-label="Navigation FINCA MARIA">
        {NAV_ITEMS.map((item) => (
          <button type="button" key={item.id} className={activeView === item.id ? "isActive" : ""} onClick={() => setActiveView(item.id)}>
            <strong>{item.label}</strong><span>{item.helper}</span>
          </button>
        ))}
      </nav>

      {activeView === "accueil" && (
        <div className="cortijoView cortijoHomeView">
          <div className="cortijoStats">
            <div><strong>{openQuestions.length}</strong><span>vraies questions ouvertes</span></div>
            <div><strong>{openAnomalies.length}</strong><span>points de vigilance</span></div>
            <div><strong>{PROJECT_VERSION}</strong><span>version documentaire active</span></div>
          </div>

          <section className="cortijoActionGrid" aria-label="Actions principales">
            <button type="button" onClick={() => setActiveView("terrain")}><span>01</span><strong>Voir le terrain</strong><p>État des oliviers, observations et repères.</p></button>
            <button type="button" onClick={() => setActiveView("suivi")}><span>02</span><strong>Faire les démarches utiles</strong><p>Ne demander que ce que les pièces ne disent pas déjà.</p></button>
            <button type="button" onClick={() => setActiveView("baul")}><span>03</span><strong>Entrer des documents</strong><p>Importer, contrôler les doublons, lire et rapprocher avant de classer.</p></button>
            <button type="button" onClick={() => setActiveView("export")}><span>04</span><strong>Préparer une transmission</strong><p>Exporter un état lisible et qualifié.</p></button>
          </section>

          <section className="cortijoWorkflow">
            <div><span className="cortijoEyebrow">Règle {PROJECT_VERSION}</span><h3>Une pièce reçue doit réduire les questions, pas les multiplier</h3><p>FINCA MARIA part des documents, les rapproche du dossier puis conserve seulement le manque réel.</p></div>
            <ol>
              <li><strong>Lire</strong><span>Texte natif, lecture visuelle, OCR si nécessaire.</span></li>
              <li><strong>Rapprocher</strong><span>Comparer à la mémoire, aux campagnes et aux questions existantes.</span></li>
              <li><strong>Qualifier</strong><span>[P], [D], [C] ou [H].</span></li>
              <li><strong>Fermer / reformuler</strong><span>Une ancienne question résolue ne reste pas dans le board.</span></li>
            </ol>
          </section>

          <section className="cortijoFocusPanel">
            <div><span className="cortijoEyebrow">À traiter en priorité</span><h3>Questions encore réellement ouvertes</h3></div>
            {openQuestions.length === 0 ? <p className="cortijoEmpty">Aucune question ouverte.</p> : (
              <ul>{openQuestions.slice(0, 5).map((question) => <li key={question.id}><strong>{question.title}</strong><span>{question.linkedTo}</span></li>)}</ul>
            )}
            <button type="button" onClick={() => setActiveView("suivi")}>Ouvrir mes démarches</button>
          </section>
        </div>
      )}

      {activeView === "terrain" && <div className="cortijoView"><CortijoTerrainPanel /></div>}
      {activeView === "baul" && <div className="cortijoView"><BaulImportPanel /></div>}

      {activeView === "suivi" && (
        <div className="cortijoView">
          <CortijoActionDesk />
          <details className="cortijoTechnicalFollowUp">
            <summary>Suivi technique — questions et anomalies</summary>
            <div className="cortijoView">
              <div className="cortijoQuickForms">
                <form className="cortijoForm" onSubmit={addQuestion}>
                  <span className="cortijoEyebrow">Ajouter seulement après lecture</span><h3>Nouvelle question ou tâche</h3>
                  <input value={questionForm.title} onChange={(e) => setQuestionForm((c) => ({ ...c, title: e.target.value }))} placeholder="Question réellement encore ouverte…" />
                  <input value={questionForm.assignee} onChange={(e) => setQuestionForm((c) => ({ ...c, assignee: e.target.value }))} placeholder="Assigné à…" />
                  <input value={questionForm.linkedTo} onChange={(e) => setQuestionForm((c) => ({ ...c, linkedTo: e.target.value }))} placeholder="Lié à…" />
                  <input value={questionForm.proof} onChange={(e) => setQuestionForm((c) => ({ ...c, proof: e.target.value }))} placeholder="Ce que les pièces disent déjà / preuve attendue…" />
                  <button type="submit">+ Ajouter</button>
                </form>
                <form className="cortijoForm" onSubmit={addAnomaly}>
                  <span className="cortijoEyebrow">Écart documenté</span><h3>Nouvelle anomalie</h3>
                  <input value={anomalyForm.title} onChange={(e) => setAnomalyForm((c) => ({ ...c, title: e.target.value }))} placeholder="Écart ou incohérence…" />
                  <input value={anomalyForm.type} onChange={(e) => setAnomalyForm((c) => ({ ...c, type: e.target.value }))} placeholder="Type…" />
                  <input value={anomalyForm.linkedTo} onChange={(e) => setAnomalyForm((c) => ({ ...c, linkedTo: e.target.value }))} placeholder="Lié à…" />
                  <input value={anomalyForm.question} onChange={(e) => setAnomalyForm((c) => ({ ...c, question: e.target.value }))} placeholder="Question de contrôle…" />
                  <button type="submit">+ Ajouter</button>
                </form>
              </div>

              <div className="cortijoColumns">
                <section className="cortijoPanel">
                  <div className="cortijoPanelTitle"><span>Q</span><div><h3>Questions / tâches</h3><p>{openQuestions.length} ouvertes</p></div></div>
                  <div className="cortijoList">{questions.map((q) => <article className={`cortijoCard ${q.status === "Réponse complète" ? "isClosed" : ""}`} key={q.id}><div className="cortijoCardTop"><StatusPill>{q.status}</StatusPill><small>{q.urgency}</small></div><h4>{q.title}</h4><dl><div><dt>Assigné à</dt><dd>{q.assignee}</dd></div><div><dt>Lié à</dt><dd>{q.linkedTo}</dd></div><div><dt>Relance</dt><dd>{q.nextReminder}</dd></div></dl><p>{q.proof}</p><button type="button" onClick={() => setQuestions((current) => current.map((item) => item.id === q.id ? { ...item, status: item.status === "Réponse complète" ? "À poser" : "Réponse complète" } : item))}>{q.status === "Réponse complète" ? "Rouvrir" : "Marquer résolu"}</button></article>)}</div>
                </section>
                <section className="cortijoPanel">
                  <div className="cortijoPanelTitle"><span>A</span><div><h3>Points de vigilance</h3><p>{openAnomalies.length} ouverts</p></div></div>
                  <div className="cortijoList">{anomalies.map((a) => <article className={`cortijoCard cortijoAnomaly ${a.status === "Justifié" ? "isClosed" : ""}`} key={a.id}><div className="cortijoCardTop"><StatusPill>{a.status}</StatusPill><small>{a.severity}</small></div><h4>{a.title}</h4><p>{a.question}</p><button type="button" onClick={() => setAnomalies((current) => current.map((item) => item.id === a.id ? { ...item, status: item.status === "Justifié" ? "À vérifier" : "Justifié" } : item))}>{a.status === "Justifié" ? "Rouvrir" : "Marquer vérifié"}</button></article>)}</div>
                </section>
              </div>

              <section className="cortijoReminderPanel"><div><span className="cortijoEyebrow">Cadence</span><h3>Relances progressives</h3></div><ol>{cortijoReminderRhythm.map((r) => <li key={r}>{r}</li>)}</ol></section>
            </div>
          </details>
        </div>
      )}

      {activeView === "export" && (
        <div className="cortijoView cortijoExportWorkspace">
          <section className="cortijoExportSummary"><span className="cortijoEyebrow">Transmission maîtrisée</span><h3>État {PROJECT_VERSION} documenté</h3><p>L'export contient le board actuellement pertinent. Les anciennes données locales restent dans leurs anciennes clés mais ne peuvent plus remplacer silencieusement le board {PROJECT_VERSION}.</p><div className="cortijoExportNumbers"><div><strong>{questions.length}</strong><span>questions / tâches</span></div><div><strong>{anomalies.length}</strong><span>vigilances</span></div><div><strong>{PROJECT_VERSION}</strong><span>version</span></div></div><button type="button" className="cortijoPrimaryButton" onClick={exportProjectFollowUp}>Télécharger le suivi JSON</button></section>
          <section className="cortijoDangerZone"><div><h3>Revenir à l'état documentaire canonique</h3><p>Réinitialise uniquement ce board {PROJECT_VERSION}. Aucun document BAÚL n'est supprimé.</p></div><button type="button" onClick={resetLocalData}>Réinitialiser le board {PROJECT_VERSION}</button></section>
        </div>
      )}
    </section>
  );
}
