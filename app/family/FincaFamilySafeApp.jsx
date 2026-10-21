import React, { useEffect, useMemo, useState } from "react";

const ALLOWED_ROLES = new Set(["heritier", "admin-projet", "admin-secretariat"]);

const FAMILY_SECTIONS = [
  {
    id: "maison",
    label: "Maison",
    keys: [
      ["finca_maria_maison_notes_v1", "Notes de la maison"],
      ["finca_maria_entretien_maison_v1", "Entretien"],
      ["finca_maria_couchages_plan_v1", "Couchages"],
      ["finca_maria_inventaire_maison_v1", "Inventaire"],
    ],
  },
  {
    id: "sejour",
    label: "Séjour",
    keys: [
      ["finca_maria_sejour_checklist_v1", "Checklist du séjour"],
    ],
  },
  {
    id: "jardin",
    label: "Jardin",
    keys: [
      ["finca_maria_jardin_suivi_v1", "Suivi du jardin"],
    ],
  },
  {
    id: "sorties",
    label: "Sorties",
    keys: [
      ["finca_maria_lieux_vacanciers_v1", "Lieux et bonnes adresses"],
    ],
  },
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isEmpty(value) {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function humanizeKey(key) {
  return String(key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ReadOnlyValue({ value, depth = 0 }) {
  if (isEmpty(value)) return <p className="familyEmpty">Aucune information partagée pour le moment.</p>;
  if (typeof value === "boolean") return <span className={value ? "familyPill isOk" : "familyPill"}>{value ? "Oui" : "Non"}</span>;
  if (typeof value === "number") return <span className="familyValue">{new Intl.NumberFormat("fr-FR").format(value)}</span>;
  if (typeof value === "string") return <p className="familyText">{value}</p>;

  if (Array.isArray(value)) {
    return (
      <div className="familyList">
        {value.map((item, index) => (
          <div className="familyListItem" key={item?.id || item?.name || index}>
            <ReadOnlyValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(asObject(value)).filter(([, item]) => !isEmpty(item));
  if (!entries.length) return <p className="familyEmpty">Aucune information partagée pour le moment.</p>;

  if (depth >= 3) {
    return (
      <div className="familyKeyValues">
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt>{humanizeKey(key)}</dt>
            <dd>{typeof item === "object" ? "Information disponible" : String(item)}</dd>
          </div>
        ))}
      </div>
    );
  }

  return (
    <dl className="familyKeyValues">
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{humanizeKey(key)}</dt>
          <dd><ReadOnlyValue value={item} depth={depth + 1} /></dd>
        </div>
      ))}
    </dl>
  );
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(body?.error || `Erreur serveur ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function LoadingScreen({ title = "FINCA MARIA", message, action }) {
  return (
    <main className="familyLoading">
      <section className="familyLoadingCard">
        <span className="familyEyebrow">Espace héritiers</span>
        <h1>{title}</h1>
        <p>{message}</p>
        {action}
      </section>
    </main>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="familySummaryCard">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function Reservations({ reservations }) {
  if (!reservations.length) {
    return <p className="familyEmpty familyPanelEmpty">Aucun séjour enregistré.</p>;
  }

  return (
    <div className="familyReservationList">
      {reservations.map((booking) => (
        <article className="familyReservation" key={booking.id || `${booking.name}-${booking.arrival}-${booking.place}`}>
          <div>
            <span className="familyEyebrow">Séjour</span>
            <h3>{booking.name || "Famille"}</h3>
            <p>{booking.place || "Chambre à confirmer"}</p>
          </div>
          <div className="familyDates">
            <strong>{formatDate(booking.arrival)}</strong>
            <span>→</span>
            <strong>{formatDate(booking.departure)}</strong>
          </div>
          {booking.note && <p className="familyReservationNote">{booking.note}</p>}
        </article>
      ))}
    </div>
  );
}

function Rooms({ roomReady }) {
  const rooms = Object.entries(roomReady);
  if (!rooms.length) return <p className="familyEmpty familyPanelEmpty">Aucun état de chambre enregistré.</p>;

  return (
    <div className="familyRoomGrid">
      {rooms.map(([room, ready]) => (
        <article className={ready ? "familyRoom isReady" : "familyRoom"} key={room}>
          <span className="familyRoomIcon" aria-hidden="true">{ready ? "✓" : "○"}</span>
          <div>
            <strong>{room}</strong>
            <small>{ready ? "Chambre prête" : "À préparer"}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function SharedPanel({ title, value }) {
  return (
    <article className="familySharedPanel">
      <header>
        <span className="familyEyebrow">Information partagée</span>
        <h3>{title}</h3>
      </header>
      <ReadOnlyValue value={value} />
    </article>
  );
}

function SharedSection({ section, sharedState }) {
  return (
    <div className="familySharedGrid">
      {section.keys.map(([key, title]) => (
        <SharedPanel key={key} title={title} value={sharedState[key]?.value} />
      ))}
    </div>
  );
}

export default function FincaFamilySafeApp() {
  const [snapshot, setSnapshot] = useState(null);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("accueil");
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  async function refresh({ quiet = false } = {}) {
    try {
      const [session, bootstrap] = await Promise.all([
        requestJson("/family-api/me"),
        requestJson("/family-api/bootstrap"),
      ]);

      const roles = Array.isArray(session?.user?.roles) ? session.user.roles : [];
      if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
        const denied = new Error("Ce compte n’est pas autorisé dans l’espace héritiers.");
        denied.status = 403;
        throw denied;
      }

      setUser(session.user || null);
      setSnapshot({
        reservations: Array.isArray(bootstrap?.reservations) ? bootstrap.reservations : [],
        roomReady: asObject(bootstrap?.roomReady),
        sharedState: asObject(bootstrap?.sharedState),
      });
      setLastRefresh(new Date());
      setError("");
    } catch (caught) {
      if (caught?.status === 401) {
        window.location.assign("/login.html?next=/family/");
        return;
      }
      setError(caught?.message || "Impossible de charger les données familiales.");
      if (!quiet) setSnapshot(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const safeRefresh = async (options) => {
      if (cancelled) return;
      await refresh(options);
    };

    safeRefresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        safeRefresh({ quiet: true });
      }
    }, 15000);
    const onFocus = () => safeRefresh({ quiet: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") safeRefresh({ quiet: true });
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function logout() {
    try {
      await requestJson("/family-api/logout", { method: "POST", body: "{}" });
    } catch {
      // La session peut déjà être expirée.
    }
    window.location.assign("/login.html?next=/family/");
  }

  const summary = useMemo(() => {
    const reservations = snapshot?.reservations || [];
    const rooms = Object.entries(snapshot?.roomReady || {});
    return {
      stays: reservations.length,
      ready: rooms.filter(([, value]) => Boolean(value)).length,
      rooms: rooms.length,
      shared: Object.values(snapshot?.sharedState || {}).filter((entry) => !isEmpty(entry?.value)).length,
    };
  }, [snapshot]);

  if (!snapshot && !error) {
    return <LoadingScreen message="Chargement des données du serveur familial…" />;
  }

  if (!snapshot && error) {
    return (
      <LoadingScreen
        title="Accès momentanément indisponible"
        message={error}
        action={<button className="familyPrimaryButton" type="button" onClick={() => refresh()}>Réessayer</button>}
      />
    );
  }

  const section = FAMILY_SECTIONS.find((item) => item.id === active);

  return (
    <div className="familyApp">
      <header className="familyTopbar">
        <div className="familyBrand">
          <span className="familyBrandMark" aria-hidden="true">FM</span>
          <div>
            <span className="familyEyebrow">FINCA MARIA</span>
            <strong>Espace héritiers</strong>
          </div>
        </div>
        <div className="familyAccount">
          <div>
            <strong>{user?.name || user?.email || "Famille"}</strong>
            <small>Consultation uniquement</small>
          </div>
          <button type="button" onClick={logout}>Se déconnecter</button>
        </div>
      </header>

      <div className="familyLayout">
        <nav className="familyNav" aria-label="Navigation de l’espace héritiers">
          <button type="button" className={active === "accueil" ? "isActive" : ""} onClick={() => setActive("accueil")}>Accueil</button>
          <button type="button" className={active === "reservations" ? "isActive" : ""} onClick={() => setActive("reservations")}>Séjours</button>
          <button type="button" className={active === "chambres" ? "isActive" : ""} onClick={() => setActive("chambres")}>Chambres</button>
          {FAMILY_SECTIONS.map((item) => (
            <button type="button" key={item.id} className={active === item.id ? "isActive" : ""} onClick={() => setActive(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <main className="familyContent">
          {error && (
            <div className="familyNotice" role="status">
              <span>{error}</span>
              <button type="button" onClick={() => refresh({ quiet: true })}>Actualiser</button>
            </div>
          )}

          {active === "accueil" && (
            <>
              <section className="familyHero">
                <span className="familyEyebrow">Même serveur · données réelles · lecture seule</span>
                <h1>La Finca en famille, sans l’administratif privé.</h1>
                <p>Retrouvez les séjours, les chambres et les informations de maison qui ont été choisies pour le partage familial.</p>
              </section>
              <section className="familySummary" aria-label="Résumé">
                <SummaryCard label="Séjours" value={summary.stays} detail="enregistrés sur le serveur" />
                <SummaryCard label="Chambres prêtes" value={summary.ready} detail={summary.rooms ? `sur ${summary.rooms}` : "aucune chambre suivie"} />
                <SummaryCard label="Rubriques partagées" value={summary.shared} detail="maison et séjour uniquement" />
              </section>
              <section className="familyHomeGrid">
                <button type="button" onClick={() => setActive("reservations")}>
                  <span>01</span><strong>Voir les séjours</strong><small>Arrivées, départs et chambres</small>
                </button>
                <button type="button" onClick={() => setActive("chambres")}>
                  <span>02</span><strong>Voir les chambres</strong><small>Prêtes ou à préparer</small>
                </button>
                <button type="button" onClick={() => setActive("maison")}>
                  <span>03</span><strong>Consulter la maison</strong><small>Notes, entretien, couchages et inventaire</small>
                </button>
              </section>
            </>
          )}

          {active === "reservations" && (
            <section className="familyPage">
              <header><span className="familyEyebrow">Planning familial</span><h1>Séjours</h1><p>Informations enregistrées sur le serveur, sans possibilité de modification ici.</p></header>
              <Reservations reservations={snapshot.reservations} />
            </section>
          )}

          {active === "chambres" && (
            <section className="familyPage">
              <header><span className="familyEyebrow">Préparation</span><h1>Chambres</h1><p>État actuel partagé par la famille.</p></header>
              <Rooms roomReady={snapshot.roomReady} />
            </section>
          )}

          {section && (
            <section className="familyPage">
              <header><span className="familyEyebrow">Informations familiales</span><h1>{section.label}</h1><p>Seules les données explicitement autorisées pour l’espace héritiers sont affichées.</p></header>
              <SharedSection section={section} sharedState={snapshot.sharedState} />
            </section>
          )}

          <footer className="familyFooter">
            <span>Lecture seule · aucune donnée n’est enregistrée dans ce navigateur.</span>
            <span>{lastRefresh ? `Dernière actualisation : ${lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
