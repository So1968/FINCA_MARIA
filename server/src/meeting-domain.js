export const MEETING_STAGES = ["Ouverture", "Participants", "Contexte", "Ordre du jour", "Échanges", "Validation", "Clôture"];

export const MARKER_TYPES = new Set([
  "decision",
  "action",
  "question",
  "a_verifier",
  "desaccord",
  "point_sensible",
  "document_evoque",
  "accord_a_confirmer"
]);

export const CLASSIFICATIONS = new Set([
  "proposition",
  "declaration",
  "decision_confirmee",
  "action_confirmee",
  "a_valider",
  "desaccord",
  "question_ouverte",
  "a_verifier",
  "document_evoque"
]);

const DEFAULT_CLASSIFICATION = {
  decision: "a_valider",
  action: "a_valider",
  question: "question_ouverte",
  a_verifier: "a_verifier",
  desaccord: "desaccord",
  point_sensible: "declaration",
  document_evoque: "document_evoque",
  accord_a_confirmer: "a_valider"
};

export function defaultClassification(markerType) {
  return DEFAULT_CLASSIFICATION[markerType] || "declaration";
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function introductionScore(text, participant) {
  const normalized = normalizeText(text);
  const name = normalizeText(participant);
  if (!normalized || !name) return 0;
  const selfCue = /\b(je suis|je m appelle|moi c est|mon nom est|je me presente|je me nomme)\b/.test(normalized);
  if (!selfCue) return 0;
  return normalized.includes(name) ? 10 : 0;
}

export function mapSpeakersFromIntroductions(turns = [], participants = []) {
  const speakers = [];
  for (const turn of turns) {
    if (turn.sourceSpeaker !== "?" && !speakers.includes(turn.sourceSpeaker)) speakers.push(turn.sourceSpeaker);
  }

  const candidates = [];
  for (const turn of turns) {
    if (Number(turn.start || 0) > 600 || turn.sourceSpeaker === "?") continue;
    for (const participant of participants) {
      const score = introductionScore(turn.text, participant) + (Number(turn.start || 0) <= 180 ? 1 : 0);
      if (score >= 10) candidates.push({ speaker: turn.sourceSpeaker, participant, score, start: Number(turn.start || 0) });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.start - b.start);

  const map = {};
  const usedParticipants = new Set();
  for (const candidate of candidates) {
    if (map[candidate.speaker] || usedParticipants.has(candidate.participant)) continue;
    map[candidate.speaker] = { name: candidate.participant, confidence: "presentation-explicite" };
    usedParticipants.add(candidate.participant);
  }

  const order = Object.fromEntries(speakers.map((speaker, index) => [speaker, index + 1]));
  return { map, order, detectedSpeakerCount: speakers.length };
}

export function finalizeTurns(turns = [], participants = []) {
  const mapping = mapSpeakersFromIntroductions(turns, participants);
  const segments = turns.map((turn, index) => {
    const mapped = mapping.map[turn.sourceSpeaker];
    const fallbackNumber = mapping.order[turn.sourceSpeaker] || "?";
    return {
      id: index + 1,
      start: Number(turn.start || 0),
      end: Number(turn.end ?? turn.start ?? 0),
      sourceSpeaker: turn.sourceSpeaker || "?",
      speaker: mapped?.name || `Intervenant ${fallbackNumber}`,
      speakerConfidence: mapped?.confidence || "non-identifie",
      text: String(turn.text || "").trim()
    };
  });
  return { segments, speakerMapping: mapping.map, detectedSpeakerCount: mapping.detectedSpeakerCount };
}

export function speakerForInterval(start, end, diarization = []) {
  const midpoint = (Number(start || 0) + Number(end || 0)) / 2;
  const containing = diarization.find((item) => midpoint >= item.start && midpoint <= item.end);
  if (containing) return containing.speaker;

  let best = null;
  let bestOverlap = 0;
  for (const item of diarization) {
    const overlap = Math.max(0, Math.min(end, item.end) - Math.max(start, item.start));
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = item;
    }
  }
  return best?.speaker || "?";
}

export function buildSpeakerTurns(local, diarization = []) {
  const segments = Array.isArray(local?.segments) ? local.segments : [];
  const words = Array.isArray(local?.words) ? local.words : [];
  if (!diarization.length) {
    return segments.map((segment) => ({
      start: Number(segment.start || 0),
      end: Number(segment.end ?? segment.start ?? 0),
      sourceSpeaker: "?",
      text: String(segment.text || "").trim()
    }));
  }

  const sourceWords = words.length
    ? words
    : segments.map((segment) => ({ start: segment.start, end: segment.end, word: ` ${segment.text || ""}` }));

  const turns = [];
  for (const word of sourceWords) {
    const start = Number(word.start || 0);
    const end = Number(word.end ?? word.start ?? 0);
    const sourceSpeaker = speakerForInterval(start, end, diarization);
    const raw = String(word.word || "");
    if (!raw.trim()) continue;
    const previous = turns[turns.length - 1];
    if (previous && previous.sourceSpeaker === sourceSpeaker && start - previous.end <= 1.4) {
      previous.end = Math.max(previous.end, end);
      previous.rawText += raw.startsWith(" ") ? raw : ` ${raw}`;
      previous.text = previous.rawText.trim();
    } else {
      turns.push({ start, end, sourceSpeaker, rawText: raw, text: raw.trim() });
    }
  }
  return turns;
}

export function cleanSpeakerMapping(mapping, participantNames) {
  const allowed = new Set((participantNames || []).map((name) => String(name || "").trim()).filter(Boolean));
  const cleaned = {};
  for (const [sourceSpeaker, name] of Object.entries(mapping || {})) {
    const source = String(sourceSpeaker || "").trim();
    const participant = String(name || "").trim();
    if (source && allowed.has(participant)) cleaned[source] = participant;
  }
  return cleaned;
}

export function applySpeakerOverrides(transcript, overrides = {}) {
  if (!transcript || !Array.isArray(transcript.segments)) return transcript;
  return {
    ...transcript,
    speakerOverrides: { ...(transcript.speakerOverrides || {}), ...overrides },
    segments: transcript.segments.map((segment) => {
      const confirmed = overrides[segment.sourceSpeaker];
      return confirmed
        ? { ...segment, speaker: confirmed, speakerConfidence: "confirme-manuel" }
        : segment;
    })
  };
}

export function confirmedActionId(meetingId, markerId) {
  return `meeting-${meetingId}-${markerId}`;
}

export function buildConfirmedAction({ meeting, marker }) {
  if (!meeting?.id || !marker?.id || marker.classification !== "action_confirmee") {
    throw new Error("Cette action doit être confirmée humainement avant sa création.");
  }
  return {
    id: confirmedActionId(meeting.id, marker.id),
    title: String(marker.note || "Action décidée en réunion").trim().slice(0, 220),
    category: "Conseil de famille",
    assignedTo: String(marker.responsible || "").trim() || "À attribuer",
    dueAt: marker.due_date || "",
    notifyAt: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactWhatsapp: "",
    instructions: `Source : ${meeting.title || "réunion"} (${meeting.meeting_date || ""}). Marqueur à ${Math.round(Number(marker.time_seconds || 0))} s.`,
    priority: "Normal",
    status: "À faire",
    createdAt: new Date().toISOString().slice(0, 10),
    sourceMeetingId: meeting.id,
    sourceMarkerId: marker.id
  };
}
