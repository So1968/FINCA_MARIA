import { useRef, useState } from "react";

const QUESTIONS_STORAGE_KEY = "cortijo_questions";
const ANOMALIES_STORAGE_KEY = "cortijo_anomalies";
const CURRENT_BACKUP_FORMAT = "FINCA_MARIA_SAUVEGARDE";
const LEGACY_BACKUP_FORMAT = "CORTIJO_ALEMANES_SAUVEGARDE";

function safeParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || "null");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
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

export function CortijoTransferPanel() {
  const importInputRef = useRef(null);
  const [message, setMessage] = useState("Prêt pour une sauvegarde ou une restauration.");

  function exportFollowUp() {
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      format: CURRENT_BACKUP_FORMAT,
      version: "0.3",
      exportedAt: new Date().toISOString(),
      questions: safeParse(localStorage.getItem(QUESTIONS_STORAGE_KEY)),
      anomalies: safeParse(localStorage.getItem(ANOMALIES_STORAGE_KEY))
    };

    downloadJson(`FINCA_MARIA_SAUVEGARDE_${date}.json`, payload);
    setMessage("Sauvegarde du suivi téléchargée.");
  }

  async function importFollowUp(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const supportedFormats = [CURRENT_BACKUP_FORMAT, LEGACY_BACKUP_FORMAT];

      if (!supportedFormats.includes(payload.format)) {
        throw new Error("Ce fichier n’est pas une sauvegarde FINCA MARIA reconnue.");
      }

      if (!Array.isArray(payload.questions) || !Array.isArray(payload.anomalies)) {
        throw new Error("La sauvegarde est incomplète.");
      }

      localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(payload.questions));
      localStorage.setItem(ANOMALIES_STORAGE_KEY, JSON.stringify(payload.anomalies));
      setMessage(
        payload.format === LEGACY_BACKUP_FORMAT
          ? "Ancienne sauvegarde Cortijo importée avec compatibilité. Rechargement de FINCA MARIA…"
          : "Sauvegarde restaurée. Rechargement de FINCA MARIA…"
      );
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error.message || "Restauration impossible.");
    } finally {
      event.target.value = "";
    }
  }

  async function prepareBaulIndex() {
    try {
      const response = await fetch("/api/baul/export", { method: "POST" });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : {};
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Export BAÚL impossible.");
      setMessage(`Index du BAÚL préparé dans : ${payload.path}`);
    } catch (error) {
      setMessage(error.message || "Export BAÚL impossible.");
    }
  }

  return (
    <section className="cortijoTransferPanel" aria-label="Sauvegarde et transfert FINCA MARIA">
      <div>
        <span className="cortijoEyebrow">Portabilité du projet</span>
        <h2>Sauvegarder ou déplacer FINCA MARIA</h2>
        <p>
          Le suivi se sauvegarde dans un petit fichier JSON. Les preuves restent dans le dossier privé du BAÚL et doivent être copiées séparément lors d’un changement d’ordinateur.
        </p>
      </div>

      <div className="cortijoTransferActions">
        <button type="button" onClick={exportFollowUp}>Télécharger la sauvegarde du suivi</button>
        <button type="button" onClick={() => importInputRef.current?.click()}>Restaurer une sauvegarde</button>
        <button type="button" onClick={prepareBaulIndex}>Préparer l’index du BAÚL</button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={importFollowUp}
        />
      </div>

      <p className="cortijoTransferMessage" aria-live="polite">{message}</p>

      <div className="cortijoTransferRule">
        <strong>Pour changer d’ordinateur</strong>
        <span>1. télécharger la sauvegarde du suivi ; 2. copier le dossier BAUL_PRIVE ; 3. restaurer la sauvegarde sur le nouvel ordinateur.</span>
      </div>
    </section>
  );
}
