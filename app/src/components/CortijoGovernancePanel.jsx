import { useEffect, useState } from "react";
import { cortijoAccessPrinciples, cortijoAdministrators, cortijoGovernanceCurrent, cortijoRoles } from "../data/cortijoAccess";

const SERVER_MODE = import.meta.env.VITE_FINCA_SERVER_MODE === "1";

function formatDateTime(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString("fr-FR"); } catch { return String(value); }
}

export function CortijoGovernancePanel() {
  const [users, setUsers] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "heritier" });

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body.error || `Erreur ${response.status}`);
    return body;
  }

  async function loadUsers() {
    if (!SERVER_MODE) return;
    setLoadingUsers(true);
    try {
      const result = await api("/api/admin/users");
      setUsers(result.users || []);
    } catch (error) {
      setMessage(error.message || "Impossible de charger les comptes.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadAudit() {
    if (!SERVER_MODE) return;
    try {
      const result = await api("/api/admin/audit?limit=30");
      setAuditEvents(result.events || []);
    } catch (error) {
      setMessage(error.message || "Impossible de charger le journal d’audit.");
    }
  }

  async function refreshAdminData() {
    await Promise.all([loadUsers(), loadAudit()]);
  }

  useEffect(() => {
    refreshAdminData();
  }, []);

  async function createUser(event) {
    event.preventDefault();
    if (!SERVER_MODE) return;
    setMessage("Création du compte…");
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          roles: [form.role]
        })
      });
      setForm({ name: "", email: "", password: "", role: "heritier" });
      setMessage("Compte créé.");
      await refreshAdminData();
    } catch (error) {
      setMessage(error.message || "Création impossible.");
    }
  }

  async function updateUser(user, patch, successMessage) {
    if (!SERVER_MODE) return;
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(patch)
      });
      setMessage(successMessage);
      await refreshAdminData();
    } catch (error) {
      setMessage(error.message || "Modification impossible.");
    }
  }

  async function changePassword(user) {
    const next = window.prompt(`Nouveau mot de passe pour ${user.display_name} — 12 caractères minimum :`);
    if (next === null) return;
    if (next.length < 12) {
      setMessage("Mot de passe trop court : 12 caractères minimum.");
      return;
    }
    await updateUser(user, { password: next }, "Mot de passe remplacé et anciennes sessions révoquées.");
  }

  return (
    <section className="cortijoView" aria-label="Gouvernance et accès Finca Maria">
      <div className="cortijoPanelTitle">
        <span>07</span>
        <div>
          <h3>Gouvernance & accès</h3>
          <p>Plusieurs administrateurs peuvent utiliser FINCA MARIA avec des comptes individuels. Les administrateurs disposent de l’accès complet au logiciel.</p>
        </div>
      </div>

      <div className="cortijoWorkflow">
        <div>
          <span className="cortijoEyebrow">Prochaine étape familiale</span>
          <h3>{cortijoGovernanceCurrent.status}</h3>
          <p><strong>{cortijoGovernanceCurrent.period}</strong> · {cortijoGovernanceCurrent.place}</p>
          <p>{cortijoGovernanceCurrent.purpose}</p>
          <p><strong>Personnes concernées :</strong> {cortijoGovernanceCurrent.participants}</p>
          <small>{cortijoGovernanceCurrent.evidence}</small>
        </div>
        <ol>
          <li><strong>Prudence</strong><span>{cortijoGovernanceCurrent.caution}</span></li>
        </ol>
      </div>

      <div className="cortijoColumns">
        {cortijoRoles.map((role) => (
          <article className="cortijoCard" key={role.id}>
            <div className="cortijoCardTop"><span className="cortijoPill">{role.access}</span></div>
            <h4>{role.label}</h4>
            <p>{role.purpose}</p>
            <ul>{role.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
          </article>
        ))}
      </div>

      <div className="cortijoWorkflow">
        <div>
          <span className="cortijoEyebrow">Comptes administrateurs</span>
          <h3>Accès complet, comptes individuels</h3>
          <p>Les fonctions peuvent être différentes, mais tout rôle administrateur accède à l’ensemble de FINCA MARIA. Les actions sensibles restent attribuées au compte qui les a réalisées.</p>
          <div className="cortijoList">
            {cortijoAdministrators.map((administrator) => (
              <article className="cortijoCard" key={administrator.id}>
                <h4>{administrator.displayName}</h4>
                <p>{administrator.responsibility}</p>
                <small>{administrator.accountStatus}</small>
              </article>
            ))}
          </div>
        </div>
        <ol>{cortijoAccessPrinciples.map((principle, index) => <li key={principle}><strong>Règle {index + 1}</strong><span>{principle}</span></li>)}</ol>
      </div>

      <div className="cortijoWorkflow">
        <div>
          <span className="cortijoEyebrow">Gestion des comptes</span>
          <h3>{SERVER_MODE ? "Comptes du serveur" : "Prêt pour le serveur"}</h3>
          {!SERVER_MODE ? (
            <p>La création et la désactivation des comptes apparaîtront ici dès que FINCA MARIA sera démarré avec la pile serveur.</p>
          ) : (
            <>
              <form onSubmit={createUser} className="cortijoCard" style={{ display: "grid", gap: ".55rem" }}>
                <label>Nom<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
                <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
                <label>Mot de passe initial<input type="password" minLength="12" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></label>
                <label>Rôle
                  <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                    {cortijoRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                  </select>
                </label>
                <button type="submit">Créer le compte</button>
              </form>
              {message && <p>{message}</p>}
            </>
          )}
        </div>

        <div className="cortijoList">
          {SERVER_MODE && (loadingUsers ? <p>Chargement des comptes…</p> : users.map((user) => (
            <article className="cortijoCard" key={user.id}>
              <div className="cortijoCardTop"><span className="cortijoPill">{user.active ? "Actif" : "Désactivé"}</span></div>
              <h4>{user.display_name}</h4>
              <p>{user.email}</p>
              <label>Rôle
                <select value={(user.roles || [])[0] || "heritier"} onChange={(event) => updateUser(user, { roles: [event.target.value] }, "Rôle mis à jour.")}>
                  {cortijoRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
              </label>
              <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap", marginTop: ".55rem" }}>
                <button type="button" onClick={() => updateUser(user, { active: !user.active }, user.active ? "Compte désactivé." : "Compte réactivé.")}>{user.active ? "Désactiver" : "Réactiver"}</button>
                <button type="button" onClick={() => changePassword(user)}>Changer le mot de passe</button>
              </div>
            </article>
          )))}
        </div>
      </div>

      {SERVER_MODE && (
        <div className="cortijoWorkflow">
          <div>
            <span className="cortijoEyebrow">Journal d’audit</span>
            <h3>Dernières opérations enregistrées</h3>
            <p>Connexions, créations et modifications de comptes, réservations et données synchronisées sont attribuées au compte qui les réalise.</p>
            <button type="button" onClick={loadAudit}>Actualiser le journal</button>
          </div>
          <ol>
            {auditEvents.length ? auditEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.actor_email || "Système"} · {event.action}</strong>
                <span>{event.object_type}{event.object_id ? ` · ${event.object_id}` : ""} · {formatDateTime(event.created_at)}</span>
              </li>
            )) : <li><strong>Aucun événement</strong><span>Le journal se remplira avec l’utilisation du serveur.</span></li>}
          </ol>
        </div>
      )}
    </section>
  );
}
