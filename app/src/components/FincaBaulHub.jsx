import { useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  ["factures", "Factures"], ["cooperative", "Coopérative"], ["pac", "PAC"],
  ["pelaez", "Peláez / Fiscalité"], ["terrain", "Terrain"], ["casa", "Maison"],
  ["reunions", "Réunions"], ["messages", "Messages"], ["plans", "Plans"],
  ["verifier", "À vérifier"]
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);
const MAX_IMPORT = 20 * 1024 * 1024;
const PAGE_SIZE = 40;

async function api(url, options) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Opération impossible.");
  return result;
}
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function toBase64(bytes) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    result += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(result);
}
function formatSize(value) {
  const number = Number(value) || 0;
  return number >= 1048576 ? `${(number / 1048576).toFixed(1)} Mo` : `${Math.max(0, Math.round(number / 1024))} Ko`;
}
function DocumentRow({ document, admin, onConfirm, pending }) {
  const [category, setCategory] = useState(document.suggestedCategory || document.category || "verifier");
  const [logicalName, setLogicalName] = useState(document.logicalName || document.originalName || document.name || "");
  const id = document.id;
  const label = document.logicalName || document.name || document.originalName || "Document";
  return <li className="baulDoc" key={id}>
    <div className="baulDocHead">
      <span><strong>{label}</strong><small>{CATEGORY_LABELS[document.category] || document.category || (pending ? "À classer" : "Document")} · {formatSize(document.size)}</small></span>
      <a href={`/api/baul/preview?id=${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir ${label}`}>Ouvrir ↗</a>
    </div>
    {pending && admin && <div className="baulClassify">
      <label>Nom du document<input value={logicalName} onChange={e => setLogicalName(e.target.value)} maxLength={180}/></label>
      <label>Classement<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
      <button type="button" onClick={() => onConfirm(id, logicalName, category)} disabled={!logicalName.trim()}>Classer</button>
    </div>}
  </li>;
}
export default function FincaBaulHub() {
  const [documents, setDocuments] = useState([]);
  const [pending, setPending] = useState([]);
  const [counts, setCounts] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pendingQuery, setPendingQuery] = useState("");
  const [pendingPage, setPendingPage] = useState(0);
  const [documentPage, setDocumentPage] = useState(0);
  const [selected, setSelected] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("verifier");
  const [bulkProgress, setBulkProgress] = useState(null);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [folderMode, setFolderMode] = useState(false);
  const [failedFiles, setFailedFiles] = useState([]);
  const [category, setCategory] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const [list, me] = await Promise.all([
      api("/api/meetings/documents"),
      api("/api/auth/me")
    ]);
    const roles = me.user?.roles || [];
    const isAdmin = roles.includes("admin-projet") || roles.includes("admin-secretariat");
    setAdmin(isAdmin);
    setDocuments(Array.isArray(list.documents) ? list.documents : []);
    if (isAdmin) {
      const state = await api("/api/baul/status");
      setPending(Array.isArray(state.pending) ? state.pending : []);
      setCounts(state.counts || null);
    } else {
      setPending([]);
      setCounts(null);
    }
  }
  useEffect(() => {
    let active = true;
    refresh().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingVisible = useMemo(() => pending.filter(doc => `${doc.logicalName || ""} ${doc.originalName || ""} ${doc.category || ""}`.toLocaleLowerCase("fr").includes(pendingQuery.toLocaleLowerCase("fr").trim())), [pending, pendingQuery]);
  const visible = useMemo(() => documents.filter(doc => {
    const text = `${doc.name || ""} ${doc.logicalName || ""} ${doc.originalName || ""} ${doc.category || ""}`.toLocaleLowerCase("fr");
    return text.includes(query.toLocaleLowerCase("fr").trim()) && (filter === "all" || doc.category === filter);
  }), [documents, query, filter]);

  const pendingPages = Math.max(1, Math.ceil(pendingVisible.length / PAGE_SIZE));
  const documentPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pendingSlice = pendingVisible.slice(Math.min(pendingPage, pendingPages - 1) * PAGE_SIZE, (Math.min(pendingPage, pendingPages - 1) + 1) * PAGE_SIZE);
  const documentSlice = visible.slice(Math.min(documentPage, documentPages - 1) * PAGE_SIZE, (Math.min(documentPage, documentPages - 1) + 1) * PAGE_SIZE);

  async function importFile(event) {
    event.preventDefault();
    if (!admin || !files.length || busy) return;
    setBusy(true); setError(""); setMessage(""); setBatchResults([]); setFailedFiles([]);
    const results = [];
    const retry = [];
    let imported = 0, duplicates = 0, failed = 0;
    try {
      if (!globalThis.crypto?.subtle) throw new Error("Le navigateur ne permet pas le contrôle SHA-256 sur cette connexion.");
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length, name: file.name });
        try {
          if (file.size > MAX_IMPORT) throw new Error("Fichier supérieur à 20 Mo.");
          const bytes = new Uint8Array(await file.arrayBuffer());
          const sha256 = toHex(await crypto.subtle.digest("SHA-256", bytes));
          const relativePath = folderMode && file.webkitRelativePath ? file.webkitRelativePath : file.name;
          const safeDisplayName = folderMode ? relativePath.split("/").filter(Boolean).join(" - ").slice(-180) : file.name;
          // Vérifie le coffre avant de transmettre le contenu lourd.
          const preflight = await api("/api/baul/check", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: [{ sha256 }] })
          });
          if (preflight.duplicates?.length) {
            duplicates++;
            results.push({ name: file.name, status: "Déjà présent (ignoré)" });
            setBatchResults([...results]);
            continue;
          }
          const result = await api("/api/baul/upload", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: safeDisplayName, type: file.type || "application/octet-stream",
              size: file.size, sha256, category, contentBase64: toBase64(bytes) })
          });
          if (result.duplicate) { duplicates++; results.push({ name: file.name, status: "Déjà présent" }); }
          else { imported++; results.push({ name: file.name, status: "Importé" }); }
        } catch (e) {
          failed++;
          retry.push(file);
          results.push({ name: file.name, status: "Échec", detail: e.message });
        }
        setBatchResults([...results]);
      }
      setFailedFiles(retry);
      setMessage(`Lot terminé : ${imported} importé(s), ${duplicates} doublon(s), ${failed} échec(s). Aucun document existant remplacé.`);
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); setProgress(null); }
  }

  async function confirmDocument(id, logicalName, selectedCategory) {
    if (!admin || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/baul/confirm", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, logicalName: logicalName.trim(), category: selectedCategory }) });
      setMessage("Document classé dans le BAÚL.");
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function classifySelected() {
    if (!admin || busy || !selected.length) return;
    const work = pending.filter(doc => selected.includes(doc.id));
    if (!work.length) return;
    setBusy(true); setError(""); setMessage("");
    let success = 0;
    const failures = [];
    try {
      for (let index = 0; index < work.length; index++) {
        const doc = work[index];
        setBulkProgress({ current: index + 1, total: work.length });
        try {
          await api("/api/baul/confirm", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: doc.id, logicalName: doc.logicalName || doc.originalName, category: bulkCategory })
          });
          success++;
        } catch (error) {
          failures.push(`${doc.originalName} : ${error.message}`);
        }
      }
      setSelected(failures.length ? work.filter(doc => failures.some(item => item.startsWith(`${doc.originalName} :`))).map(doc => doc.id) : []);
      setMessage(`Classement terminé : ${success} document(s) classé(s), ${failures.length} échec(s).`);
      if (failures.length) setError(failures.slice(0, 5).join(" ; "));
      await refresh();
    } finally { setBulkProgress(null); setBusy(false); }
  }

  return <main className="cortijoDashboard fincaMariaShell baulHub">
    <style>{`
      .baulHub{max-width:1080px;margin:0 auto;padding:1.5rem;color:#f1dfac}
      .baulHub h1{font:700 2rem Georgia,serif;margin:.5rem 0}.baulHub p{line-height:1.45}
      .baulHub .baulTools{display:flex;gap:.65rem;align-items:end;flex-wrap:wrap;margin:1rem 0}
      .baulHub label{display:flex;flex-direction:column;gap:.3rem;font-size:.87rem}
      .baulHub input,.baulHub select{min-height:39px;border:1px solid #8a7540;border-radius:9px;background:#101912;color:#fff1ca;padding:.5rem}
      .baulHub button,.baulHub .baulDocHead a{border:1px solid #8a7540;border-radius:9px;background:#263a29;color:#fff0bc;min-height:39px;padding:.5rem .8rem;cursor:pointer;text-decoration:none}
      .baulHub button:disabled{opacity:.5;cursor:not-allowed}
      .baulHub section{margin-top:1.35rem}.baulHub ul{list-style:none;padding:0}
      .baulDoc{border:1px solid #77683d;border-radius:12px;padding:.8rem;margin:.65rem 0;background:#111c14}
      .baulDocHead{display:flex;justify-content:space-between;align-items:center;gap:.7rem}
      .baulDocHead small{display:block;margin-top:.3rem;color:#c6b88d}
      .baulClassify{display:flex;align-items:end;flex-wrap:wrap;gap:.6rem;margin-top:.85rem}
      .baulClassify label:first-child{flex:1;min-width:180px}
      .baulHub .baulInfo{background:#15231a;border:1px solid #5a754d;border-radius:12px;padding:.8rem;margin:.6rem 0}
      @media(max-width:650px){.baulDocHead{align-items:start}.baulHub{padding:.75rem}.baulTools label{width:100%}}
    `}</style>
    <h1>BAÚL <small style={{fontSize:".55em"}}>Documents familiaux</small></h1>
    <p>Retrouver les documents de la finca, les consulter et les classer. Les fichiers restent dans le coffre privé.</p>
    {loading && <p role="status">Chargement…</p>}
    {error && <p role="alert" className="baulInfo">{error}</p>}
    {message && <p role="status" className="baulInfo">{message}</p>}
    {admin && <section>
      <h2>Ajouter un document</h2>
      <form onSubmit={importFile} className="baulTools">
        <label>Mode de sélection<select value={folderMode ? "folder" : "files"} disabled={busy} onChange={e => { setFolderMode(e.target.value === "folder"); setFiles([]); setBatchResults([]); setFailedFiles([]); }}><option value="files">Plusieurs fichiers</option><option value="folder">Un dossier complet (sans limite de nombre)</option></select></label>
        {folderMode
          ? <label>Dossier à importer<input key="folder" type="file" multiple webkitdirectory="" directory="" onChange={e => { setFiles(Array.from(e.target.files || [])); setBatchResults([]); setFailedFiles([]); }} required disabled={busy}/></label>
          : <label>Fichiers à importer<input key="files" type="file" multiple onChange={e => { setFiles(Array.from(e.target.files || [])); setBatchResults([]); }} required disabled={busy}/></label>}
        <label>Catégorie suggérée<select value={category} onChange={e => setCategory(e.target.value)}><option value="auto">À vérifier</option>{CATEGORIES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <button type="submit" disabled={busy || !files.length}>{busy ? "Import en cours…" : `Importer ${files.length || ""} fichier(s)`}</button>
      </form>
      <p style={{fontSize:".82rem"}}>Sélectionne plusieurs fichiers avec Ctrl ou Maj. L'import se fait un fichier à la fois, sans remplacer les doublons. Le classement reste à confirmer.</p>
      {progress && <div role="status" className="baulInfo"><p>Fichier {progress.current} sur {progress.total} : {progress.name}</p><progress value={progress.current - 1} max={progress.total} style={{width:"100%"}} /></div>}
      {batchResults.length > 0 && <details open className="baulInfo"><summary>Résultats de l'import ({batchResults.length})</summary><ul>{batchResults.map((item, i) => <li key={i}>{item.name} — {item.status}{item.detail ? ` : ${item.detail}` : ""}</li>)}</ul></details>}
    </section>}
    {admin && <section>
      <h2>À classer {counts ? `(${counts.pending})` : ""}</h2>
      <div className="baulTools">
        <label>Rechercher parmi les documents à classer<input type="search" value={pendingQuery} onChange={e => { setPendingQuery(e.target.value); setPendingPage(0); }} placeholder="Nom, dossier…" /></label>
        <button type="button" disabled={busy || !pendingVisible.length} onClick={() => setSelected(pendingVisible.map(doc => doc.id))}>Tout sélectionner (résultats)</button>
        <button type="button" disabled={busy || !selected.length} onClick={() => setSelected([])}>Désélectionner</button>
      </div>
      {selected.length > 0 && <div className="baulInfo baulTools">
        <strong>{selected.length} sélectionné(s)</strong>
        <label>Catégorie commune<select value={bulkCategory} disabled={busy} onChange={e => setBulkCategory(e.target.value)}>{CATEGORIES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <button type="button" disabled={busy} onClick={classifySelected}>Classer la sélection</button>
        {bulkProgress && <span role="status">Classement {bulkProgress.current}/{bulkProgress.total}</span>}
      </div>}
      {pendingVisible.length ? <ul>{pendingSlice.map(doc => <div key={doc.id} style={{display:"flex",gap:".6rem",alignItems:"start"}}>
        <input type="checkbox" aria-label={`Sélectionner ${doc.originalName}`} checked={selected.includes(doc.id)} disabled={busy} onChange={e => setSelected(current => e.target.checked ? [...new Set([...current, doc.id])] : current.filter(id => id !== doc.id))} style={{marginTop:"1.2rem"}} />
        <div style={{flex:1,minWidth:0}}><DocumentRow document={doc} pending admin={admin} onConfirm={confirmDocument} /></div>
      </div>)}</ul> : <p>{pending.length ? "Aucun document ne correspond à la recherche." : "Aucun document en attente."}</p>}
      {pendingPages > 1 && <div className="baulTools"><button type="button" disabled={pendingPage === 0} onClick={() => setPendingPage(p => Math.max(0, p - 1))}>← Précédent</button><span>Page {Math.min(pendingPage, pendingPages - 1) + 1} sur {pendingPages} · {pendingVisible.length} fichiers</span><button type="button" disabled={pendingPage >= pendingPages - 1} onClick={() => setPendingPage(p => Math.min(pendingPages - 1, p + 1))}>Suivant →</button></div>}
    </section>}
    <section>
      <h2>Documents classés</h2>
      <div className="baulTools">
        <label>Rechercher<input type="search" value={query} onChange={e => { setQuery(e.target.value); setDocumentPage(0); }} placeholder="Nom du fichier…"/></label>
        <label>Catégorie<select value={filter} onChange={e => { setFilter(e.target.value); setDocumentPage(0); }}><option value="all">Toutes les catégories</option>{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      {!loading && (visible.length ? <ul>{documentSlice.map(doc => <DocumentRow document={doc} key={doc.id} admin={admin} />)}</ul> : <p>Aucun document ne correspond à la recherche.</p>)}
      {documentPages > 1 && <div className="baulTools"><button type="button" disabled={documentPage === 0} onClick={() => setDocumentPage(p => Math.max(0, p - 1))}>← Précédent</button><span>Page {Math.min(documentPage, documentPages - 1) + 1} sur {documentPages} · {visible.length} fichiers</span><button type="button" disabled={documentPage >= documentPages - 1} onClick={() => setDocumentPage(p => Math.min(documentPages - 1, p + 1))}>Suivant →</button></div>}
    </section>
  </main>;
}
