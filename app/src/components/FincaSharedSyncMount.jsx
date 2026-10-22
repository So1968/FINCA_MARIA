import { useEffect, useMemo, useRef, useState } from "react";

const API_URL_KEY = "azoth_finca_api_url_v1";
const SESSION_KEY = "azoth_finca_family_session_v1";
const SYNC_INIT_KEY = "azoth_finca_sync_initialized_v1";
const SYNC_NOTICE_KEY = "azoth_finca_sync_notice_v1";
const SYNC_BASE_KEY = "azoth_finca_sync_base_v1";
const PRESENCES_KEY = "finca_maria_maison_presences_v1";
const READY_KEY = "finca_maria_chambres_preparation_v1";
const NAME_KEY = "finca_maria_reservation_prenom_v1";
const SERVER_MODE = import.meta.env.VITE_FINCA_SERVER_MODE === "1";

const SHARED_KEYS = [
  "finca_maria_maison_notes_v1",
  "finca_maria_jardin_suivi_v1",
  "finca_maria_lieux_vacanciers_v1",
  "finca_maria_sejour_checklist_v1",
  "finca_maria_entretien_maison_v1",
  "finca_maria_couchages_plan_v1",
  "finca_maria_inventaire_maison_v1",
  "cortijo_action_logs_v1",
  "cortijo_action_facts_v1",
  "cortijo_followups_v1",
  "cortijo_action_assignments_v1",
  "cortijo_action_contacts_v1",
  "cortijo_team_v1",
  "cortijo_custom_missions_v1",
  "finca_maria_questions_v44_20260913",
  "finca_maria_anomalies_v44_20260913",
  "finca_maria_family_checks_v42_20260818",
  "cortijo_terrain_mission_2026_08",
  "cortijo_terrain_olive_markers_v2_30"
];

function storageGet(storage, key) { try { return storage.getItem(key); } catch { return null; } }
function storageSet(storage, key, value) { try { storage.setItem(key, value); return true; } catch (error) { console.error(`FINCA MARIA : impossible d’enregistrer ${key}`, error); return false; } }
function storageRemove(storage, key) { try { storage.removeItem(key); return true; } catch { return false; } }
function asArray(value) { return Array.isArray(value) ? value : []; }
function asRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(storageGet(localStorage, key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameValue(a, b) {
  return stable(a) === stable(b);
}

function bookingEquivalent(a, b) {
  return a?.name === b?.name && a?.place === b?.place && a?.arrival === b?.arrival && a?.departure === b?.departure;
}

function localSnapshot() {
  const shared = {};
  for (const key of SHARED_KEYS) {
    if (storageGet(localStorage, key) !== null) shared[key] = loadJson(key, null);
  }
  return {
    reservations: asArray(loadJson(PRESENCES_KEY, [])),
    roomReady: asRecord(loadJson(READY_KEY, {})),
    shared
  };
}

function apiUrl() {
  if (SERVER_MODE) return "";
  return String(import.meta.env.VITE_FINCA_API_URL || storageGet(localStorage, API_URL_KEY) || "").trim().replace(/\/+$/, "");
}

function loadLegacySession() {
  if (SERVER_MODE) return null;
  const session = loadJson(SESSION_KEY, null);
  if (!session?.token || !session?.expiresAt || Date.now() >= session.expiresAt) return null;
  return session;
}

function storeLegacySession(session) {
  if (SERVER_MODE) {
    storageRemove(localStorage, SESSION_KEY);
    return;
  }
  if (session) storageSet(localStorage, SESSION_KEY, JSON.stringify(session));
  else storageRemove(localStorage, SESSION_KEY);
}

function shouldShow() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "cortijo-maison"
    || (params.get("project") === "cortijo" && params.get("drop") === "1")
    || Boolean(document.querySelector(".fincaTwoWorlds"));
}

export function FincaSharedSyncMount() {
  const url = useMemo(apiUrl, []);
  const [session, setSession] = useState(loadLegacySession);
  const [panelOpen, setPanelOpen] = useState(false);
  const [name, setName] = useState(() => storageGet(localStorage, NAME_KEY) || "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(SERVER_MODE ? "Connexion serveur…" : (url ? (session ? "Connexion…" : "À connecter") : "Mode local"));
  const [message, setMessage] = useState(() => storageGet(sessionStorage, SYNC_NOTICE_KEY) || "");
  const [visible, setVisible] = useState(shouldShow);
  const syncingRef = useRef(false);
  const previousRef = useRef(null);
  if (!previousRef.current) {
    const saved = loadJson(SYNC_BASE_KEY, null);
    previousRef.current = saved && typeof saved === "object"
      ? {
          reservations: asArray(saved.reservations),
          roomReady: asRecord(saved.roomReady),
          shared: asRecord(saved.shared),
          sharedVersions: asRecord(saved.sharedVersions)
        }
      : { ...localSnapshot(), sharedVersions: {} };
  }

  useEffect(() => {
    if (SERVER_MODE) storageRemove(localStorage, SESSION_KEY);
    if (message) storageRemove(sessionStorage, SYNC_NOTICE_KEY);
  }, []);

  useEffect(() => {
    const refreshVisibility = () => setVisible(shouldShow());
    window.addEventListener("finca:navigation", refreshVisibility);
    window.addEventListener("popstate", refreshVisibility);
    refreshVisibility();
    return () => {
      window.removeEventListener("finca:navigation", refreshVisibility);
      window.removeEventListener("popstate", refreshVisibility);
    };
  }, []);

  async function request(path, options = {}, activeSession = session) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (!SERVER_MODE && activeSession?.token) headers.Authorization = `Bearer ${activeSession.token}`;
    const response = await fetch(`${url}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      credentials: SERVER_MODE ? "same-origin" : options.credentials
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (response.status === 401) {
      storeLegacySession(null);
      setSession(null);
      setStatus("À reconnecter");
    }
    if (!response.ok) {
      const error = new Error(body.error || `Erreur ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  async function loadServerSession() {
    if (!SERVER_MODE) return;
    try {
      const result = await request("/api/auth/me", {}, null);
      const nextSession = {
        name: result.user?.name || "Administrateur",
        email: result.user?.email || "",
        roles: result.user?.roles || [],
        expiresAt: result.expiresAt
      };
      setSession(nextSession);
      setStatus(`Connecté · ${nextSession.name}`);
      await syncNow(nextSession);
    } catch (error) {
      setSession(null);
      setStatus(error.status === 401 ? "Session expirée" : "Serveur indisponible");
    }
  }

  useEffect(() => {
    loadServerSession();
  }, []);

  async function login(event) {
    event?.preventDefault();
    if (SERVER_MODE || !url || !name.trim() || !code) return;
    setStatus("Connexion…");
    try {
      const result = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), code })
      }, null);
      const nextSession = { token: result.token, name: result.name, expiresAt: result.expiresAt };
      storeLegacySession(nextSession);
      storageSet(localStorage, NAME_KEY, result.name);
      setSession(nextSession);
      setCode("");
      setPanelOpen(false);
      setStatus("Synchronisation…");
      await syncNow(nextSession);
    } catch (error) {
      setStatus("Connexion refusée");
      setMessage(error.message);
    }
  }

  async function migrateLegacyLocal(activeSession, bootstrap) {
    const local = localSnapshot();
    let changed = false;

    for (const booking of local.reservations) {
      const alreadyThere = bootstrap.reservations.some((remote) => remote.id === booking.id || bookingEquivalent(remote, booking));
      if (alreadyThere) continue;
      try {
        await request("/api/reservations", { method: "POST", body: JSON.stringify(booking) }, activeSession);
        changed = true;
      } catch (error) {
        if (error.status !== 409) throw error;
      }
    }

    for (const [room, ready] of Object.entries(local.roomReady || {})) {
      if (Object.prototype.hasOwnProperty.call(bootstrap.roomReady || {}, room)) continue;
      await request(`/api/room-ready/${encodeURIComponent(room)}`, {
        method: "PUT",
        body: JSON.stringify({ ready: Boolean(ready) })
      }, activeSession);
      changed = true;
    }

    for (const [key, value] of Object.entries(local.shared)) {
      if (bootstrap.sharedState?.[key]) continue;
      await request(`/api/state/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: JSON.stringify({ value, expectedVersion: 0 })
      }, activeSession);
      changed = true;
    }

    storageSet(localStorage, SYNC_INIT_KEY, "1");
    return changed;
  }

  async function pushLocalChanges(activeSession, previous, current, bootstrap) {
    const previousById = new Map((previous.reservations || []).map((item) => [item.id, item]));
    const currentById = new Map((current.reservations || []).map((item) => [item.id, item]));

    for (const booking of current.reservations || []) {
      const before = previousById.get(booking.id);
      if (!before || !sameValue(before, booking)) {
        await request("/api/reservations", { method: "POST", body: JSON.stringify(booking) }, activeSession);
      }
    }

    for (const booking of previous.reservations || []) {
      if (!currentById.has(booking.id)) {
        await request(`/api/reservations/${encodeURIComponent(booking.id)}`, { method: "DELETE" }, activeSession);
      }
    }

    const rooms = new Set([...Object.keys(previous.roomReady || {}), ...Object.keys(current.roomReady || {})]);
    for (const room of rooms) {
      const before = Boolean(previous.roomReady?.[room]);
      const now = Boolean(current.roomReady?.[room]);
      if (before !== now) {
        await request(`/api/room-ready/${encodeURIComponent(room)}`, {
          method: "PUT",
          body: JSON.stringify({ ready: now })
        }, activeSession);
      }
    }

    for (const key of SHARED_KEYS) {
      const before = previous.shared?.[key];
      const now = current.shared?.[key];
      // A newly shared key must first adopt existing server data, not overwrite it.
      if (before === undefined && bootstrap.sharedState?.[key]) continue;
      if ((!bootstrap.sharedState?.[key] || !sameValue(before, now)) && now !== undefined) {
        const remote = bootstrap.sharedState?.[key];
        const storedVersion = previous.sharedVersions?.[key];
        const expectedVersion = storedVersion !== undefined
          ? Number(storedVersion)
          : (remote && sameValue(before, remote.value) ? Number(remote.version) : 0);
        await request(`/api/state/${encodeURIComponent(key)}`, {
          method: "PUT",
          body: JSON.stringify({ value: now, expectedVersion })
        }, activeSession);
      }
    }
  }

  function applyRemote(bootstrap) {
    const current = localSnapshot();
    const remoteShared = {};
    for (const key of SHARED_KEYS) {
      if (bootstrap.sharedState?.[key]) remoteShared[key] = bootstrap.sharedState[key].value;
      else if (current.shared?.[key] !== undefined) remoteShared[key] = current.shared[key];
    }
    const remote = {
      reservations: asArray(bootstrap.reservations),
      roomReady: asRecord(bootstrap.roomReady),
      shared: remoteShared,
      sharedVersions: Object.fromEntries(
        SHARED_KEYS
          .filter((key) => bootstrap.sharedState?.[key])
          .map((key) => [key, Number(bootstrap.sharedState[key].version || 0)])
      )
    };

    let changed = false;
    if (!sameValue(current.reservations, remote.reservations)) {
      changed = storageSet(localStorage, PRESENCES_KEY, JSON.stringify(remote.reservations)) || changed;
    }
    if (!sameValue(current.roomReady, remote.roomReady)) {
      changed = storageSet(localStorage, READY_KEY, JSON.stringify(remote.roomReady)) || changed;
    }
    for (const [key, value] of Object.entries(remote.shared)) {
      if (!sameValue(current.shared?.[key], value)) {
        changed = storageSet(localStorage, key, JSON.stringify(value)) || changed;
      }
    }
    previousRef.current = remote;
    storageSet(localStorage, SYNC_BASE_KEY, JSON.stringify(remote));
    return changed;
  }

  async function syncNow(activeSession = session) {
    const authenticated = SERVER_MODE ? Boolean(activeSession) : Boolean(url && activeSession?.token);
    if (!authenticated || syncingRef.current) return;
    syncingRef.current = true;
    setStatus("Synchronisation…");
    try {
      let bootstrap = await request("/api/bootstrap", {}, activeSession);
      const initialized = storageGet(localStorage, SYNC_INIT_KEY) === "1";

      if (!initialized) {
        const uploaded = await migrateLegacyLocal(activeSession, bootstrap);
        if (uploaded) bootstrap = await request("/api/bootstrap", {}, activeSession);
      } else {
        const current = localSnapshot();
        try {
          await pushLocalChanges(activeSession, previousRef.current || current, current, bootstrap);
        } catch (error) {
          if (error.status === 409 && error.body?.conflict?.key) {
            storageSet(
              sessionStorage,
              SYNC_NOTICE_KEY,
              "Une autre personne a modifié ces données entre-temps. La version la plus récente du serveur a été conservée pour éviter d’écraser son travail."
            );
          } else if (error.status === 409) {
            const who = error.body?.conflict?.name;
            storageSet(
              sessionStorage,
              SYNC_NOTICE_KEY,
              `La réservation n’a pas été enregistrée : la chambre venait d’être réservée${who ? ` par ${who}` : ""}. Le calendrier a été remis à jour.`
            );
          } else {
            throw error;
          }
        }
        bootstrap = await request("/api/bootstrap", {}, activeSession);
      }

      const changed = applyRemote(bootstrap);
      setStatus(`Synchronisé · ${activeSession.name}`);
      setMessage((current) => current || "Les données de travail FINCA MARIA sont partagées entre les appareils connectés.");
      if (changed && document.visibilityState === "visible") {
        window.setTimeout(() => window.location.reload(), 120);
      }
    } catch (error) {
      setStatus(error.status === 401 ? "À reconnecter" : "Hors connexion");
      setMessage(error.message || "Synchronisation momentanément indisponible.");
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    if (!session) return undefined;
    if (!SERVER_MODE && !session.token) return undefined;
    const syncWhenActive = () => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      syncNow(session);
    };
    syncWhenActive();
    const timer = window.setInterval(syncWhenActive, 4000);
    window.addEventListener("focus", syncWhenActive);
    window.addEventListener("online", syncWhenActive);
    document.addEventListener("visibilitychange", syncWhenActive);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncWhenActive);
      window.removeEventListener("online", syncWhenActive);
      document.removeEventListener("visibilitychange", syncWhenActive);
    };
  }, [session?.name, session?.token]);

  async function logout() {
    if (SERVER_MODE) {
      try { await request("/api/auth/logout", { method: "POST", body: "{}" }, session); } catch {}
      window.location.assign("/login.html");
      return;
    }
    storeLegacySession(null);
    setSession(null);
    setStatus("À connecter");
    setPanelOpen(true);
  }

  if (!visible || (!SERVER_MODE && !url)) return null;

  return (
    <div className="fincaSharedSync" aria-live="polite">
      <style>{`
        .fincaSharedSync{position:relative;display:block;width:max-content;max-width:calc(100% - 24px);margin:16px 12px 24px auto;z-index:2;font-family:inherit}.fincaSharedSyncButton{min-height:30px;border:1px solid rgba(214,169,85,.35);border-radius:999px;padding:.3rem .65rem;background:rgba(9,14,10,.96);color:#efd99d;box-shadow:0 8px 28px rgba(0,0,0,.25);cursor:pointer;font:inherit;font-weight:800}.fincaSharedSyncPanel{margin-top:.45rem;border:1px solid rgba(214,169,85,.28);border-radius:16px;padding:.8rem;background:rgba(8,13,9,.98);color:#f7e9c7;box-shadow:0 12px 34px rgba(0,0,0,.35)}.fincaSharedSyncPanel h4{margin:.05rem 0 .45rem;color:#fff3d4}.fincaSharedSyncPanel p{margin:.35rem 0;color:#d7c39b;font-size:.86rem;line-height:1.4}.fincaSharedSyncPanel label{display:block;margin-top:.5rem;font-size:.78rem;color:#d7c39b}.fincaSharedSyncPanel input{width:100%;min-height:42px;margin-top:.2rem;border:1px solid rgba(214,169,85,.25);border-radius:10px;padding:.45rem .6rem;background:rgba(0,0,0,.22);color:#fff3d4;font:inherit}.fincaSharedSyncActions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.65rem}.fincaSharedSyncActions button{min-height:40px;border:1px solid rgba(214,169,85,.3);border-radius:999px;padding:.45rem .7rem;background:rgba(214,169,85,.08);color:#efd99d;cursor:pointer;font:inherit}.fincaSharedSyncActions .isPrimary{background:#efd99d;color:#182019;font-weight:800}@media(max-width:720px){.fincaSharedSync{margin:12px 8px 18px auto;max-width:calc(100% - 16px)}}
      `}</style>
      <button type="button" className="fincaSharedSyncButton" onClick={() => setPanelOpen((value) => !value)} title={status} aria-label={`État de synchronisation : ${status}. Ouvrir les détails`}>☁ Synchronisation</button>
      {(panelOpen || !session) && (
        <div className="fincaSharedSyncPanel">
          <h4>{session ? "FINCA MARIA partagée" : (SERVER_MODE ? "Session serveur" : "Relier cet appareil à la famille")}</h4>
          {message && <p>{message}</p>}
          {!session ? (
            SERVER_MODE ? (
              <div className="fincaSharedSyncActions"><button className="isPrimary" type="button" onClick={() => window.location.assign("/login.html")}>Se reconnecter</button></div>
            ) : (
              <form onSubmit={login}>
                <label>Prénom<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
                <label>Code familial<input type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" /></label>
                <div className="fincaSharedSyncActions"><button className="isPrimary" type="submit">Connecter cet appareil</button></div>
              </form>
            )
          ) : (
            <>
              <p>{SERVER_MODE ? `Compte : ${session.email || session.name}. ` : ""}Les réservations, la Maison et le suivi opérationnel sont synchronisés avec la base FINCA MARIA.</p>
              <div className="fincaSharedSyncActions">
                <button type="button" onClick={() => syncNow(session)}>Synchroniser maintenant</button>
                <button type="button" onClick={logout}>Déconnexion</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
