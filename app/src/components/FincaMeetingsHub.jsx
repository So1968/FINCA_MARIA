import { useEffect, useMemo, useRef, useState } from "react";
import { deletePendingChunk, listPendingChunks, savePendingChunk } from "../lib/meetingAudioStore.js";
import "../meetings.css";
import HistoricMeetingImport from "./HistoricMeetingImport.jsx";
import MeetingDecisionRegister from "./MeetingDecisionRegister.jsx";

const STAGES = ["Ouverture", "Participants", "Contexte", "Ordre du jour", "Échanges", "Validation", "Clôture"];
const RECORDING_NOTICE = "Cette réunion peut être enregistrée pour conserver une mémoire familiale fidèle. L’audio reste dans le stockage privé de FINCA MARIA. Être cité comme participant ne donne pas automatiquement accès au fichier.";

const MARKERS = [
  ["decision", "Décision"],
  ["action", "Action"],
  ["question", "Question"],
  ["a_verifier", "À vérifier"],
  ["desaccord", "Désaccord"],
  ["point_sensible", "Point sensible"],
  ["document_evoque", "Document évoqué"],
  ["accord_a_confirmer", "Accord à confirmer"]
];

const CLASSIFICATIONS = [
  ["proposition", "Proposition"],
  ["declaration", "Déclaration"],
  ["decision_confirmee", "Décision confirmée"],
  ["action_confirmee", "Action confirmée"],
  ["a_valider", "Reste à valider"],
  ["desaccord", "Désaccord"],
  ["question_ouverte", "Question ouverte"],
  ["a_verifier", "À vérifier"],
  ["document_evoque", "Document évoqué"]
];

function localDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatClock(totalSeconds) {
  const value = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function markerLabel(type) {
  return MARKERS.find(([key]) => key === type)?.[1] || type;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof Blob) && !(options.body instanceof File) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    options = { ...options, body: JSON.stringify(options.body) };
  }
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Erreur FINCA (${response.status})`);
  return payload;
}

function emptyPreparation() {
  return {
    title: "",
    date: localDate(),
    meetingType: "Conseil de famille",
    theme: "",
    objective: "",
    agendaText: "",
    previousRecap: "",
    participants: [{ id: crypto.randomUUID(), name: "", presence: "present", role: "", isFacilitator: true }]
  };
}

function prepFromMeeting(meeting) {
  return {
    title: meeting?.title || "",
    date: meeting?.date || localDate(),
    meetingType: meeting?.meetingType || "Conseil de famille",
    theme: meeting?.theme || "",
    objective: meeting?.objective || "",
    agendaText: (meeting?.agenda || []).join("\n"),
    previousRecap: meeting?.previousRecap || "",
    participants: meeting?.participants || []
  };
}

function reportGroups(markers) {
  const groups = {
    decisions: [],
    actions: [],
    disagreements: [],
    questions: [],
    pending: [],
    documents: []
  };
  for (const marker of markers || []) {
    if (marker.classification === "decision_confirmee") groups.decisions.push(marker);
    if (marker.classification === "action_confirmee") groups.actions.push(marker);
    if (marker.classification === "desaccord") groups.disagreements.push(marker);
    if (marker.classification === "question_ouverte") groups.questions.push(marker);
    if (["a_valider", "a_verifier", "proposition"].includes(marker.classification)) groups.pending.push(marker);
    if (marker.classification === "document_evoque") groups.documents.push(marker);
  }
  return groups;
}


export default function FincaMeetingsHub() {
  const [meetings, setMeetings] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [meeting, setMeeting] = useState(null);
  const [preparation, setPreparation] = useState(emptyPreparation);
  const [newMode, setNewMode] = useState(false);
  const [historicMode, setHistoricMode] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioStatus, setAudioStatus] = useState("");
  const [pendingChunks, setPendingChunks] = useState(0);
  const [newParticipant, setNewParticipant] = useState({ name: "", role: "", presence: "present" });
  const [reportDraft, setReportDraft] = useState({ summary: "", subjects: "" });
  const [health, setHealth] = useState(null);
  const [speakerMapping, setSpeakerMapping] = useState({});
  const [documents, setDocuments] = useState([]);
  const [documentSelection, setDocumentSelection] = useState({});

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const seqRef = useRef(0);
  const sessionStartedRef = useRef(0);
  const recordMimeRef = useRef("audio/webm");
  const uploadRunningRef = useRef(false);
  const chunkSavePromisesRef = useRef([]);
  const audioRef = useRef(null);

  const groups = useMemo(() => reportGroups(meeting?.markers || []), [meeting?.markers]);
  const presentNames = useMemo(
    () => (meeting?.participants || []).filter((item) => item.presence === "present").map((item) => item.name),
    [meeting?.participants]
  );
  const unresolvedSpeakers = useMemo(() => {
    const map = new Map();
    for (const segment of meeting?.transcript?.segments || []) {
      if (segment.speakerConfidence !== "non-identifie" || !segment.sourceSpeaker) continue;
      if (!map.has(segment.sourceSpeaker)) map.set(segment.sourceSpeaker, segment);
    }
    return [...map.values()];
  }, [meeting?.transcript]);

  async function loadList(preferredId = "") {
    const payload = await api("/api/meetings");
    setMeetings(payload.meetings || []);
    const candidate = preferredId || selectedId || payload.meetings?.[0]?.id || "";
    if (candidate) setSelectedId(candidate);
  }

  async function loadHealth() {
    try {
      const payload = await api("/api/meetings/transcription/health");
      setHealth(payload);
    } catch {
      setHealth(null);
    }
  }

  async function loadDocuments() {
    try {
      const payload = await api("/api/meetings/documents");
      setDocuments(payload.documents || []);
    } catch {
      setDocuments([]);
    }
  }

  async function loadMeeting(id, quiet = false) {
    if (!id) return;
    if (!quiet) setBusy(true);
    try {
      const payload = await api(`/api/meetings/${encodeURIComponent(id)}`);
      setMeeting(payload.meeting);
      setPreparation(prepFromMeeting(payload.meeting));
      setReportDraft(payload.meeting.reportDraft || { summary: "", subjects: "" });
      setSpeakerMapping(payload.meeting.speakerOverrides || {});
      const pending = await listPendingChunks(id).catch(() => []);
      setPendingChunks(pending.length);
      setError("");
    } catch (err) {
      if (!quiet) setError(err.message);
    } finally {
      if (!quiet) setBusy(false);
    }
  }

  useEffect(() => {
    loadList().catch((err) => setError(err.message));
    loadHealth();
    loadDocuments();
  }, []);

  useEffect(() => {
    if (!selectedId || newMode) return;
    loadMeeting(selectedId);
  }, [selectedId, newMode]);

  useEffect(() => {
    if (!meeting?.id || !["queued", "running"].includes(meeting.transcriptionState)) return undefined;
    const timer = window.setInterval(() => loadMeeting(meeting.id, true), 2500);
    return () => window.clearInterval(timer);
  }, [meeting?.id, meeting?.transcriptionState]);

  useEffect(() => {
    if (!sessionRunning) return undefined;
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, (Date.now() - sessionStartedRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [sessionRunning]);

  useEffect(() => () => {
    try { recorderRef.current?.stop(); } catch {}
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  function updatePrep(field, value) {
    setPreparation((current) => ({ ...current, [field]: value }));
  }

  function addPreparationParticipant() {
    setPreparation((current) => ({
      ...current,
      participants: [...current.participants, {
        id: crypto.randomUUID(),
        name: "",
        presence: "present",
        role: "",
        isFacilitator: false
      }]
    }));
  }

  function updatePreparationParticipant(id, field, value) {
    setPreparation((current) => ({
      ...current,
      participants: current.participants.map((item) => item.id === id ? { ...item, [field]: value } : item)
    }));
  }

  async function createMeeting(event) {
    event?.preventDefault();
    if (!preparation.title.trim() || !preparation.date) {
      setError("Le titre et la date sont obligatoires.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = await api("/api/meetings", {
        method: "POST",
        body: {
          title: preparation.title,
          date: preparation.date,
          meetingType: preparation.meetingType,
          theme: preparation.theme,
          objective: preparation.objective,
          agenda: preparation.agendaText,
          previousRecap: preparation.previousRecap,
          recordingNotice: RECORDING_NOTICE,
          participants: preparation.participants.filter((item) => item.name.trim())
        }
      });
      setNewMode(false);
      setSelectedId(payload.meeting.id);
      setMeeting(payload.meeting);
      setPreparation(prepFromMeeting(payload.meeting));
      setNotice("Réunion préparée et sauvegardée.");
      await loadList(payload.meeting.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePreparation() {
    if (!meeting?.id) return;
    setBusy(true);
    setError("");
    try {
      const payload = await api(`/api/meetings/${meeting.id}`, {
        method: "PUT",
        body: {
          title: preparation.title,
          date: preparation.date,
          meetingType: preparation.meetingType,
          theme: preparation.theme,
          objective: preparation.objective,
          agenda: preparation.agendaText,
          previousRecap: preparation.previousRecap,
          stage: meeting.stage,
          reportDraft
        }
      });
      setMeeting(payload.meeting);
      setPreparation(prepFromMeeting(payload.meeting));
      setNotice("Préparation enregistrée.");
      await loadList(meeting.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStage(stage) {
    if (!meeting?.id) return;
    try {
      const payload = await api(`/api/meetings/${meeting.id}`, {
        method: "PUT",
        body: { stage, reportDraft }
      });
      setMeeting(payload.meeting);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addParticipantDuringMeeting() {
    if (!meeting?.id || !newParticipant.name.trim()) return;
    try {
      const payload = await api(`/api/meetings/${meeting.id}/participants`, {
        method: "POST",
        body: { ...newParticipant, addedDuring: true, sortOrder: meeting.participants.length + 1 }
      });
      setMeeting(payload.meeting);
      setPreparation(prepFromMeeting(payload.meeting));
      setNewParticipant({ name: "", role: "", presence: "present" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveParticipant(participant) {
    try {
      const payload = await api(`/api/meetings/${meeting.id}/participants/${participant.id}`, {
        method: "PUT",
        body: participant
      });
      setMeeting(payload.meeting);
      setPreparation(prepFromMeeting(payload.meeting));
    } catch (err) {
      setError(err.message);
    }
  }

  function startSession(reset = false) {
    if (!sessionRunning || reset) {
      sessionStartedRef.current = Date.now();
      setElapsed(0);
      setSessionRunning(true);
    }
  }

  async function uploadPending(id = meeting?.id) {
    if (!id || uploadRunningRef.current) return;
    uploadRunningRef.current = true;
    try {
      while (true) {
        const chunks = await listPendingChunks(id);
        setPendingChunks(chunks.length);
        if (!chunks.length) break;
        let failed = false;
        for (const chunk of chunks) {
          try {
            const response = await fetch(`/api/meetings/${id}/audio/chunks/${chunk.seq}`, {
              method: "POST",
              headers: { "Content-Type": chunk.mimeType || "application/octet-stream" },
              body: chunk.blob
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || `Bloc ${chunk.seq} non sauvegardé`);
            await deletePendingChunk(id, chunk.seq);
          } catch (err) {
            failed = true;
            setAudioStatus(`Sauvegarde interrompue : ${err.message}. Les blocs restent sur cet appareil.`);
            break;
          }
        }
        if (failed) break;
      }
    } finally {
      const remaining = await listPendingChunks(id).catch(() => []);
      setPendingChunks(remaining.length);
      uploadRunningRef.current = false;
    }
  }

  async function finalizeRecordedAudio() {
    if (!meeting?.id) return false;
    await Promise.allSettled(chunkSavePromisesRef.current);
    await uploadPending(meeting.id);
    const remaining = await listPendingChunks(meeting.id).catch(() => []);
    setPendingChunks(remaining.length);
    if (remaining.length) {
      setAudioStatus(`${remaining.length} bloc(s) restent à envoyer. L’audio déjà sauvegardé n’est pas effacé.`);
      return false;
    }
    try {
      const payload = await api(`/api/meetings/${meeting.id}/audio/finalize`, {
        method: "POST",
        body: {
          mimeType: recordMimeRef.current,
          originalName: `conseil-${meeting.date || localDate()}.webm`,
          recordingNotice: RECORDING_NOTICE
        }
      });
      setMeeting(payload.meeting);
      setAudioStatus("Enregistrement original sauvegardé dans FINCA MARIA.");
      return true;
    } catch (err) {
      setAudioStatus(`Finalisation à reprendre : ${err.message}`);
      return false;
    }
  }

  async function retryAudioSave() {
    setAudioStatus("Reprise de l’envoi…");
    await uploadPending(meeting?.id);
    if (!recording) await finalizeRecordedAudio();
  }

  async function confirmRecordingConsent() {
    if (!meeting?.id) throw new Error("Réunion non enregistrée.");
    await api(`/api/meetings/${meeting.id}/recording-consent`, {
      method: "POST",
      body: { informed: true, notice: RECORDING_NOTICE }
    });
  }

  async function startRecording() {
    if (!meeting?.id || meeting.hasAudio) return;
    if (!recordingConsent) {
      setError("Confirme d’abord que les participants ont été informés de l’enregistrement.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L’enregistrement audio n’est pas disponible dans ce navigateur. Tu peux importer un fichier ou prendre des notes sans enregistrer.");
      return;
    }
    setError("");
    setAudioStatus("Confirmation de l’information des participants…");
    try {
      await confirmRecordingConsent();
      setAudioStatus("Demande d’accès au microphone…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      seqRef.current = 0;
      chunkSavePromisesRef.current = [];
      recordMimeRef.current = recorder.mimeType || preferred || "audio/webm";
      startSession(true);

      recorder.ondataavailable = (event) => {
        if (!event.data?.size) return;
        const seq = seqRef.current++;
        const saved = savePendingChunk(meeting.id, seq, event.data)
          .then(() => uploadPending(meeting.id))
          .catch((err) => setAudioStatus(`Bloc local non sauvegardé : ${err.message}`));
        chunkSavePromisesRef.current.push(saved);
      };
      recorder.onerror = () => setAudioStatus("Le navigateur a signalé une erreur d’enregistrement. Les blocs déjà sauvegardés sont conservés.");
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSessionRunning(false);
        await finalizeRecordedAudio();
      };
      recorder.start(5000);
      setRecording(true);
      setAudioStatus("Enregistrement en cours · sauvegarde progressive toutes les quelques secondes.");
    } catch (err) {
      setRecording(false);
      setSessionRunning(false);
      setAudioStatus("");
      setError(`Microphone indisponible ou refusé : ${err.message}. La réunion peut continuer en mode notes sans enregistrement.`);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setAudioStatus("Arrêt et vérification des derniers blocs…");
    try { recorder.requestData(); } catch {}
    recorder.stop();
  }

  async function importAudio(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !meeting?.id) return;
    if (!recordingConsent) {
      setError("Confirme d’abord que les participants ont été informés de la conservation de cet enregistrement.");
      return;
    }
    setBusy(true);
    setError("");
    setAudioStatus("Confirmation de l’information des participants…");
    try {
      await confirmRecordingConsent();
      setAudioStatus("Import de l’enregistrement…");
      const response = await fetch(`/api/meetings/${meeting.id}/audio/import`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-Finca-Filename": encodeURIComponent(file.name)
        },
        body: file
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Import impossible");
      setMeeting(payload.meeting);
      setAudioStatus(payload.duplicate ? "Cet audio était déjà sauvegardé." : "Audio importé et sauvegardé.");
    } catch (err) {
      setError(err.message);
      setAudioStatus("L’import a échoué ; le fichier source n’a pas été modifié.");
    } finally {
      setBusy(false);
    }
  }

  async function addMarker(type) {
    if (!meeting?.id) return;
    if (!sessionRunning && !recording) startSession();
    const seconds = sessionStartedRef.current ? Math.max(0, (Date.now() - sessionStartedRef.current) / 1000) : elapsed;
    try {
      const payload = await api(`/api/meetings/${meeting.id}/markers`, {
        method: "POST",
        body: { type, timeSeconds: seconds }
      });
      setMeeting(payload.meeting);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateMarker(marker, patch) {
    try {
      const payload = await api(`/api/meetings/${meeting.id}/markers/${marker.id}`, {
        method: "PUT",
        body: {
          note: patch.note ?? marker.note,
          classification: patch.classification ?? marker.classification,
          responsible: patch.responsible ?? marker.responsible,
          dueDate: patch.dueDate ?? marker.dueDate
        }
      });
      setMeeting(payload.meeting);
    } catch (err) {
      setError(err.message);
    }
  }

  function seekMarker(marker) {
    if (!meeting?.hasAudio || !audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, marker.timeSeconds || 0);
    audioRef.current.play().catch(() => {});
  }

  async function startTranscription() {
    if (!meeting?.id) return;
    setError("");
    try {
      const payload = await api(`/api/meetings/${meeting.id}/transcribe`, { method: "POST", body: {} });
      setMeeting(payload.meeting);
      setNotice(payload.cached ? "Transcription existante réutilisée." : payload.alreadyRunning ? "Transcription déjà en cours." : "Transcription locale lancée.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveSpeakerNames() {
    try {
      const payload = await api(`/api/meetings/${meeting.id}/speakers`, {
        method: "PUT",
        body: { mapping: speakerMapping }
      });
      setMeeting(payload.meeting);
      setSpeakerMapping(payload.mapping || {});
      setNotice("Noms des intervenants confirmés pour cette réunion uniquement.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveReport() {
    if (!meeting?.id) return;
    try {
      const payload = await api(`/api/meetings/${meeting.id}`, {
        method: "PUT",
        body: { stage: meeting.stage, reportDraft }
      });
      setMeeting(payload.meeting);
      setNotice("Brouillon du compte rendu sauvegardé.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function validateReport() {
    if (!meeting?.id) return;
    if (!window.confirm("Valider cette version du compte rendu ? Une copie datée et identifiable sera conservée.")) return;
    await saveReport();
    try {
      const payload = await api(`/api/meetings/${meeting.id}/validate`, { method: "POST", body: {} });
      setMeeting(payload.meeting);
      setNotice(`Compte rendu validé · version ${payload.version} conservée.`);
      await loadList(meeting.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createConfirmedAction(marker) {
    if (!window.confirm("Créer cette action confirmée dans les actions FINCA MARIA, sans inventer d’autre responsable ni échéance ?")) return;
    try {
      const payload = await api(`/api/meetings/${meeting.id}/markers/${marker.id}/create-action`, {
        method: "POST",
        body: { confirmed: true }
      });
      setMeeting(payload.meeting);
      setNotice(payload.duplicate ? "Cette action était déjà rattachée : aucun doublon créé." : "Action confirmée créée dans FINCA MARIA.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function linkDocument(marker) {
    const documentId = documentSelection[marker.id];
    if (!documentId) return;
    try {
      const payload = await api(`/api/meetings/${meeting.id}/markers/${marker.id}/link-document`, {
        method: "POST",
        body: { documentId }
      });
      setMeeting(payload.meeting);
      setNotice(payload.duplicate ? "Ce document était déjà lié." : "Document BAÚL rattaché à la réunion.");
    } catch (err) {
      setError(err.message);
    }
  }

  function startNew() {
    setNewMode(true);
    setSelectedId("");
    setMeeting(null);
    setPreparation(emptyPreparation());
    setNotice("");
    setError("");
    setRecordingConsent(false);
  }

  const renderPreparationFields = (isNew = false) => (
    <>
      <div className="meetingGrid">
        <label className="meetingField"><span>Titre</span><input value={preparation.title} onChange={(event) => updatePrep("title", event.target.value)} placeholder="Conseil de famille — succession / finca…" /></label>
        <label className="meetingField"><span>Date</span><input type="date" value={preparation.date} onChange={(event) => updatePrep("date", event.target.value)} /></label>
        <label className="meetingField"><span>Type de rencontre</span><input value={preparation.meetingType} onChange={(event) => updatePrep("meetingType", event.target.value)} /></label>
        <label className="meetingField"><span>Thème</span><input value={preparation.theme} onChange={(event) => updatePrep("theme", event.target.value)} placeholder="Sujet principal" /></label>
        <label className="meetingField wide"><span>Objectif</span><textarea rows="3" value={preparation.objective} onChange={(event) => updatePrep("objective", event.target.value)} placeholder="Ce que cette réunion doit permettre de clarifier ou décider" /></label>
        <label className="meetingField wide"><span>Ordre du jour · un point par ligne</span><textarea rows="4" value={preparation.agendaText} onChange={(event) => updatePrep("agendaText", event.target.value)} /></label>
        <label className="meetingField wide"><span>Décisions et actions de la réunion précédente</span><textarea rows="3" value={preparation.previousRecap} onChange={(event) => updatePrep("previousRecap", event.target.value)} placeholder="Recopier seulement ce qui a réellement été décidé ou reste ouvert." /></label>
      </div>
      {isNew ? (
        <div className="meetingSection">
          <h3>Participants prévus</h3>
          <div className="participantList">
            {preparation.participants.map((participant) => (
              <div className="participantRow" key={participant.id}>
                <label>Nom<input value={participant.name} onChange={(event) => updatePreparationParticipant(participant.id, "name", event.target.value)} /></label>
                <label>Présence<select value={participant.presence} onChange={(event) => updatePreparationParticipant(participant.id, "presence", event.target.value)}><option value="present">Présent</option><option value="absent">Absent</option><option value="excused">Excusé</option></select></label>
                <label>Rôle<input value={participant.role} onChange={(event) => updatePreparationParticipant(participant.id, "role", event.target.value)} /></label>
                <label className="check"><input type="checkbox" checked={participant.isFacilitator} onChange={(event) => updatePreparationParticipant(participant.id, "isFacilitator", event.target.checked)} /> Anime</label>
              </div>
            ))}
          </div>
          <div className="meetingActions"><button type="button" className="meetingBtn" onClick={addPreparationParticipant}>+ Participant</button></div>
        </div>
      ) : null}
    </>
  );

  return (
    <main className="fincaMeetings">
      <header className="meetingTop">
        <div>
          <small>FINCA MARIA · MÉMOIRE FAMILIALE</small>
          <h1>Réunions et conseils de famille</h1>
          <span className="meetingMuted">Préparer · accompagner · transcrire · valider · retrouver</span>
        </div>
        <a className="meetingBack" href="/">← FINCA MARIA</a>
      </header>

      <div className="meetingLayout">
        <aside className="meetingSidebar">
          <div className="meetingSidebarHead"><strong>Réunions</strong><button type="button" className="meetingBtn primary" onClick={() => { setHistoricMode(false); setRegisterMode(false); startNew(); }}>+ Nouvelle</button></div>
          <button className="meetingBtn" type="button" onClick={() => { setHistoricMode(true); setRegisterMode(false); setNewMode(false); }} style={{ width: "100%", marginBottom: "1rem" }}>Importer des comptes rendus</button>
          <button className="meetingBtn" type="button" onClick={() => { setRegisterMode(true); setHistoricMode(false); setNewMode(false); }} style={{ width: "100%", marginBottom: "1rem" }}>Registre des décisions</button>
          <div className="meetingList">
            {meetings.map((item) => (
              <button type="button" key={item.id} className={selectedId === item.id && !newMode ? "isActive" : ""} onClick={() => { setRegisterMode(false); setHistoricMode(false); setNewMode(false); setSelectedId(item.id); }}>
                <strong>{item.title}</strong>
                <span>{item.date} · {item.meetingType}</span>
                <small>{item.presentCount} présent(s) · {item.markerCount} repère(s){item.validatedVersion ? ` · CR v${item.validatedVersion}` : ""}</small>
              </button>
            ))}
            {!meetings.length ? <span className="meetingMuted">Aucune réunion enregistrée.</span> : null}
          </div>
        </aside>

        <section className="meetingPanel">
          {error ? <div className="meetingNotice error">{error}</div> : null}
          {notice ? <div className="meetingNotice ok">{notice}</div> : null}

          {registerMode ? (
            <MeetingDecisionRegister onOpen={(id) => { setSelectedId(id); setRegisterMode(false); }} onClose={() => setRegisterMode(false)} />
          ) : historicMode ? (
            <HistoricMeetingImport onClose={() => setHistoricMode(false)} onImported={async (id) => { await loadList(id); }} />
          ) : newMode ? (
            <form onSubmit={createMeeting}>
              <div className="meetingSection"><h2>Préparer une nouvelle réunion</h2>{renderPreparationFields(true)}</div>
              <div className="meetingActions"><button type="submit" className="meetingBtn primary" disabled={busy}>Créer et préparer la réunion</button><button type="button" className="meetingBtn" onClick={() => setNewMode(false)}>Annuler</button></div>
            </form>
          ) : meeting ? (
            <>
              {meeting.reportDraft?.historicImport ? <section className="meetingSection"><h2>Compte rendu historique d’origine</h2><p className="meetingMuted">Document original conservé. Décisions proposées à vérifier dans les marqueurs ci-dessous.</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "inherit" }}>{meeting.reportDraft.historicOriginal}</pre></section> : null}
              <section className="meetingSection">
                <div className="meetingActions" style={{ justifyContent: "space-between", marginTop: 0 }}>
                  <div><h2 style={{ marginBottom: ".2rem" }}>{meeting.title}</h2><div className="meetingStatus"><strong>{meeting.date}</strong> · {meeting.meetingType} · état : {meeting.status}</div></div>
                  {meeting.validatedVersions?.length ? <span className="validatedBadge">Compte rendu validé · v{meeting.validatedVersions[0].version}</span> : null}
                </div>
              </section>

              <section className="meetingSection">
                <h3>1 · Préparation</h3>
                {renderPreparationFields(false)}
                <div className="meetingActions"><button type="button" className="meetingBtn primary" onClick={savePreparation} disabled={busy}>Enregistrer la préparation</button></div>
              </section>

              <section className="meetingSection">
                <h3>Participants</h3>
                <div className="participantList">
                  {meeting.participants.map((participant) => (
                    <ParticipantEditor key={participant.id} participant={participant} onSave={saveParticipant} />
                  ))}
                </div>
                <div className="participantRow" style={{ marginTop: ".55rem" }}>
                  <label>Nouvel intervenant<input value={newParticipant.name} onChange={(event) => setNewParticipant({ ...newParticipant, name: event.target.value })} placeholder="Nom" /></label>
                  <label>Présence<select value={newParticipant.presence} onChange={(event) => setNewParticipant({ ...newParticipant, presence: event.target.value })}><option value="present">Présent</option><option value="absent">Absent</option><option value="excused">Excusé</option></select></label>
                  <label>Rôle<input value={newParticipant.role} onChange={(event) => setNewParticipant({ ...newParticipant, role: event.target.value })} /></label>
                  <button type="button" className="meetingBtn" onClick={addParticipantDuringMeeting}>Ajouter</button>
                </div>
              </section>

              <section className="meetingSection">
                <h3>2 · Trame de réunion</h3>
                <p className="meetingMuted">Le rail guide sans bloquer : tu peux passer d’un point à l’autre à tout moment.</p>
                <div className="stageRail">{STAGES.map((stage) => <button type="button" key={stage} className={meeting.stage === stage ? "isActive" : ""} onClick={() => changeStage(stage)}>{stage}</button>)}</div>
              </section>

              <section className="meetingSection">
                <h3>3 · Accompagner les échanges</h3>
                <div className="meetingNotice">
                  <strong>Avant tout enregistrement</strong><br />{RECORDING_NOTICE}
                  <label style={{ display: "block", marginTop: ".55rem" }}><input type="checkbox" checked={recordingConsent} onChange={(event) => setRecordingConsent(event.target.checked)} /> J’ai informé les participants avant de conserver l’audio.</label>
                </div>

                <div className="recordingBar" style={{ marginTop: ".7rem" }}>
                  <span className={recording ? "recordingDot on" : "recordingDot"} aria-hidden="true" />
                  <strong className="recordingClock">{formatClock(elapsed)}</strong>
                  <span className="meetingMuted">{recording ? "Enregistrement" : sessionRunning ? "Réunion sans enregistrement" : "Prêt"}</span>
                  {!recording && !meeting.hasAudio ? <button type="button" className="meetingBtn primary" onClick={startRecording}>● Enregistrer</button> : null}
                  {recording ? <button type="button" className="meetingBtn danger" onClick={stopRecording}>■ Arrêter</button> : null}
                  {!recording && !sessionRunning ? <button type="button" className="meetingBtn" onClick={() => startSession(true)}>Commencer sans enregistrer</button> : null}
                  {!recording && sessionRunning ? <button type="button" className="meetingBtn" onClick={() => setSessionRunning(false)}>Arrêter le chrono</button> : null}
                  {!recording && !meeting.hasAudio ? <label className="fileInput">Importer un audio<input type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.mp4" onChange={importAudio} /></label> : null}
                  {pendingChunks > 0 && !recording ? <button type="button" className="meetingBtn" onClick={retryAudioSave}>Reprendre l’envoi ({pendingChunks})</button> : null}
                </div>
                {audioStatus ? <p className="meetingMuted">{audioStatus}</p> : null}

                <div className="markerGrid">
                  {MARKERS.map(([type, label]) => <button type="button" key={type} onClick={() => addMarker(type)}>{label}</button>)}
                </div>

                <div className="timeline">
                  {(meeting.markers || []).map((marker) => (
                    <MarkerCard
                      key={marker.id}
                      marker={marker}
                      hasAudio={meeting.hasAudio}
                      validated={Boolean(meeting.validatedVersions?.length)}
                      documents={documents}
                      documentId={documentSelection[marker.id] || ""}
                      onDocumentChange={(value) => setDocumentSelection((current) => ({ ...current, [marker.id]: value }))}
                      onLinkDocument={() => linkDocument(marker)}
                      onSeek={() => seekMarker(marker)}
                      onUpdate={(patch) => updateMarker(marker, patch)}
                      onCreateAction={() => createConfirmedAction(marker)}
                    />
                  ))}
                  {!meeting.markers?.length ? <p className="meetingMuted">Aucun marqueur pour le moment. Un clic suffit pendant la réunion ; la note peut être ajoutée après.</p> : null}
                </div>
              </section>

              {meeting.hasAudio ? (
                <section className="meetingSection">
                  <h3>4 · Audio original</h3>
                  <audio ref={audioRef} className="audioPlayer" controls preload="metadata" src={`/api/meetings/${meeting.id}/audio`} />
                  <div className="meetingStatus"><strong>{meeting.audioOriginalName || "Enregistrement"}</strong> · {(meeting.audioSizeBytes / 1024 / 1024).toFixed(1)} Mio · SHA-256 conservé</div>
                </section>
              ) : null}

              <section className="meetingSection">
                <h3>5 · Transcription locale</h3>
                {health?.localEngineReady ? (
                  <div className="meetingNotice ok">Moteur local prêt : {health.whisperModel}. {health.diarizationReady ? "Séparation locale des voix prête." : "La transcription est prête ; la séparation automatique des voix demande Pyannote + HF_TOKEN."}</div>
                ) : (
                  <div className="meetingNotice">L’enregistrement et les marqueurs fonctionnent. Le moteur de transcription locale n’est pas installé sur cette instance ; aucun audio n’est envoyé vers un service externe.</div>
                )}
                <div className="meetingActions">
                  <button type="button" className="meetingBtn primary" onClick={startTranscription} disabled={!meeting.hasAudio || !health?.localEngineReady || ["queued", "running"].includes(meeting.transcriptionState)}>
                    {["queued", "running"].includes(meeting.transcriptionState) ? "Transcription en cours…" : meeting.transcriptionState === "done" ? "Relancer si l’audio ou le contexte change" : "Transcrire en local"}
                  </button>
                  <span className="meetingMuted">État : {meeting.transcriptionState}{meeting.transcriptionError ? ` · ${meeting.transcriptionError}` : ""}</span>
                </div>

                {meeting.transcript ? (
                  <>
                    {unresolvedSpeakers.length ? (
                      <div className="speakerFix">
                        <strong>Identifier seulement les voix certaines</strong>
                        {unresolvedSpeakers.map((segment) => (
                          <div className="speakerFixRow" key={segment.sourceSpeaker}>
                            <div><strong>{segment.speaker}</strong><br /><small>{formatClock(segment.start)} · {String(segment.text || "").slice(0, 150)}</small></div>
                            <select value={speakerMapping[segment.sourceSpeaker] || ""} onChange={(event) => setSpeakerMapping((current) => ({ ...current, [segment.sourceSpeaker]: event.target.value }))}>
                              <option value="">Laisser non identifié</option>
                              {presentNames.map((name) => <option value={name} key={name}>{name}</option>)}
                            </select>
                          </div>
                        ))}
                        <button type="button" className="meetingBtn" onClick={saveSpeakerNames}>Confirmer ces noms pour cette réunion</button>
                      </div>
                    ) : null}
                    {meeting.transcript.warnings?.length ? <div className="meetingNotice">{meeting.transcript.warnings.join(" · ")}</div> : null}
                    <pre className="transcript">{meeting.transcriptText || "Transcription vide."}</pre>
                  </>
                ) : null}
              </section>

              <section className="meetingSection">
                <h3>6 · Compte rendu et mémoire fiable</h3>
                <div className="reportGroups">
                  <ReportGroup title="Décisions confirmées" markers={groups.decisions} />
                  <ReportGroup title="Actions confirmées" markers={groups.actions} action />
                  <ReportGroup title="Désaccords" markers={groups.disagreements} />
                  <ReportGroup title="Questions ouvertes" markers={groups.questions} />
                  <ReportGroup title="Propositions / à vérifier / à valider" markers={groups.pending} />
                  <ReportGroup title="Documents évoqués" markers={groups.documents} />
                </div>
                <div className="reportEditor">
                  <label className="meetingField"><span>Synthèse rédigée et modifiable</span><textarea rows="5" value={reportDraft.summary || ""} onChange={(event) => setReportDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Synthèse humaine : ne transformer aucune proposition en décision." /></label>
                  <label className="meetingField"><span>Sujets abordés</span><textarea rows="3" value={reportDraft.subjects || ""} onChange={(event) => setReportDraft((current) => ({ ...current, subjects: event.target.value }))} placeholder="Sujets réellement abordés" /></label>
                </div>
                <div className="meetingActions"><button type="button" className="meetingBtn" onClick={saveReport}>Sauvegarder le brouillon</button><button type="button" className="meetingBtn primary" onClick={validateReport}>Valider cette version</button></div>

                {meeting.validatedVersions?.map((version) => (
                  <div className="meetingVersion" key={version.id}><strong>Version {version.version}</strong> · {new Date(version.validatedAt).toLocaleString("fr-FR")}</div>
                ))}
              </section>
            </>
          ) : (
            <div className="emptyMeeting">{busy ? "Chargement…" : "Choisis une réunion ou prépare un nouveau conseil de famille."}</div>
          )}
        </section>
      </div>
    </main>
  );
}

function ParticipantEditor({ participant, onSave }) {
  const [draft, setDraft] = useState(participant);
  useEffect(() => setDraft(participant), [participant]);
  return (
    <div className="participantRow">
      <label>Nom<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Présence<select value={draft.presence} onChange={(event) => setDraft({ ...draft, presence: event.target.value })}><option value="present">Présent</option><option value="absent">Absent</option><option value="excused">Excusé</option></select></label>
      <label>Rôle<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
      <label className="check"><input type="checkbox" checked={Boolean(draft.isFacilitator)} onChange={(event) => setDraft({ ...draft, isFacilitator: event.target.checked })} /> Anime</label>
      <button type="button" className="meetingBtn" onClick={() => onSave(draft)}>Enregistrer</button>
    </div>
  );
}

function MarkerCard({ marker, hasAudio, validated, documents, documentId, onDocumentChange, onLinkDocument, onSeek, onUpdate, onCreateAction }) {
  const [draft, setDraft] = useState(marker);
  useEffect(() => setDraft(marker), [marker]);
  return (
    <article className="markerCard">
      <div className="markerHead">
        <strong>{markerLabel(marker.type)}</strong>
        <button type="button" onClick={onSeek} disabled={!hasAudio}>{formatClock(marker.timeSeconds)}{hasAudio ? " ▶" : ""}</button>
      </div>
      <div className="markerFields">
        <label className="meetingField wide"><span>Note</span><input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Ajouter une note courte après le clic…" /></label>
        <label className="meetingField"><span>Qualification</span><select value={draft.classification} onChange={(event) => setDraft({ ...draft, classification: event.target.value })}>{CLASSIFICATIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="meetingField"><span>Responsable · seulement si précisé</span><input value={draft.responsible || ""} onChange={(event) => setDraft({ ...draft, responsible: event.target.value })} /></label>
        <label className="meetingField"><span>Échéance · seulement si précisée</span><input type="date" value={draft.dueDate || ""} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
      </div>
      <div className="meetingActions">
        <button type="button" className="meetingBtn" onClick={() => onUpdate({ note: draft.note, classification: draft.classification, responsible: draft.responsible, dueDate: draft.dueDate })}>Enregistrer ce repère</button>
        {marker.classification === "action_confirmee" && validated ? <button type="button" className="meetingBtn primary" onClick={onCreateAction}>Créer l’action FINCA</button> : null}
      </div>
      {marker.type === "document_evoque" || marker.classification === "document_evoque" ? (
        <div className="docLinkRow">
          <select value={documentId} onChange={(event) => onDocumentChange(event.target.value)}><option value="">Rattacher un document BAÚL validé…</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}{doc.category ? ` · ${doc.category}` : ""}</option>)}</select>
          <button type="button" className="meetingBtn" onClick={onLinkDocument} disabled={!documentId}>Lier</button>
        </div>
      ) : null}
    </article>
  );
}

function ReportGroup({ title, markers, action = false }) {
  return (
    <div className="reportGroup">
      <h4>{title}</h4>
      {markers.length ? <ul>{markers.map((marker) => <li key={marker.id}>{marker.note || `${markerLabel(marker.type)} à ${formatClock(marker.timeSeconds)}`}{action && (marker.responsible || marker.dueDate) ? ` — ${marker.responsible || "responsable non précisé"}${marker.dueDate ? ` · ${marker.dueDate}` : ""}` : ""}</li>)}</ul> : <span className="meetingMuted">Aucun élément confirmé.</span>}
    </div>
  );
}
