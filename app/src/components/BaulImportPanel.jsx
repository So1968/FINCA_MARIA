import { useEffect, useRef, useState } from "react";

const SERVER_MODE = import.meta.env.VITE_FINCA_SERVER_MODE === "1";

const MAX_DIRECT_FILE_SIZE = 120 * 1024 * 1024;

const BAUL_CATEGORIES = [
  { value: "auto", label: "Tri automatique proposé" },
  { value: "factures", label: "Factures" },
  { value: "cooperative", label: "Agri San Juan" },
  { value: "pac", label: "PAC / subventions" },
  { value: "pelaez", label: "Peláez" },
  { value: "terrain", label: "Photos / vidéos terrain" },
  { value: "casa", label: "CASA — maison / location" },
  { value: "reunions", label: "Réunions / décisions" },
  { value: "messages", label: "WhatsApp / mails / captures" },
  { value: "plans", label: "Cadastre / SIGPAC / plans" },
  { value: "verifier", label: "À vérifier urgent" }
];

const CATEGORY_LABELS = Object.fromEntries(BAUL_CATEGORIES.map((item) => [item.value, item.label]));
const CATEGORY_CODES = {
  factures: "FACTURE",
  cooperative: "AGRI_SAN_JUAN",
  pac: "PAC",
  pelaez: "PELAEZ",
  terrain: "FINCA",
  casa: "CASA",
  reunions: "REUNION",
  messages: "MESSAGE",
  plans: "PLAN",
  verifier: "A_VERIFIER"
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    };
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function hashFile(file) {
  if (!window.crypto?.subtle) {
    throw new Error("Ton navigateur ne permet pas la vérification anti-doublon sécurisée.");
  }

  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatSize(size) {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} Mo`;
  if (size > 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${size} octets`;
}

function formatConfidence(confidence) {
  const percentage = Math.round(Number(confidence || 0) * 100);
  if (percentage >= 85) return `Confiance forte — ${percentage} %`;
  if (percentage >= 55) return `À contrôler — ${percentage} %`;
  return `Vérification indispensable — ${percentage} %`;
}

function makeBatchId() {
  const date = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `lot_${date}_${Math.random().toString(36).slice(2, 7)}`;
}

async function readPayload(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: "Réponse du BAÚL illisible." };
  }
}

function extensionOf(name) {
  const match = String(name || "").match(/\.[a-z0-9]{1,8}$/i);
  return match ? match[0].toLowerCase() : "";
}

function withoutExtension(name) {
  const extension = extensionOf(name);
  return extension ? String(name).slice(0, -extension.length) : String(name || "");
}

function normalizeLogicalToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
}

function logicalSubject(document) {
  const base = normalizeLogicalToken(withoutExtension(document.originalName));
  const generic = /^(IMG|DSC|PXL|VID|SCAN|SCANNED|PHOTO|DOCUMENT|CAMSCANNER)(_?[0-9]+)*$/;

  if (!base || generic.test(base)) {
    const mime = String(document.mimeType || "").toLowerCase();
    if (mime.startsWith("image/")) return "PHOTO";
    if (mime.startsWith("video/")) return "VIDEO";
    return "DOCUMENT";
  }

  return base;
}

function proposeLogicalName(document, category) {
  const date = /^\d{4}-\d{2}-\d{2}/.test(String(document.receivedAt || ""))
    ? String(document.receivedAt).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const code = CATEGORY_CODES[category] || "A_VERIFIER";
  const subject = logicalSubject(document);
  return `${date}__${code}__${subject}${extensionOf(document.originalName)}`;
}

function preparePendingDocument(document) {
  const selectedCategory = document.category || document.suggestedCategory || "verifier";
  return {
    ...document,
    selectedCategory,
    logicalName: document.logicalName || proposeLogicalName(document, selectedCategory),
    logicalNameTouched: Boolean(document.logicalName)
  };
}

function previewKind(document) {
  const mime = String(document.mimeType || "").toLowerCase();
  const name = String(document.originalName || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(name)) return "video";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("text/") || /\.(txt|csv|json|md|log)$/i.test(name)) return "text";
  return "unsupported";
}

function previewUrl(document) {
  return `/api/baul/preview?id=${encodeURIComponent(document.id)}`;
}

function QuickPreview({ document }) {
  const kind = previewKind(document);
  const src = previewUrl(document);

  return (
    <div className="baulQuickPreview" aria-label={`Aperçu rapide de ${document.originalName}`}>
      <div className="baulQuickPreviewHeader">
        <div>
          <span className="cortijoEyebrow">Aperçu rapide — sans quitter FINCA MARIA</span>
          <strong>{document.originalName}</strong>
        </div>
        <small>{document.mimeType || "Format non indiqué"}</small>
      </div>

      {kind === "image" && (
        <div className="baulPreviewCanvas isImage">
          <img src={src} alt={`Aperçu de ${document.originalName}`} loading="lazy" />
        </div>
      )}

      {kind === "video" && (
        <div className="baulPreviewCanvas isVideo">
          <video src={src} controls preload="metadata">
            Ton navigateur ne peut pas lire cette vidéo dans FINCA MARIA.
          </video>
        </div>
      )}

      {(kind === "pdf" || kind === "text") && (
        <div className={`baulPreviewCanvas ${kind === "pdf" ? "isPdf" : "isText"}`}>
          <iframe src={src} title={`Aperçu de ${document.originalName}`} loading="lazy" />
        </div>
      )}

      {kind === "unsupported" && (
        <div className="baulPreviewUnavailable">
          <strong>Aperçu intégré non disponible pour ce format.</strong>
          <span>Le fichier reste intact dans le BAÚL. Ne valide son classement que lorsque son contenu est identifié.</span>
        </div>
      )}
    </div>
  );
}

export function BaulImportPanel() {
  const fileInputRef = useRef(null);
  const [category, setCategory] = useState("auto");
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("Connexion au BAÚL privé…");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [baulPath, setBaulPath] = useState(SERVER_MODE ? "Stockage privé sur le serveur" : "Dossier local en cours de détection…");
  const [counts, setCounts] = useState({ total: 0, pending: 0, validated: 0 });
  const [progress, setProgress] = useState(null);
  const [lastBatch, setLastBatch] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    refreshStatus();
  }, []);

  async function refreshStatus() {
    try {
      const response = await fetch("/api/baul/status");
      const payload = await readPayload(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "BAÚL indisponible.");

      const preparedPending = (payload.pending || []).map(preparePendingDocument);
      setBaulPath(SERVER_MODE ? "Stockage privé sur le serveur" : payload.root);
      setCounts(payload.counts || { total: 0, pending: 0, validated: 0 });
      setPendingFiles(preparedPending);
      setPreviewId((current) => (
        preparedPending.some((document) => document.id === current)
          ? current
          : preparedPending[0]?.id || null
      ));
      setMessage(payload.counts?.pending
        ? `${payload.counts.pending} document(s) attendent ta validation. Le premier s’ouvre en aperçu rapide.`
        : "BAÚL prêt. Tu peux déposer tes documents.");
    } catch (error) {
      setMessage(SERVER_MODE
        ? `${error.message} Vérifie ta connexion et reconnecte-toi si nécessaire.`
        : `${error.message} Relance FINCA MARIA avec son raccourci local.`);
    }
  }

  async function checkExistingFiles(descriptors) {
    const response = await fetch("/api/baul/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: descriptors.map(({ file, sha256 }) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          sha256
        }))
      })
    });

    const payload = await readPayload(response);
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Contrôle anti-doublon impossible.");
    }

    return new Map((payload.duplicates || []).map((item) => [item.sha256, item]));
  }

  async function uploadFile(file, sha256, batchId) {
    const contentBase64 = await fileToBase64(file);
    const response = await fetch("/api/baul/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        category,
        sha256,
        batchId,
        contentBase64
      })
    });

    const payload = await readPayload(response);
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Import impossible : ${file.name}`);
    }

    if (payload.duplicate) {
      return { duplicate: true, existing: payload.existing };
    }

    return {
      duplicate: false,
      document: preparePendingDocument(payload.document)
    };
  }

  async function importFiles(files) {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length || isImporting) return;

    const oversized = selectedFiles.filter((file) => file.size > MAX_DIRECT_FILE_SIZE);
    const eligibleFiles = selectedFiles.filter((file) => file.size <= MAX_DIRECT_FILE_SIZE);

    if (!eligibleFiles.length) {
      setMessage("Tous les fichiers sélectionnés dépassent la limite de 120 Mo par fichier.");
      return;
    }

    setIsImporting(true);
    setLastBatch(null);
    setProgress({ phase: "empreintes", current: 0, total: eligibleFiles.length });
    setMessage(
      `Sécurisation de ${eligibleFiles.length} fichier(s) : le BAÚL vérifie d’abord lesquels sont déjà présents…`
    );

    const batchId = makeBatchId();
    const descriptors = [];
    const errors = [];
    const sameSelectionDuplicates = [];
    const seenHashes = new Map();

    try {
      for (let index = 0; index < eligibleFiles.length; index += 1) {
        const file = eligibleFiles[index];
        setProgress({ phase: "empreintes", current: index + 1, total: eligibleFiles.length });

        try {
          const sha256 = await hashFile(file);
          if (seenHashes.has(sha256)) {
            sameSelectionDuplicates.push({ file, duplicateOf: seenHashes.get(sha256).file.name });
          } else {
            const descriptor = { file, sha256 };
            seenHashes.set(sha256, descriptor);
            descriptors.push(descriptor);
          }
        } catch (error) {
          errors.push({ file: file.name, error: error.message || "Empreinte impossible" });
        }
      }

      setMessage("Comparaison avec tout ce qui existe déjà dans le BAÚL…");
      const existingByHash = await checkExistingFiles(descriptors);
      const toUpload = descriptors.filter(({ sha256 }) => !existingByHash.has(sha256));
      const alreadyInBaul = descriptors
        .filter(({ sha256 }) => existingByHash.has(sha256))
        .map(({ file, sha256 }) => ({ file: file.name, existing: existingByHash.get(sha256)?.existing }));

      const imported = [];
      const raceDuplicates = [];
      setProgress({ phase: "import", current: 0, total: toUpload.length });

      for (let index = 0; index < toUpload.length; index += 1) {
        const descriptor = toUpload[index];
        setProgress({ phase: "import", current: index + 1, total: toUpload.length });
        setMessage(`Import sécurisé ${index + 1}/${toUpload.length} — ${descriptor.file.name}`);

        try {
          const result = await uploadFile(descriptor.file, descriptor.sha256, batchId);
          if (result.duplicate) {
            raceDuplicates.push({ file: descriptor.file.name, existing: result.existing });
          } else {
            imported.push(result.document);
          }
        } catch (error) {
          errors.push({ file: descriptor.file.name, error: error.message || "Import impossible" });
        }
      }

      const duplicatesCount = alreadyInBaul.length + sameSelectionDuplicates.length + raceDuplicates.length;
      const skippedOversizedCount = oversized.length;

      setLastBatch({
        selected: selectedFiles.length,
        eligible: eligibleFiles.length,
        imported: imported.length,
        duplicates: duplicatesCount,
        errors: errors.length,
        oversized: skippedOversizedCount
      });

      if (imported.length) setPendingFiles((current) => [...imported, ...current]);
      await refreshStatus();

      const parts = [
        `${imported.length} nouveau(x) fichier(s) importé(s)`,
        `${duplicatesCount} doublon(s) ignoré(s)`
      ];
      if (errors.length) parts.push(`${errors.length} erreur(s)`);
      if (skippedOversizedCount) parts.push(`${skippedOversizedCount} fichier(s) > 120 Mo non importé(s)`);

      setMessage(
        `${parts.join(" · ")}. Tu peux re-sélectionner exactement le même lot plus tard : BAÚL ne recréera pas les doublons.`
      );
    } catch (error) {
      setMessage(
        `${error.message || "Import interrompu."} Tu peux recommencer avec le même lot : les fichiers déjà reçus seront reconnus.`
      );
    } finally {
      setIsImporting(false);
      setIsDragging(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileSelection(event) {
    importFiles(event.target.files);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    importFiles(event.dataTransfer.files);
  }

  function updatePendingCategory(id, selectedCategory) {
    setPendingFiles((current) => current.map((document) => {
      if (document.id !== id) return document;
      return {
        ...document,
        selectedCategory,
        logicalName: document.logicalNameTouched
          ? document.logicalName
          : proposeLogicalName(document, selectedCategory)
      };
    }));
  }

  function updateLogicalName(id, logicalName) {
    setPendingFiles((current) => current.map((document) => (
      document.id === id ? { ...document, logicalName, logicalNameTouched: true } : document
    )));
  }

  function reproposeLogicalName(document) {
    setPendingFiles((current) => current.map((item) => (
      item.id === document.id
        ? {
            ...item,
            logicalName: proposeLogicalName(item, item.selectedCategory),
            logicalNameTouched: false
          }
        : item
    )));
  }

  async function confirmClassification(document) {
    const currentIndex = pendingFiles.findIndex((item) => item.id === document.id);
    const nextDocument = pendingFiles[currentIndex + 1] || pendingFiles[currentIndex - 1] || null;

    setMessage(`Classement et renommage de ${document.originalName}…`);
    try {
      const response = await fetch("/api/baul/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: document.id,
          category: document.selectedCategory,
          logicalName: document.logicalName
        })
      });
      const payload = await readPayload(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Classement impossible.");

      setPendingFiles((current) => current.filter((item) => item.id !== document.id));
      setPreviewId((current) => current === document.id ? nextDocument?.id || null : current);
      if (payload.status?.counts) setCounts(payload.status.counts);
      setMessage(
        `${document.originalName} → ${payload.document?.logicalName || document.logicalName} · classé dans « ${CATEGORY_LABELS[document.selectedCategory]} ».`
      );
    } catch (error) {
      setMessage(error.message || "Classement interrompu.");
    }
  }

  async function openBaulFolder() {
    try {
      const response = await fetch("/api/baul/open", { method: "POST" });
      const payload = await readPayload(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Ouverture impossible.");
      setMessage("Dossier BAÚL ouvert dans le gestionnaire de fichiers.");
    } catch (error) {
      setMessage(error.message || "Impossible d’ouvrir le dossier depuis le logiciel.");
    }
  }

  async function exportBaulIndex() {
    try {
      const response = await fetch("/api/baul/export", { method: "POST" });
      const payload = await readPayload(response);
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Export impossible.");
      setMessage(`Index du BAÚL préparé : ${payload.path}`);
    } catch (error) {
      setMessage(error.message || "Export impossible.");
    }
  }

  return (
    <section className="baulImportPanel" aria-label="Import de documents dans le BAÚL">
      <div className="baulImportHeader">
        <div>
          <span className="cortijoEyebrow">BAÚL — entrée sécurisée</span>
          <h3>Déposer, regarder, nommer, classer</h3>
          <p>
            Tu vois le document avant validation. BAÚL propose aussi un nom logique ; tu peux le corriger avant le classement définitif, tandis que le nom reçu reste conservé dans l’historique.
          </p>
        </div>
        <div className="baulMiniStats" aria-label="État du BAÚL">
          <span><strong>{counts.pending}</strong> à valider</span>
          <span><strong>{counts.validated}</strong> classés</span>
          <span><strong>{counts.total}</strong> reçus</span>
        </div>
      </div>

      <div className="baulImportActions">
        <label>
          Mode de tri à l’entrée
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {BAUL_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>

        {!SERVER_MODE && <button type="button" onClick={openBaulFolder}>Ouvrir le dossier BAÚL</button>}
        <button type="button" onClick={exportBaulIndex}>Préparer l’index d’export</button>
      </div>

      <div
        className={`baulDropZone ${isDragging ? "isDragging" : ""}`}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
        }}
        role="button"
        tabIndex="0"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
        }}
      >
        <strong>{isImporting ? "Import massif sécurisé en cours…" : "+ Ajouter des documents"}</strong>
        <span>Tu peux sélectionner les 100 photos d’un coup — même si certaines ont déjà été envoyées.</span>
        <small>Anti-doublon par contenu · reprise sans risque · jusqu’à 120 Mo par fichier.</small>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={isImporting}
          onChange={handleFileSelection}
        />
      </div>

      {progress && (
        <p className="baulImportMessage" aria-live="polite">
          {progress.phase === "empreintes" ? "Vérification" : "Import"}: {progress.current}/{progress.total}
        </p>
      )}

      {lastBatch && (
        <div className="baulMiniStats" aria-label="Bilan du dernier lot">
          <span><strong>{lastBatch.selected}</strong> sélectionnés</span>
          <span><strong>{lastBatch.imported}</strong> nouveaux</span>
          <span><strong>{lastBatch.duplicates}</strong> doublons ignorés</span>
          {lastBatch.errors > 0 && <span><strong>{lastBatch.errors}</strong> erreurs</span>}
          {lastBatch.oversized > 0 && <span><strong>{lastBatch.oversized}</strong> trop lourds</span>}
        </div>
      )}

      <p className="baulImportMessage" aria-live="polite">{message}</p>
      <code className="baulPath">{baulPath}</code>

      <div className="baulValidationArea">
        <div className="baulValidationTitle">
          <div>
            <span className="cortijoEyebrow">Voir et nommer avant de valider</span>
            <h4>Documents à valider</h4>
            <p className="baulPreviewHint">Un seul document est prévisualisé à la fois pour garder l’écran léger.</p>
          </div>
          <button type="button" onClick={refreshStatus}>Actualiser</button>
        </div>

        {pendingFiles.length === 0 ? (
          <p className="cortijoEmpty">Aucun document en attente. Le sas d’entrée est vide.</p>
        ) : (
          <div className="baulPendingList">
            {pendingFiles.map((document) => (
              <article className={`baulPendingCard ${previewId === document.id ? "hasPreview" : ""}`} key={document.id}>
                <div className="baulPendingIdentity">
                  <strong>{document.originalName}</strong>
                  <span>{formatSize(document.size)}</span>
                  <small>{document.reason}</small>
                </div>

                <div className="baulSuggestion">
                  <span>Proposition du BAÚL</span>
                  <strong>{CATEGORY_LABELS[document.suggestedCategory] || "À vérifier urgent"}</strong>
                  <small>{formatConfidence(document.confidence)}</small>
                </div>

                <label className="baulValidationChoice">
                  Classement validé
                  <select
                    value={document.selectedCategory}
                    onChange={(event) => updatePendingCategory(document.id, event.target.value)}
                  >
                    {BAUL_CATEGORIES.filter((item) => item.value !== "auto").map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="baulLogicalNameField">
                  Nom logique proposé
                  <div className="baulLogicalNameRow">
                    <input
                      value={document.logicalName}
                      onChange={(event) => updateLogicalName(document.id, event.target.value)}
                      spellCheck="false"
                    />
                    <button type="button" onClick={() => reproposeLogicalName(document)}>Reproposer</button>
                  </div>
                  <small>Le nom d’origine reste conservé. Si plusieurs fichiers reçoivent le même nom, BAÚL ajoute automatiquement __02, __03…</small>
                </label>

                <div className="baulCardActions">
                  <button
                    type="button"
                    className="baulPreviewButton"
                    onClick={() => setPreviewId((current) => current === document.id ? null : document.id)}
                  >
                    {previewId === document.id ? "Masquer l’aperçu" : "Aperçu rapide"}
                  </button>
                  <button
                    type="button"
                    className="baulConfirmButton"
                    onClick={() => confirmClassification(document)}
                  >
                    Valider, renommer et classer
                  </button>
                </div>

                {previewId === document.id && <QuickPreview document={document} />}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
