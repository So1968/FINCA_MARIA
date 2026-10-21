import { useEffect, useRef, useState } from "react";
import { dataStore, MAX_BACKUP_BYTES, parseBackup } from "../lib/storage.js";

function download(backup, suffix = "") {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `finca-maria-sauvegarde-${new Date().toISOString().replace(/[:.]/g, "-")}${suffix}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function StorageNotices() {
  const [issues, setIssues] = useState([]);
  useEffect(() => {
    const refresh = () => setIssues(dataStore.getIssues());
    const unsubscribe = dataStore.subscribe(refresh);
    refresh();
    return unsubscribe;
  }, []);
  if (!issues.length) return null;
  return <div className="page storage-notices">{issues.map((issue) => <p className="storage-warning" role="alert" key={issue}>{issue}</p>)}</div>;
}

export function BackupTools() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [incoming, setIncoming] = useState(null);
  const input = useRef(null);

  function exportData() {
    setMessage("");
    try {
      download(dataStore.backup());
      setError("");
      setMessage("Téléchargement lancé. Conservez ce fichier pour retrouver vos données sur un autre appareil.");
    } catch (err) { setError(err.message); }
  }

  async function inspectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setIncoming(null); setError(""); setMessage("");
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Fichier trop volumineux (5 Mo maximum).");
      setIncoming(parseBackup(await file.text()));
    } catch (err) { setError(err.message); }
  }

  function restore() {
    setMessage("");
    try {
      // Keep a downloadable copy of the state before merging.
      download(dataStore.backup(), "-avant-import");
      dataStore.restore(incoming);
      setIncoming(null); setError("");
      setMessage("Sauvegarde fusionnée. Une copie des données précédentes a été proposée au téléchargement.");
    } catch (err) { setError(err.message); }
  }

  return (
    <aside className="backup-tools page" aria-label="Sauvegarde des données">
      <details className="section">
        <summary><div className="section-title"><h2>Mes sauvegardes</h2><p>Conserver et transférer mes actions, travaux, notes et présences.</p></div></summary>
        <div className="section-body">
          <p>Les données restent dans ce navigateur. Pour les transférer sur un autre appareil, exportez un fichier puis importez-le sur cet appareil. L’import accepte les fichiers de sauvegarde .json créés ici.</p>
          <div className="top-actions">
            <button type="button" onClick={exportData}>Exporter ma sauvegarde</button>
            <button type="button" onClick={() => input.current?.click()}>Importer une sauvegarde</button>
            <input ref={input} type="file" accept=".json,application/json" aria-label="Fichier de sauvegarde" onChange={inspectFile} hidden />
          </div>
          {incoming && <div className="card import-preview">
            <h3>Sauvegarde prête à importer</h3>
            <p>{Object.keys(incoming.data.actions).length} suivis d’actions · {Object.keys(incoming.data.works).length} suivis de travaux · {Object.keys(incoming.data.notes).length} notes · {incoming.data.presences.length} présences.</p>
            <p>Les éléments déjà présents sont conservés. Pour un même élément, les champs du fichier importé remplacent les champs correspondants sur cet appareil. Une copie de l’état actuel sera proposée au téléchargement avant la fusion.</p>
            <div className="top-actions"><button type="button" onClick={restore}>Fusionner cette sauvegarde</button><button type="button" onClick={() => setIncoming(null)}>Annuler</button></div>
          </div>}
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      </details>
    </aside>
  );
}
