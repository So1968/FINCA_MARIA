import { useEffect, useRef, useState } from "react";

const PRESENCES = [
  ["unknown", "Non renseigné"],
  ["present", "Présent"],
  ["absent", "Absent"],
  ["excused", "Excusé"],
];
const CLASSES = [
  ["a_valider", "À vérifier"],
  ["decision_confirmee", "Décision adoptée · confirmée après lecture"],
  ["action_confirmee", "Action confirmée après lecture"],
  ["proposition", "Proposition / vote non abouti"],
  ["question_ouverte", "Question ouverte"],
  ["decision_reportee", "Décision reportée"],
  ["a_verifier", "À vérifier"],
  ["desaccord", "Désaccord"],
  ["declaration", "Déclaration"],
];
async function request(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Opération impossible.");
  return data;
}
export default function ArchiveReview({
  meeting,
  meetings,
  word = false,
  onSaved,
  onClose,
  onDirtyChange,
  onOperationChange,
}) {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState(meeting?.id || "");
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(meeting?.date || "");
  const [reviewed, setReviewed] = useState(false);
  const [dateReviewed, setDateReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    onDirtyChange(Boolean(file || preview));
    return () => onDirtyChange(false);
  }, [file, preview, onDirtyChange]);
  function reset() {
    setPreview(null);
    setReviewed(false);
    setDateReviewed(false);
    setError("");
  }
  async function choose(event) {
    const selected = event.target.files?.[0];
    reset();
    setFile(null);
    if (!selected) return;
    if (!/\.docx$/i.test(selected.name) || selected.size > 10 * 1024 * 1024) {
      setError(
        "Choisissez un fichier .docx de 10 Mio maximum. Pour un ancien .doc, enregistrez une copie .docx dans Word ou LibreOffice.",
      );
      return;
    }
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selected);
      });
      setFile({ name: selected.name, base64 });
    } catch {
      setError("Lecture du fichier impossible.");
    }
  }
  async function analyze() {
    if (pending.current) return;
    pending.current = true;
    onOperationChange(true);
    setBusy(true);
    setError("");
    try {
      const data = await request(
        "/api/meetings/archive-preview",
        word ? { file } : { meetingId: meeting.id },
      );
      setPreview({
        ...data,
        summary: meeting?.reportDraft?.summary || data.summary || "",
        subjects: meeting?.reportDraft?.subjects || data.subjects || "",
      });
      setTitle(data.title);
      setDate(
        target
          ? meetings.find((m) => m.id === target)?.date ||
              meeting?.date ||
              data.date
          : data.date,
      );
      setReviewed(false);
      setDateReviewed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      onOperationChange(false);
      setBusy(false);
    }
  }
  function patch(group, index, field, value) {
    setReviewed(false);
    setPreview((current) => ({
      ...current,
      [group]: current[group].map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  }
  function remove(group, index) {
    setReviewed(false);
    setPreview((current) => ({
      ...current,
      [group]: current[group].filter((_, i) => i !== index),
    }));
  }
  async function save() {
    if (pending.current || !reviewed || !preview) return;
    pending.current = true;
    onOperationChange(true);
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/meetings/structure-review", {
        meetingId: target || undefined,
        ...(word ? { file } : {}),
        sourceHash: preview.sourceHash,
        title,
        date,
        dateReviewed,
        reviewed,
        participants: preview.participants,
        markers: preview.markers,
        summary: preview.summary,
        subjects: preview.subjects,
      });
      onDirtyChange(false);
      setPreview(null);
      setFile(null);
      await onSaved(data.meeting, data.duplicate);
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      onOperationChange(false);
      setBusy(false);
    }
  }
  return (
    <section className="meetingSection">
      <h2>
        {word
          ? "Importer un compte rendu Word"
          : "Reprendre la structure de cette archive"}
      </h2>
      <p>
        Analyse sur votre serveur privé. Aucun enregistrement avant votre
        vérification. Les formulations détectées restent à vérifier, y compris
        celles qui contiennent « décision ».
      </p>
      <p className="meetingMuted">
        Les tableaux complexes et les noms mentionnés dans un récit peuvent
        échapper à l’extraction. Ajoutez ou corrigez les lignes ci-dessous
        depuis l’original. Les personnes de même nom sont regroupées :
        distinguez explicitement les homonymes.
      </p>
      <fieldset disabled={busy} className="archiveFields">
        {word && (
          <>
            <label className="meetingField">
              <span>Document Word (.docx)</span>
              <input type="file" accept=".docx" onChange={choose} />
            </label>
            <label className="meetingField">
              <span>Destination</span>
              <select
                aria-label="Destination du document Word"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  reset();
                }}
              >
                <option value="">Créer une nouvelle réunion</option>
                {meetings.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.date} · {m.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="meetingMuted">
              Pour rattacher à une réunion plus ancienne, ouvrez-la d’abord dans
              les archives puis utilisez l’import Word.
            </p>
          </>
        )}
        <button
          type="button"
          className="meetingBtn"
          disabled={word && !file}
          onClick={analyze}
        >
          {busy ? "Traitement en cours…" : "Analyser et afficher l’aperçu"}
        </button>
        {preview && (
          <>
            <details open>
              <summary>Texte original utilisé pour la vérification</summary>
              <pre className="archiveOriginal">{preview.originalText}</pre>
            </details>
            {preview.warnings.map((warning) => (
              <p key={warning} className="meetingMuted">
                {warning}
              </p>
            ))}
            {!target && (
              <>
                <label className="meetingField">
                  <span>Titre de la réunion</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label className="meetingField">
                  <span>Date exacte de la réunion</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setDateReviewed(false);
                    }}
                  />
                </label>
              </>
            )}
            {(preview.dateWarning || preview.number === "2") && (
              <p role="alert">
                Date à vérifier séparément :{" "}
                {preview.number === "2"
                  ? "compte rendu n° 2 ; incohérence signalée."
                  : "aucune date unique identifiable."}{" "}
                Aucune date n’est corrigée automatiquement dans une réunion
                existante.
              </p>
            )}
            <label>
              <input
                type="checkbox"
                checked={dateReviewed}
                onChange={(e) => setDateReviewed(e.target.checked)}
              />{" "}
              J’ai vérifié la date depuis la source (notamment le compte rendu
              n° 2).
            </label>
            <h3>Sujets et synthèse à vérifier</h3>
            <label className="meetingField">
              <span>Sujets principaux de l’archive</span>
              <textarea
                value={preview.subjects}
                onChange={(e) => {
                  setReviewed(false);
                  setPreview((p) => ({ ...p, subjects: e.target.value }));
                }}
              />
            </label>
            <label className="meetingField">
              <span>Synthèse de l’archive (rédaction humaine)</span>
              <textarea
                value={preview.summary}
                onChange={(e) => {
                  setReviewed(false);
                  setPreview((p) => ({ ...p, summary: e.target.value }));
                }}
              />
            </label>
            <h3>Participants et présences à vérifier</h3>
            {preview.participants.map((p, i) => (
              <div className="meetingSection" key={i}>
                <label className="meetingField">
                  <span>Nom du participant {i + 1}</span>
                  <input
                    value={p.name}
                    onChange={(e) =>
                      patch("participants", i, "name", e.target.value)
                    }
                  />
                </label>
                <label className="meetingField">
                  <span>Présence du participant {i + 1}</span>
                  <select
                    value={p.presence}
                    onChange={(e) =>
                      patch("participants", i, "presence", e.target.value)
                    }
                  >
                    {PRESENCES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="meetingField">
                  <span>Rôle du participant {i + 1}</span>
                  <input
                    value={p.role}
                    onChange={(e) =>
                      patch("participants", i, "role", e.target.value)
                    }
                  />
                </label>
                <small>
                  Source :{" "}
                  {p.evidence || "Ajout manuel à vérifier dans l’original"}
                </small>
                <button
                  type="button"
                  className="meetingBtn"
                  onClick={() => remove("participants", i)}
                >
                  Retirer le participant {i + 1} de l’aperçu
                </button>
              </div>
            ))}
            <button
              type="button"
              className="meetingBtn"
              onClick={() => {
                setReviewed(false);
                setPreview((p) => ({
                  ...p,
                  participants: [
                    ...p.participants,
                    { name: "", presence: "unknown", role: "" },
                  ],
                }));
              }}
            >
              Ajouter un participant à l’aperçu
            </button>
            <h3>Décisions, propositions, actions et questions</h3>
            {preview.markers.map((m, i) => (
              <div className="meetingSection" key={i}>
                <label className="meetingField">
                  <span>Texte du repère {i + 1}</span>
                  <textarea
                    value={m.note}
                    onChange={(e) =>
                      patch("markers", i, "note", e.target.value)
                    }
                  />
                </label>
                <label className="meetingField">
                  <span>Type du repère {i + 1}</span>
                  <select
                    value={m.type}
                    onChange={(e) =>
                      patch("markers", i, "type", e.target.value)
                    }
                  >
                    <option value="decision">Décision / proposition</option>
                    <option value="action">Action</option>
                    <option value="question">Question</option>
                  </select>
                </label>
                <label className="meetingField">
                  <span>Statut du repère {i + 1}</span>
                  <select
                    value={m.classification}
                    onChange={(e) =>
                      patch("markers", i, "classification", e.target.value)
                    }
                  >
                    {CLASSES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="meetingField">
                  <span>Responsable du repère {i + 1} (si explicite)</span>
                  <input
                    value={m.responsible}
                    onChange={(e) =>
                      patch("markers", i, "responsible", e.target.value)
                    }
                  />
                </label>
                <label className="meetingField">
                  <span>Échéance du repère {i + 1} (si explicite)</span>
                  <input
                    type="date"
                    value={m.dueDate}
                    onChange={(e) =>
                      patch("markers", i, "dueDate", e.target.value)
                    }
                  />
                </label>
                <button
                  type="button"
                  className="meetingBtn"
                  onClick={() => remove("markers", i)}
                >
                  Retirer le repère {i + 1} de l’aperçu
                </button>
              </div>
            ))}
            <button
              type="button"
              className="meetingBtn"
              onClick={() => {
                setReviewed(false);
                setPreview((p) => ({
                  ...p,
                  markers: [
                    ...p.markers,
                    {
                      type: "decision",
                      note: "",
                      classification: "a_valider",
                      responsible: "",
                      dueDate: "",
                    },
                  ],
                }));
              }}
            >
              Ajouter un repère à l’aperçu
            </button>
            <p>
              La reprise ajoute les éléments manquants et actualise les lignes
              de même nom ou de même texte ; elle ne supprime pas les lignes
              existantes. Le texte original et les versions validées restent
              inchangés. Un repère dont le texte est différent est un nouveau
              repère.
            </p>
            <label>
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />{" "}
              J’ai vérifié les noms, présences et statuts depuis l’original ; je
              valide ces informations.
            </label>
            <button
              type="button"
              className="meetingBtn primary"
              disabled={
                !reviewed ||
                ((preview.dateWarning || preview.number === "2") &&
                  !dateReviewed)
              }
              onClick={save}
            >
              Enregistrer les informations vérifiées
            </button>
          </>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="meetingBtn"
        disabled={busy}
        onClick={onClose}
      >
        Revenir à la réunion
      </button>
    </section>
  );
}
