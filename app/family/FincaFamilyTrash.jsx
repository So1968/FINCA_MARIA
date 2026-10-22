import React, { useEffect, useState } from "react";

const CATEGORIES = [
  ["reservation", "Réservations"],
  ["meeting", "Réunions et comptes rendus"],
  ["document", "Documents du BAÚL"]
];

export default function FincaFamilyTrash() {
  const [items, setItems] = useState({});
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [trashResponse, historyResponse] = await Promise.all([
        fetch("/api/trash", { credentials: "same-origin" }),
        fetch("/api/trash/history", { credentials: "same-origin" })
      ]);
      if (!trashResponse.ok || !historyResponse.ok) throw new Error("Accès à l'historique indisponible");
      const trash = await trashResponse.json();
      const past = await historyResponse.json();
      setItems(trash.items || {});
      setHistory(past.receipts || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  return <section className="familyPage">
    <header>
      <span className="familyEyebrow">Traçabilité familiale</span>
      <h1>Corbeille générale</h1>
      <p>Chaque cohéritier peut consulter les suppressions. La restauration et le vidage définitif se font uniquement depuis l'administration.</p>
      <button type="button" onClick={refresh} disabled={loading}>Actualiser</button>
    </header>
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Chargement de la corbeille…</p>}
    {!loading && CATEGORIES.map(([kind, label]) => <section className="familyCard" key={kind}>
      <h2>{label}</h2>
      {(items[kind] || []).length === 0 && <p>Aucun élément dans la corbeille.</p>}
      {(items[kind] || []).map(item => <div key={item.id} className="familyListItem">
        <strong>{item.label}</strong>
        <p>Supprimé par {item.deleted_by_name || "Compte historique"} le {item.deleted_at ? new Date(item.deleted_at).toLocaleString("fr-FR") : "date inconnue"}.</p>
      </div>)}
    </section>)}
    {!loading && <section className="familyCard">
      <h2>Historique des suppressions définitives</h2>
      {history.length === 0 && <p>Aucune opération définitive enregistrée.</p>}
      {history.map((item, index) => <div className="familyListItem" key={item.kind + item.object_id + index}>
        <strong>{item.item_summary}</strong>
        <p>Effacement demandé par {item.purged_by_name} le {new Date(item.purged_at).toLocaleString("fr-FR")}. Suppression initiale : {item.deleted_by_name}.</p>
      </div>)}
    </section>}
  </section>;
}
