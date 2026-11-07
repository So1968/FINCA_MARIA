import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deletePendingChunk, listPendingChunks, savePendingChunk } from "../lib/meetingAudioStore.js";
import "../meetings.css";
import { useMeetingDraft } from "../lib/useMeetingDraft.js";
import HistoricMeetingImport from "./HistoricMeetingImport.jsx";
import MeetingDecisionRegister from "./MeetingDecisionRegister.jsx";

const STAGES = ["Ouverture", "Participants", "Contexte", "Ordre du jour", "Échanges", "Validation", "Clôture"];
const RECORDING_NOTICE = "Cette réunion peut être enregistrée pour conserver une mémoire familiale fidèle. L’audio reste dans le stockage privé de FINCA MARIA. Être cité comme participant ne donne pas automatiquement accès au fichier.";
const AUDIO_NAVIGATION_MESSAGES = {
  starting: "Attendez la réponse à la demande de microphone avant de changer de réunion.",
  recording: "Arrêtez l’enregistrement avant de changer de réunion.",
  saving: "Attendez la fin de la sauvegarde audio avant de changer de réunion."
};

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
  if (!response.ok) throw Object.assign(new Error(payload.error || (response.status === 404 ? "Le serveur privé des réunions n’est pas démarré. Le lancement npm run dev seul ouvre l’interface, sans la base de données des réunions." : `Erreur FINCA (${response.status})`)), { code: payload.code });
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
  const [meetingSearch, setMeetingSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [meetingTotal, setMeetingTotal] = useState(0);
  const [hasMoreMeetings, setHasMoreMeetings] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const listQuery = useRef({ q: "", report: "all" });
  const listRequest = useRef(0);
  const listAbort = useRef(null);
  const loadedMeetings = useRef([]);
  const [selectedId, setSelectedId] = useState("");
  const [meeting, setMeeting] = useState(null);
  const preparationEditor = useMeetingDraft(emptyPreparation);
  const { value: preparation, edit: setPreparation } = preparationEditor;
  const [newMode, setNewMode] = useState(false);
  const [historicMode, setHistoricMode] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportOperation, setReportOperation] = useState("");
  const reportOperationRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioOperation, setAudioOperationState] = useState("");
  const audioOperationRef = useRef("");
  const audioMountedRef = useRef(true);
  const [audioNeedsFinalization, setAudioNeedsFinalization] = useState(false);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioStatus, setAudioStatus] = useState("");
  const [pendingChunks, setPendingChunks] = useState(0);
  const [newParticipant, setNewParticipant] = useState({ name: "", role: "", presence: "present" });
  const reportEditor = useMeetingDraft(() => ({ summary: "", subjects: "" }));
  const { value: reportDraft, edit: setReportDraft } = reportEditor;
  const [health, setHealth] = useState(null);
  const speakerEditor = useMeetingDraft(() => ({}));
  const { value: speakerMapping, edit: setSpeakerMapping } = speakerEditor;
  const [documents, setDocuments] = useState([]);
  const [documentSelection, setDocumentSelection] = useState({});

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const seqRef = useRef(0);
  const sessionStartedRef = useRef(0);
  const uploadRunningRef = useRef(false);
  const chunkSavePromisesRef = useRef([]);
  const audioRef = useRef(null);
  const meetingLoadGeneration = useRef(0);
  const foregroundLoad = useRef(0);
  const activeMeetingId = useRef("");
  const childDrafts = useRef(new Set());
  const previousMeetingId = useRef("");
  const trackChildDraft = useCallback((id, dirty) => {
    if (dirty) childDrafts.current.add(id);
    else childDrafts.current.delete(id);
  }, []);
  const hasUnsavedChanges = useCallback(() => (
    preparationEditor.isDirty() || reportEditor.isDirty() || speakerEditor.isDirty() ||
    childDrafts.current.size > 0 || Boolean(newParticipant.name.trim() || newParticipant.role.trim() || newParticipant.presence !== "present")
  ), [preparationEditor.isDirty, reportEditor.isDirty, speakerEditor.isDirty, newParticipant]);

  useEffect(() => {
    function protectUnsaved(event) {
      if (!hasUnsavedChanges() && !recording && !audioOperationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", protectUnsaved);
    return () => window.removeEventListener("beforeunload", protectUnsaved);
  }, [hasUnsavedChanges, recording, audioOperation]);

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

  const audioNeedsRecovery = !meeting?.hasAudio && (audioNeedsFinalization || pendingChunks > 0 || Number(meeting?.audioChunkCount || 0) > 0);

  function changeAudioOperation(value) {
    audioOperationRef.current = value;
    setAudioOperationState(value);
    setError((current) => Object.values(AUDIO_NAVIGATION_MESSAGES).includes(current) ? "" : current);
  }

  function audioNavigationMessage() {
    if (audioOperationRef.current === "starting") return AUDIO_NAVIGATION_MESSAGES.starting;
    if (recording || recorderRef.current?.state === "recording") return AUDIO_NAVIGATION_MESSAGES.recording;
    if (audioOperationRef.current) return AUDIO_NAVIGATION_MESSAGES.saving;
    return "";
  }

  function protectAudioLink(event) {
    const message = audioNavigationMessage();
    if (message) { event.preventDefault(); setError(message); }
  }

  function applyMeeting(value) {
    if (value.id !== activeMeetingId.current) return false;
    meetingLoadGeneration.current += 1;
    setMeeting(value);
    return true;
  }

  function updateListFilters(q, report) {
    if (q === listQuery.current.q && report === listQuery.current.report) return;
    listQuery.current = { q, report };
    listRequest.current += 1;
    listAbort.current?.abort();
    setMeetingSearch(q);
    setReportFilter(report);
    setListLoading(true);
    setListError("");
  }

  async function loadList(preferredId = "", append = false) {
    const generation = meetingLoadGeneration.current;
    const request = ++listRequest.current;
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    const params = new URLSearchParams({ ...listQuery.current, limit: "50", offset: String(append ? loadedMeetings.current.length : 0) });
    setListLoading(true);
    try {
      const payload = await api(`/api/meetings?${params}`, { signal: controller.signal });
      if (request !== listRequest.current) return;
      const rows = payload.meetings || [];
      const next = append ? [...new Map([...loadedMeetings.current, ...rows].map((item) => [item.id, item])).values()] : rows;
      loadedMeetings.current = next;
      setMeetings(next);
      setMeetingTotal(Number(payload.total ?? next.length));
      setHasMoreMeetings(Boolean(payload.hasMore));
      setListError("");
      const candidate = preferredId || activeMeetingId.current || rows[0]?.id || "";
      if (candidate && generation === meetingLoadGeneration.current) setSelectedId(candidate);
    } catch (err) {
      if (request === listRequest.current) setListError(err.message);
    } finally {
      if (request === listRequest.current) setListLoading(false);
    }
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
    const generation = quiet ? meetingLoadGeneration.current : ++meetingLoadGeneration.current;
    if (!quiet) { activeMeetingId.current = id; foregroundLoad.current = generation; setBusy(true); }
    try {
      const payload = await api(`/api/meetings/${encodeURIComponent(id)}`);
      if (generation !== meetingLoadGeneration.current || (quiet && reportOperationRef.current)) return;
      setMeeting(payload.meeting);
      preparationEditor.refresh(prepFromMeeting(payload.meeting), !quiet);
      reportEditor.refresh(payload.meeting.reportDraft || { summary: "", subjects: "" }, !quiet);
      speakerEditor.refresh(payload.meeting.speakerOverrides || {}, !quiet);
      const pending = await listPendingChunks(id).catch(() => []);
      if (generation !== meetingLoadGeneration.current) return;
      setPendingChunks(pending.length);
      if (!quiet) setAudioNeedsFinalization(!payload.meeting.hasAudio && (pending.length > 0 || Number(payload.meeting.audioChunkCount || 0) > 0));
      if (!quiet) setError("");
    } catch (err) {
      if (!quiet && generation === meetingLoadGeneration.current) setError(err.message);
    } finally {
      if (!quiet && generation === foregroundLoad.current) setBusy(false);
    }
  }

  useEffect(() => {
    loadHealth();
    loadDocuments();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadList(), meetingSearch ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [meetingSearch, reportFilter]);

  useEffect(() => () => {
    listRequest.current += 1;
    listAbort.current?.abort();
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

  useEffect(() => {
    audioMountedRef.current = true;
    return () => {
      audioMountedRef.current = false;
      try { recorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
    };
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
      activeMeetingId.current = payload.meeting.id;
      if (!applyMeeting(payload.meeting)) return;
      preparationEditor.refresh(prepFromMeeting(payload.meeting), true);
      reportEditor.refresh(payload.meeting.reportDraft || { summary: "", subjects: "" }, true);
      speakerEditor.refresh(payload.meeting.speakerOverrides || {}, true);
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
    const preparationSaved = preparationEditor.snapshot();
    const reportSaved = reportEditor.snapshot();
    setBusy(true);
    setError("");
    try {
      const payload = await api(`/api/meetings/${meeting.id}`, {
        method: "PUT",
        body: {
          title: preparationSaved.value.title,
          date: preparationSaved.value.date,
          meetingType: preparationSaved.value.meetingType,
          theme: preparationSaved.value.theme,
          objective: preparationSaved.value.objective,
          agenda: preparationSaved.value.agendaText,
          previousRecap: preparationSaved.value.previousRecap,
          stage: meeting.stage,
          reportDraft: reportSaved.value
        }
      });
      if (!applyMeeting(payload.meeting)) return;
      preparationEditor.acknowledge(preparationSaved, prepFromMeeting(payload.meeting));
      reportEditor.acknowledge(reportSaved, payload.meeting.reportDraft || reportSaved.value);
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
    const reportSaved = reportEditor.snapshot();
    try {
      const payload = await api(`/api/meetings/${meeting.id}`, {
        method: "PUT",
        body: { stage, reportDraft: reportSaved.value }
      });
      if (!applyMeeting(payload.meeting)) return;
      reportEditor.acknowledge(reportSaved, payload.meeting.reportDraft || reportSaved.value);
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
      if (!applyMeeting(payload.meeting)) return;
      preparationEditor.refresh(prepFromMeeting(payload.meeting));
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
      if (!applyMeeting(payload.meeting)) return;
      preparationEditor.refresh(prepFromMeeting(payload.meeting));
      return payload.meeting.participants.find((item) => item.id === participant.id);
    } catch (err) {
      setError(err.message);
      return null;
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
          originalName: `conseil-${meeting.date || localDate()}.webm`,
          recordingNotice: RECORDING_NOTICE
        }
      });
      if (!applyMeeting(payload.meeting)) return false;
      setAudioNeedsFinalization(false);
      setAudioStatus("Enregistrement original sauvegardé dans FINCA MARIA.");
      return true;
    } catch (err) {
      if (err.code === "NO_AUDIO_CHUNKS") {
        setAudioNeedsFinalization(false);
        setAudioStatus("Aucun bloc audio reçu. Vous pouvez démarrer un nouvel enregistrement.");
      } else {
        setAudioStatus(`Finalisation à reprendre : ${err.message}`);
      }
      return false;
    }
  }

  async function retryAudioSave() {
    if (!meeting?.id || audioOperationRef.current || recording) return;
    changeAudioOperation("finalizing");
    setAudioNeedsFinalization(true);
    setAudioStatus("Reprise de la sauvegarde audio…");
    try { await finalizeRecordedAudio(); }
    catch (err) { setAudioStatus(`Sauvegarde audio à reprendre : ${err.message}`); }
    finally { changeAudioOperation(""); }
  }

  async function confirmRecordingConsent() {
    if (!meeting?.id) throw new Error("Réunion non enregistrée.");
    await api(`/api/meetings/${meeting.id}/recording-consent`, {
      method: "POST",
      body: { informed: true, notice: RECORDING_NOTICE }
    });
  }

  async function startRecording() {
    if (!meeting?.id || meeting.hasAudio || busy || audioNeedsRecovery || recording || audioOperationRef.current) return;
    if (!recordingConsent) {
      setError("Confirme d’abord que les participants ont été informés de l’enregistrement.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L’enregistrement audio n’est pas disponible dans ce navigateur. Tu peux importer un fichier ou prendre des notes sans enregistrer.");
      return;
    }
    setError("");
    changeAudioOperation("starting");
    setAudioStatus("Confirmation de l’information des participants…");
    try {
      await confirmRecordingConsent();
      if (!audioMountedRef.current) return;
      setAudioStatus("Demande d’accès au microphone…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!audioMountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      seqRef.current = 0;
      chunkSavePromisesRef.current = [];
      startSession(true);

      recorder.ondataavailable = (event) => {
        if (!event.data?.size) return;
        setAudioNeedsFinalization(true);
        const seq = seqRef.current++;
        const saved = savePendingChunk(meeting.id, seq, event.data)
          .then(() => uploadPending(meeting.id))
          .catch((err) => setAudioStatus(`Bloc local non sauvegardé : ${err.message}`));
        chunkSavePromisesRef.current.push(saved);
      };
      recorder.onerror = () => setAudioStatus("Le navigateur a signalé une erreur d’enregistrement. Les blocs déjà sauvegardés sont conservés.");
      recorder.onstop = async () => {
        changeAudioOperation("finalizing");
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSessionRunning(false);
        setAudioNeedsFinalization(true);
        try { await finalizeRecordedAudio(); }
        catch (err) { setAudioStatus(`Sauvegarde audio à reprendre : ${err.message}`); }
        finally { changeAudioOperation(""); }
      };
      recorder.start(5000);
      setRecording(true);
      setAudioStatus("Enregistrement en cours · sauvegarde progressive toutes les quelques secondes.");
    } catch (err) {
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setSessionRunning(false);
      setAudioStatus("");
      setError(`Microphone indisponible ou refusé : ${err.message}. La réunion peut continuer en mode notes sans enregistrement.`);
    } finally {
      if (audioOperationRef.current === "starting") changeAudioOperation("");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive" || audioOperationRef.current) return;
    changeAudioOperation("finalizing");
    setAudioStatus("Arrêt et vérification des derniers blocs…");
    try { recorder.requestData(); } catch {}
    try { recorder.stop(); }
    catch (err) { changeAudioOperation(""); setAudioStatus(`Arrêt à reprendre : ${err.message}`); }
  }

  async function importAudio(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !meeting?.id || recording || audioOperationRef.current || audioNeedsRecovery || meeting.hasAudio) return;
    if (!recordingConsent) {
      setError("Confirme d’abord que les participants ont été informés de la conservation de cet enregistrement.");
      return;
    }
    changeAudioOperation("importing");
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
      if (!applyMeeting(payload.meeting)) return;
      setAudioStatus(payload.duplicate ? "Cet audio était déjà sauvegardé." : "Audio importé et sauvegardé.");
    } catch (err) {
      setError(err.message);
      setAudioStatus("L’import a échoué ; le fichier source n’a pas été modifié.");
    } finally {
      changeAudioOperation("");
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
      if (!applyMeeting(payload.meeting)) return;
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
      if (!applyMeeting(payload.meeting)) return;
      return payload.meeting.markers.find((item) => item.id === marker.id);
    } catch (err) {
      setError(err.message);
      return null;
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
      if (!applyMeeting(payload.meeting)) return;
      setNotice(payload.cached ? "Transcription existante réutilisée." : payload.alreadyRunning ? "Transcription déjà en cours." : "Transcription locale lancée.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveSpeakerNames() {
    const saved = speakerEditor.snapshot();
    try {
      const payload = await api(`/api/meetings/${meeting.id}/speakers`, {
        method: "PUT",
        body: { mapping: saved.value }
      });
      if (!applyMeeting(payload.meeting)) return;
      speakerEditor.acknowledge(saved, payload.mapping || {});
      setNotice("Noms des intervenants confirmés pour cette réunion uniquement.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function persistReport() {
    const saved = reportEditor.snapshot();
    const payload = await api(`/api/meetings/${meeting.id}`, {
      method: "PUT",
      body: { stage: meeting.stage, reportDraft: saved.value }
    });
    if (!applyMeeting(payload.meeting)) throw new Error("La réunion active a changé.");
    reportEditor.acknowledge(saved, payload.meeting.reportDraft || saved.value);
  }

  async function saveReport() {
    if (!meeting?.id || busy || reportOperationRef.current) return;
    reportOperationRef.current = true;
    setReportOperation("saving");
    setError("");
    setNotice("");
    try {
      await persistReport();
      setNotice("Brouillon du compte rendu sauvegardé.");
    } catch (err) {
      setError(err.message);
    } finally {
      reportOperationRef.current = false;
      setReportOperation("");
    }
  }

  async function validateReport() {
    if (!meeting?.id || busy || reportOperationRef.current) return;
    if (!window.confirm("Valider cette version du compte rendu ? Une copie datée et identifiable sera conservée.")) return;
    reportOperationRef.current = true;
    setReportOperation("saving");
    setError("");
    setNotice("");
    try {
      await persistReport();
      setReportOperation("validating");
      const payload = await api(`/api/meetings/${meeting.id}/validate`, { method: "POST", body: {} });
      if (!applyMeeting(payload.meeting)) return;
      setNotice(`Compte rendu validé · version ${payload.version} conservée.`);
      await loadList(meeting.id);
    } catch (err) {
      setError(err.message);
    } finally {
      reportOperationRef.current = false;
      setReportOperation("");
    }
  }

  async function createConfirmedAction(marker) {
    if (!window.confirm("Créer cette action confirmée dans les actions FINCA MARIA, sans inventer d’autre responsable ni échéance ?")) return;
    try {
      const payload = await api(`/api/meetings/${meeting.id}/markers/${marker.id}/create-action`, {
        method: "POST",
        body: { confirmed: true }
      });
      if (!applyMeeting(payload.meeting)) return;
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
      if (!applyMeeting(payload.meeting)) return;
      setNotice(payload.duplicate ? "Ce document était déjà lié." : "Document BAÚL rattaché à la réunion.");
    } catch (err) {
      setError(err.message);
    }
  }

  function navigateWithoutLosingEdits(action) {
    const message = audioNavigationMessage();
    if (message) { setError(message); return; }
    if (hasUnsavedChanges()) {
      if (!window.confirm("Des modifications ne sont pas enregistrées. Quitter cette saisie sans les enregistrer ?")) return;
      preparationEditor.refresh(meeting ? prepFromMeeting(meeting) : emptyPreparation(), true);
      reportEditor.refresh(meeting?.reportDraft || { summary: "", subjects: "" }, true);
      speakerEditor.refresh(meeting?.speakerOverrides || {}, true);
      childDrafts.current.clear();
      setNewParticipant({ name: "", role: "", presence: "present" });
    }
    setNotice("");
    setError("");
    action();
  }

  function openMeeting(id) {
    if (id === selectedId && !newMode && !historicMode && !registerMode) return;
    navigateWithoutLosingEdits(() => {
      setRegisterMode(false);
      setHistoricMode(false);
      setNewMode(false);
      if (id === selectedId && !newMode) loadMeeting(id);
      else setSelectedId(id);
    });
  }

  function cancelNew() {
    navigateWithoutLosingEdits(() => {
      setNewMode(false);
      setSelectedId(previousMeetingId.current || meetings[0]?.id || "");
    });
  }

  function startNew() {
    if (!newMode) previousMeetingId.current = selectedId;
    meetingLoadGeneration.current += 1;
    foregroundLoad.current = -1;
    activeMeetingId.current = "";
    setBusy(false);
    setNewMode(true);
    setSelectedId("");
    setMeeting(null);
    setAudioNeedsFinalization(false);
    setPendingChunks(0);
    preparationEditor.refresh(emptyPreparation(), true);
    reportEditor.refresh({ summary: "", subjects: "" }, true);
    speakerEditor.refresh({}, true);
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
        <div className="meetingActions"><a className="meetingBack" onClick={protectAudioLink} href="?view=corbeille">Corbeille générale</a><a className="meetingBack" onClick={protectAudioLink} href="/">← FINCA MARIA</a></div>
      </header>

      <div className="meetingLayout">
        <aside className="meetingSidebar">
          <div className="meetingSidebarHead"><strong>Réunions</strong><button type="button" className="meetingBtn primary" disabled={Boolean(reportOperation)} onClick={() => navigateWithoutLosingEdits(() => { setHistoricMode(false); setRegisterMode(false); startNew(); })}>+ Nouvelle</button></div>
          <button className="meetingBtn" type="button" disabled={Boolean(reportOperation)} onClick={() => navigateWithoutLosingEdits(() => { setHistoricMode(true); setRegisterMode(false); setNewMode(false); })} style={{ width: "100%", marginBottom: "1rem" }}>Importer des comptes rendus</button>
          <button className="meetingBtn" type="button" disabled={Boolean(reportOperation)} onClick={() => navigateWithoutLosingEdits(() => { setRegisterMode(true); setHistoricMode(false); setNewMode(false); })} style={{ width: "100%", marginBottom: "1rem" }}>Registre des décisions</button>
          <div className="meetingListFilters">
            <label className="meetingField"><span>Rechercher une réunion</span><input type="search" maxLength={200} value={meetingSearch} placeholder="Titre, thème, texte ou date…" onChange={(event) => updateListFilters(event.target.value, reportFilter)} /></label>
            <label className="meetingField"><span>Compte rendu</span><select aria-label="Filtrer les réunions par compte rendu" value={reportFilter} onChange={(event) => updateListFilters(meetingSearch, event.target.value)}><option value="all">Toutes les réunions</option><option value="validated">Avec compte rendu validé</option><option value="pending">Sans compte rendu validé</option></select></label>
            {(meetingSearch || reportFilter !== "all") && <button type="button" className="meetingBtn" onClick={() => updateListFilters("", "all")}>Effacer les filtres</button>}
            <p className="meetingMuted" role="status">{listLoading ? "Recherche des réunions…" : `${meetings.length} réunion${meetings.length > 1 ? "s" : ""} affichée${meetings.length > 1 ? "s" : ""} sur ${meetingTotal}`}</p>
            {listError && <p role="alert">{listError} <button type="button" className="meetingBtn" disabled={listLoading} onClick={() => loadList()}>Réessayer la recherche</button></p>}
          </div>
          <div className="meetingList" aria-busy={listLoading}>
            {meetings.map((item) => (
              <button type="button" key={item.id} disabled={Boolean(reportOperation)} className={selectedId === item.id && !newMode ? "isActive" : ""} onClick={() => openMeeting(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.date} · {item.meetingType}</span>
                <small>{item.presentCount} présent(s) · {item.markerCount} repère(s){item.validatedVersion ? ` · CR v${item.validatedVersion}` : ""}</small>
              </button>
            ))}
            {!meetings.length && !listLoading && !listError ? <span className="meetingMuted">{meetingSearch || reportFilter !== "all" ? "Aucune réunion ne correspond à ces filtres." : "Aucune réunion enregistrée."}</span> : null}
          </div>
          {hasMoreMeetings && <button type="button" className="meetingBtn" disabled={listLoading} onClick={() => loadList("", true)}>Afficher plus de réunions</button>}
        </aside>

        <section className="meetingPanel">
          {error ? <div className="meetingNotice error" role="alert">{error}</div> : null}
          {notice ? <div className="meetingNotice ok">{notice}</div> : null}
          {preparationEditor.dirty || reportEditor.dirty || speakerEditor.dirty ? <p role="status">Des modifications ne sont pas encore enregistrées. L’actualisation automatique les conserve.</p> : null}
          {reportOperation ? <p role="status">{reportOperation === "saving" ? "Enregistrement du brouillon en cours…" : "Validation du compte rendu en cours…"}</p> : null}

          {registerMode ? (
            <MeetingDecisionRegister onOpen={openMeeting} onClose={() => setRegisterMode(false)} />
          ) : historicMode ? (
            <HistoricMeetingImport onClose={() => setHistoricMode(false)} onImported={async (id) => { await loadList(id); }} />
          ) : newMode ? (
            <form onSubmit={createMeeting}>
              <div className="meetingSection"><h2>Préparer une nouvelle réunion</h2>{renderPreparationFields(true)}</div>
              <div className="meetingActions"><button type="submit" className="meetingBtn primary" disabled={busy}>Créer et préparer la réunion</button><button type="button" className="meetingBtn" onClick={cancelNew}>Annuler</button></div>
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
                <div className="meetingActions"><button type="button" className="meetingBtn primary" onClick={savePreparation} disabled={busy || Boolean(reportOperation)}>Enregistrer la préparation</button></div>
              </section>

              <section className="meetingSection">
                <h3>Participants</h3>
                <div className="participantList">
                  {meeting.participants.map((participant) => (
                    <ParticipantEditor key={participant.id} participant={participant} onSave={saveParticipant} onDirtyChange={trackChildDraft} />
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
                <div className="stageRail">{STAGES.map((stage) => <button type="button" key={stage} className={meeting.stage === stage ? "isActive" : ""} disabled={Boolean(reportOperation)} onClick={() => changeStage(stage)}>{stage}</button>)}</div>
              </section>

              <section className="meetingSection">
                <h3>3 · Accompagner les échanges</h3>
                <div className="meetingNotice">
                  <strong>Avant tout enregistrement</strong><br />{RECORDING_NOTICE}
                  <label style={{ display: "block", marginTop: ".55rem" }}><input type="checkbox" disabled={recording || Boolean(audioOperation)} checked={recordingConsent} onChange={(event) => setRecordingConsent(event.target.checked)} /> J’ai informé les participants avant de conserver l’audio.</label>
                </div>

                <div className="recordingBar" style={{ marginTop: ".7rem" }}>
                  <span className={recording ? "recordingDot on" : "recordingDot"} aria-hidden="true" />
                  <strong className="recordingClock">{formatClock(elapsed)}</strong>
                  <span className="meetingMuted">{recording ? "Enregistrement" : sessionRunning ? "Réunion sans enregistrement" : "Prêt"}</span>
                  {!recording && !meeting.hasAudio && !audioNeedsRecovery ? <button type="button" className="meetingBtn primary" disabled={busy || Boolean(audioOperation)} onClick={startRecording}>● Enregistrer</button> : null}
                  {recording ? <button type="button" className="meetingBtn danger" disabled={Boolean(audioOperation)} onClick={stopRecording}>■ Arrêter</button> : null}
                  {!recording && !sessionRunning ? <button type="button" className="meetingBtn" disabled={Boolean(audioOperation)} onClick={() => startSession(true)}>Commencer sans enregistrer</button> : null}
                  {!recording && sessionRunning ? <button type="button" className="meetingBtn" onClick={() => setSessionRunning(false)}>Arrêter le chrono</button> : null}
                  {!recording && !meeting.hasAudio && !audioNeedsRecovery ? <label className="fileInput">Importer un audio<input type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.mp4" disabled={busy || Boolean(audioOperation)} onChange={importAudio} /></label> : null}
                  {audioNeedsRecovery && !recording ? <button type="button" className="meetingBtn" disabled={busy || Boolean(audioOperation)} onClick={retryAudioSave}>Reprendre la sauvegarde audio{pendingChunks > 0 ? ` (${pendingChunks} bloc(s))` : ""}</button> : null}
                </div>
                {audioStatus ? <p className="meetingMuted" role="status">{audioStatus}</p> : null}

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
                      onDirtyChange={trackChildDraft}
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
                  <label className="meetingField"><span>Synthèse rédigée et modifiable</span><textarea rows="5" disabled={Boolean(reportOperation)} value={reportDraft.summary || ""} onChange={(event) => setReportDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="Synthèse humaine : ne transformer aucune proposition en décision." /></label>
                  <label className="meetingField"><span>Sujets abordés</span><textarea rows="3" disabled={Boolean(reportOperation)} value={reportDraft.subjects || ""} onChange={(event) => setReportDraft((current) => ({ ...current, subjects: event.target.value }))} placeholder="Sujets réellement abordés" /></label>
                </div>
                <div className="meetingActions"><button type="button" className="meetingBtn" onClick={saveReport} disabled={busy || Boolean(reportOperation)}>Sauvegarder le brouillon</button><button type="button" className="meetingBtn primary" onClick={validateReport} disabled={busy || Boolean(reportOperation)}>Valider cette version</button></div>

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

function ParticipantEditor({ participant, onSave, onDirtyChange }) {
  const reportDirty = useCallback((dirty) => onDirtyChange(`participant:${participant.id}`, dirty), [onDirtyChange, participant.id]);
  const editor = useMeetingDraft(participant, reportDirty);
  const { value: draft, edit: setDraft, refresh } = editor;
  useEffect(() => refresh(participant), [participant, refresh]);
  async function save() {
    const snapshot = editor.snapshot();
    const saved = await onSave(snapshot.value);
    if (saved) editor.acknowledge(snapshot, saved);
  }
  return (
    <div className="participantRow">
      <label>Nom<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Présence<select value={draft.presence} onChange={(event) => setDraft({ ...draft, presence: event.target.value })}><option value="present">Présent</option><option value="absent">Absent</option><option value="excused">Excusé</option></select></label>
      <label>Rôle<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
      <label className="check"><input type="checkbox" checked={Boolean(draft.isFacilitator)} onChange={(event) => setDraft({ ...draft, isFacilitator: event.target.checked })} /> Anime</label>
      <button type="button" className="meetingBtn" onClick={save}>Enregistrer</button>
      {editor.dirty ? <small>Modifications non enregistrées</small> : null}
    </div>
  );
}

function MarkerCard({ marker, hasAudio, validated, documents, documentId, onDocumentChange, onLinkDocument, onSeek, onUpdate, onCreateAction, onDirtyChange }) {
  const reportDirty = useCallback((dirty) => onDirtyChange(`marker:${marker.id}`, dirty), [onDirtyChange, marker.id]);
  const editor = useMeetingDraft(marker, reportDirty);
  const { value: draft, edit: setDraft, refresh } = editor;
  useEffect(() => refresh(marker), [marker, refresh]);
  async function save() {
    const snapshot = editor.snapshot();
    const { note, classification, responsible, dueDate } = snapshot.value;
    const saved = await onUpdate({ note, classification, responsible, dueDate });
    if (saved) editor.acknowledge(snapshot, saved);
  }
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
        <button type="button" className="meetingBtn" onClick={save}>Enregistrer ce repère</button>
        {editor.dirty ? <small>Modifications non enregistrées</small> : null}
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
