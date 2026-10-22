import { useEffect, useState } from "react";
import "../meetings.css";

const TITLES = { reservation: "Réservations", meeting: "Réunions", document: "Documents du BAÚL" };
const empty = { reservation: [], meeting: [], document: [] };

async function request(url, options) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

export default function FincaTrashHub() {
  const [items, setItems] = useState(empty);
  const [roles, setRoles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const admin = roles.includes("admin-projet");

  async function refresh() {
    const [trash, me] = await Promise.all([
      request("/api/trash"),
      request("/api/auth/me")
    ]);
    setItems({ ...empty, ...(trash.items || {}) });
    setRoles(me.user?.roles || []);
  }
  useEffect(() => { refresh().catch((e) => setError(e.message)); }, []);

  async function restore(kind, id) {
    if (!admin || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/api/trash/${kind}/${encodeURIComponent(id)}/restore`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
      });
      await refresh();
      setNotice("Élément restauré. L'opération a été journalisée.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function purge() {
    if (!admin || busy || !candidate || confirmation !== "VIDER DEFINITIVEMENT") return;
    const { kind, id } = candidate;
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/api/trash/${kind}/${encodeURIComponent(id)}/purge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, itemId: id, confirmation })
      });
      setCandidate(null); setConfirmation("");
      await refresh();
      setNotice("Suppression définitive effectuée et inscrite au journal.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const count = Object.values(items).reduce((sum, list) => sum + list.length, 0);
  return <main className="fincaMeetings">
    <header className="meetingTop">
      <div><small>FINCA MARIA · Historique familial</small><h1>Corbeille générale</h1></div>
      <a className="meetingBack" href="?view=reunions">Retour aux réunions</a>
    </header>
    <div className="meetingPanel" style={{ maxWidth: 1100, margin: "auto" }}>
      <p className="meetingMuted">{count} élément(s) dans la corbeille. Tous les cohéritiers peuvent consulter cette liste. Seule l'administration familiale peut restaurer ou demander une purge.</p>
      {error && <p role="alert" className="meetingNotice">{error}</p>}
      {notice && <p role="status" className="meetingNotice">{notice}</p>}
      <button className="meetingBtn" type="button" disabled={busy} onClick={() => refresh().catch(e => setError(e.message))}>Actualiser</button>
      {Object.entries(TITLES).map(([kind, title]) => <section className="meetingSection" key={kind}>
        <h2>{title}</h2>
        {!items[kind]?.length && <p className="meetingMuted">Aucun élément supprimé.</p>}
        {(items[kind] || []).map((item) => <article className="meetingSection" key={item.id}>
          <strong>{item.label}</strong>
          <p className="meetingMuted">Supprimé le {item.deleted_at ? new Date(item.deleted_at).toLocaleString("fr-FR") : "date inconnue"} par {item.deleted_by_name || "Compte non identifié"}</p>
          {admin && <div className="meetingActions">
            <button type="button" className="meetingBtn" disabled={busy} onClick={() => restore(kind, item.id)}>Restaurer</button>
            {kind === "reservation" ? <button type="button" className="meetingBtn danger" disabled={busy} onClick={() => { setCandidate({ kind, id: item.id, label: item.label }); setConfirmation(""); }}>Supprimer définitivement</button> : <span className="meetingMuted">Suppression définitive verrouillée : contrôle des fichiers et sauvegardes requis.</span>}
          </div>}
        </article>)}
      </section>)}
      {candidate && <section className="meetingSection" aria-label="Confirmation de suppression définitive">
        <h2>Contrôle administrateur</h2>
        <p>Vous demandez la destruction définitive de <strong>{candidate.label}</strong>. Cette opération ne pourra pas être annulée depuis la corbeille.</p>
        <label className="meetingField"><span>Saisir exactement VIDER DEFINITIVEMENT</span>
          <input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off"/>
        </label>
        <div className="meetingActions">
          <button className="meetingBtn" onClick={() => { setCandidate(null); setConfirmation(""); }}>Annuler</button>
          <button className="meetingBtn danger" disabled={busy || confirmation !== "VIDER DEFINITIVEMENT"} onClick={purge}>Confirmer la suppression définitive</button>
        </div>
      </section>}
    </div>
  </main>;
}
