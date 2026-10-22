import { useEffect, useState } from "react";

export default function FincaBaulHub() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/meetings/documents", { credentials: "same-origin" })
      .then(async response => {
        if (!response.ok) throw new Error("Impossible de charger les documents du BAÚL.");
        return response.json();
      })
      .then(data => { if (active) setDocuments(Array.isArray(data.documents) ? data.documents : []); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <main className="cortijoDashboard fincaMariaShell" style={{ padding: "5rem 1.25rem 2rem", maxWidth: "1100px", margin: "auto", color: "#e8d4a0" }}>
    <h1>BAÚL — Documents familiaux</h1>
    <p>Documents enregistrés dans le coffre familial. Consultation uniquement sur cette page ; aucun document ne sera supprimé.</p>
    {loading && <p>Chargement des documents…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && (documents.length
      ? <ul style={{listStyle:"none",padding:0}}>{documents.map(doc=><li key={doc.id} style={{margin:".6rem 0",padding:"1rem",border:"1px solid #8a7540",borderRadius:"12px"}}><strong>{doc.name || "Document sans titre"}</strong>{doc.category && <span> · {doc.category}</span>}</li>)}</ul>
      : <p>Aucun document disponible dans le registre consulté.</p>)}
    <p style={{fontSize:".9rem"}}>La consultation et l’importation des fichiers dans le coffre seront complétées dans une prochaine étape. Cette page n’invente pas de documents ni de téléchargements.</p>
  </main>;
}
