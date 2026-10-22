import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PRESENCES_KEY = "finca_maria_maison_presences_v1";
const READY_KEY = "finca_maria_chambres_preparation_v1";
const NAME_KEY = "finca_maria_reservation_prenom_v1";
const TRASH_KEY = "finca_maria_reservations_corbeille_locale_v1";

const ROOMS = [
  "La Hera",
  "La Golondrina",
  "La Matrimoniala",
  "Las Alemanitas / Alemanitos",
  "La Cueva"
];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function safeGetItem(key, fallback = "") {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeBookings(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => (
    item &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    ROOMS.includes(item.place) &&
    isIsoDate(item.arrival) &&
    isIsoDate(item.departure) &&
    item.arrival < item.departure
  )).map((item) => ({
    ...item,
    note: typeof item.note === "string" ? item.note : ""
  }));
}

function normalizeReady(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(ROOMS.map((room) => [room, Boolean(value[room])]));
}

function loadJson(key, fallback, normalize = (value) => value) {
  try {
    const value = JSON.parse(safeGetItem(key, "null"));
    return value == null ? fallback : normalize(value);
  } catch {
    return fallback;
  }
}

function navigateToView(view, hash = "") {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("view", view);
  url.hash = hash ? `#${hash}` : "";
  window.location.assign(url.toString());
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(key) {
  const [year, month] = String(key).split("-").map(Number);
  return { year, month };
}

function toDateString(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(value, amount) {
  if (!isIsoDate(value)) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day + amount, 12, 0, 0);
  return toDateString(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatDate(value) {
  if (!isIsoDate(value)) return "";
  const [year, month, day] = String(value).split("-");
  return `${day}/${month}/${year}`;
}

function bookingCovers(booking, day) {
  return Boolean(booking?.arrival && booking?.departure && booking.arrival <= day && booking.departure > day);
}

function overlaps(aStart, aDeparture, bStart, bDeparture) {
  return aStart < bDeparture && aDeparture > bStart;
}

function monthLabel(key) {
  const { year, month } = parseMonth(key);
  return `${MONTHS[month - 1]} ${year}`;
}

function shiftMonth(key, delta) {
  const { year, month } = parseMonth(key);
  const date = new Date(year, month - 1 + delta, 1, 12, 0, 0);
  return monthKey(date);
}

function findHosts() {
  const result = {};

  const dashboard = document.querySelector(".fincaTwoWorlds");
  if (dashboard) {
    const houseHeading = Array.from(dashboard.querySelectorAll(".fincaAreaHeader h2")).find((node) => node.textContent?.trim() === "MAISON");
    const houseArea = houseHeading?.closest("div[style]");
    if (houseArea) {
      let host = document.getElementById("finca-house-welcome-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "finca-house-welcome-host";
        const subnav = houseArea.querySelector(".fincaSubNav");
        houseArea.insertBefore(host, subnav || houseArea.children[1] || null);
      }
      result.dashboard = host;

      const nav = houseArea.querySelector(".fincaSubNav");
      if (nav && !nav.dataset.fincaWelcomingLabels) {
        const buttons = Array.from(nav.querySelectorAll("button"));
        const labels = new Map(buttons.map((button) => [button.textContent?.trim(), button]));
        const rename = (from, to) => {
          const button = labels.get(from);
          const span = button?.querySelector("span");
          if (span) span.textContent = to;
        };
        rename("Gérer", "J’arrive");
        rename("Présences", "Chambres");
        rename("Inventaire", "La maison");
        rename("Sorties", "Profiter");
        const todo = labels.get("À faire");
        if (todo) {
          todo.style.display = "none";
          todo.setAttribute("aria-hidden", "true");
          todo.tabIndex = -1;
        }
        nav.dataset.fincaWelcomingLabels = "1";

        try {
          const saved = JSON.parse(safeGetItem("finca_maria_navigation_v2", "{}"));
          if (saved?.houseTab === "afaire") {
            safeSetItem("finca_maria_navigation_v2", JSON.stringify({ ...saved, houseTab: "gerer" }));
            const first = buttons.find((button) => ["Gérer", "J’arrive"].includes(button.textContent?.trim()));
            first?.click();
          }
        } catch {
          // Rien à migrer.
        }
      }
    }
  }

  const params = new URLSearchParams(window.location.search);
  const detailed = params.get("view") === "cortijo-maison" && params.get("mode") !== "vacanciers";
  if (detailed) {
    const main = document.querySelector(".cortijoExportApp");
    const jump = main?.querySelector(".fincaHouseJump");
    if (main && jump) {
      let navHost = document.getElementById("finca-booking-nav-host");
      if (!navHost) {
        navHost = document.createElement("span");
        navHost.id = "finca-booking-nav-host";
        navHost.style.display = "contents";
        jump.prepend(navHost);
      }
      let sectionHost = document.getElementById("finca-booking-section-host");
      if (!sectionHost) {
        sectionHost = document.createElement("div");
        sectionHost.id = "finca-booking-section-host";
        jump.insertAdjacentElement("afterend", sectionHost);
      }
      result.nav = navHost;
      result.section = sectionHost;
    }
  }

  return result;
}

function DashboardWelcome() {
  return (
    <div className="fincaArrivalWelcome">
      <div>
        <small>BIENVENUE À LA MAISON</small>
        <strong>J’arrive à la Finca Maria</strong>
        <span>Je choisis ma chambre, je réserve mes jours et je prépare la maison sans passer par des rubriques administratives.</span>
      </div>
      <button type="button" onClick={() => navigateToView("cortijo-maison", "reservations")}>Choisir ma chambre</button>
      <style>{`
        .fincaArrivalWelcome{display:grid;grid-template-columns:1fr auto;align-items:center;gap:1rem;margin:0 0 1rem;padding:1rem 1.1rem;border:1px solid rgba(214,169,85,.3);border-radius:20px;background:linear-gradient(135deg,rgba(214,169,85,.1),rgba(36,55,41,.16))}.fincaArrivalWelcome small{display:block;color:#bca87b;font-size:.7rem;letter-spacing:.12em}.fincaArrivalWelcome strong{display:block;margin-top:.18rem;color:#fff3d4;font-family:Georgia,'Times New Roman',serif;font-size:1.25rem}.fincaArrivalWelcome span{display:block;margin-top:.25rem;color:#d7c39b;line-height:1.45}.fincaArrivalWelcome button{min-height:46px;border:1px solid rgba(239,217,157,.4);border-radius:999px;padding:.6rem .9rem;background:#efd99d;color:#182019;font:inherit;font-weight:800;cursor:pointer}@media(max-width:720px){.fincaArrivalWelcome{grid-template-columns:1fr}.fincaArrivalWelcome button{width:100%}}
      `}</style>
    </div>
  );
}

function BookingCalendar() {
  const [bookings, setBookings] = useState(() => loadJson(PRESENCES_KEY, [], normalizeBookings));
  const [ready, setReady] = useState(() => loadJson(READY_KEY, {}, normalizeReady));
  const [trash, setTrash] = useState(() => loadJson(TRASH_KEY, [], normalizeBookings));
  const [name, setName] = useState(() => safeGetItem(NAME_KEY, ""));
  const [note, setNote] = useState("");
  const [month, setMonth] = useState(monthKey);
  const [selection, setSelection] = useState({ room: "", start: "", end: "" });
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [message, setMessage] = useState("");
  const nameRef = useRef(null);

  useEffect(() => { safeSetItem(PRESENCES_KEY, JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { safeSetItem(READY_KEY, JSON.stringify(ready)); }, [ready]);
  useEffect(() => { safeSetItem(TRASH_KEY, JSON.stringify(trash)); }, [trash]);
  useEffect(() => { safeSetItem(NAME_KEY, name); }, [name]);

  const { year, month: monthNumber } = parseMonth(month);
  const days = useMemo(() => Array.from({ length: new Date(year, monthNumber, 0).getDate() }, (_, index) => index + 1), [year, monthNumber]);
  const selectedBooking = bookings.find((item) => item.id === selectedBookingId);

  function bookingsFor(room, date) {
    return bookings.filter((item) => item.place === room && bookingCovers(item, date));
  }

  function inSelection(room, date) {
    if (selection.room !== room || !selection.start) return false;
    const end = selection.end || selection.start;
    const first = selection.start <= end ? selection.start : end;
    const last = selection.start <= end ? end : selection.start;
    return date >= first && date <= last;
  }

  function clickDay(room, date) {
    if (!ROOMS.includes(room) || !isIsoDate(date)) return;
    const occupied = bookingsFor(room, date);
    if (occupied.length) {
      setSelectedBookingId(occupied[0].id);
      setSelection({ room: "", start: "", end: "" });
      setMessage("");
      return;
    }

    setSelectedBookingId("");
    if (!name.trim()) {
      setMessage("Écris d’abord ton prénom, puis clique sur les jours.");
      nameRef.current?.focus();
      return;
    }

    if (selection.room !== room || !selection.start || selection.end) {
      setSelection({ room, start: date, end: "" });
      setMessage("Premier jour choisi. Clique maintenant sur le dernier jour occupé.");
      return;
    }

    setSelection({ ...selection, end: date });
    setMessage("La période est sélectionnée. Tu peux confirmer la réservation.");
  }

  function confirmBooking() {
    if (!name.trim() || !ROOMS.includes(selection.room) || !isIsoDate(selection.start)) return;
    const endInclusive = isIsoDate(selection.end) ? selection.end : selection.start;
    const first = selection.start <= endInclusive ? selection.start : endInclusive;
    const last = selection.start <= endInclusive ? endInclusive : selection.start;
    const departure = addDays(last, 1);
    if (!isIsoDate(departure) || first >= departure) {
      setMessage("Les dates de réservation sont invalides.");
      return;
    }
    const conflict = bookings.find((item) => item.place === selection.room && overlaps(first, departure, item.arrival, item.departure));
    if (conflict) {
      setMessage(`Impossible : ${selection.room} est déjà réservée par ${conflict.name} sur cette période.`);
      return;
    }

    const booking = {
      id: `presence-${Date.now()}`,
      name: name.trim(),
      arrival: first,
      departure,
      place: selection.room,
      note: note.trim()
    };
    setBookings((current) => [...current, booking]);
    setSelection({ room: "", start: "", end: "" });
    setNote("");
    setMessage(`${booking.name} · ${booking.place} · ${formatDate(first)} → ${formatDate(departure)} : réservé.`);
  }

  function removeSelectedBooking() {
    if (!selectedBooking) return;
    if (!window.confirm(`Mettre la réservation de ${selectedBooking.name} à la corbeille ?`)) return;
    setTrash((current) => [{ ...selectedBooking, deletedAt: new Date().toISOString() }, ...current.filter((item) => item.id !== selectedBooking.id)]);
    setBookings((current) => current.filter((item) => item.id !== selectedBooking.id));
    setSelectedBookingId("");
    setMessage("Réservation déplacée dans la corbeille. Elle peut être restaurée.");
  }

  function restoreBooking(item) {
    const conflict = bookings.some((booking) => booking.place === item.place && overlaps(item.arrival, item.departure, booking.arrival, booking.departure));
    if (conflict) {
      setMessage("Restauration impossible : cette chambre est déjà réservée sur cette période.");
      return;
    }
    setBookings((current) => [...current, { ...item, deletedAt: undefined }]);
    setTrash((current) => current.filter((entry) => entry.id !== item.id));
    setMessage("Réservation restaurée.");
  }

  function toggleReady(room) {
    setReady((current) => ({ ...current, [room]: !current[room] }));
  }

  function cellClass(room, date) {
    const occupied = bookingsFor(room, date);
    const selected = inSelection(room, date);
    return ["fincaHotelCell", occupied.length ? "isBooked" : "", selected ? "isSelected" : ""].filter(Boolean).join(" ");
  }

  return (
    <details id="reservations" className="cortijoView fincaHotelBooking" open>
      <summary className="cortijoPanelTitle"><span>01</span><div><h3>Je choisis ma chambre</h3><p>Comme à l’hôtel : un prénom, une chambre et les jours où l’on dort ici.</p></div><small className="cortijoSummaryBadge">Calendrier mensuel</small></summary>
      <style>{`
        .fincaHotelIntro{display:grid;grid-template-columns:minmax(180px,1fr) minmax(220px,1fr) auto;gap:.65rem;align-items:end;margin:.75rem 0}.fincaHotelIntro label span{display:block;margin-bottom:.28rem;font-weight:800;color:#f0dca9}.fincaHotelIntro input{width:100%;min-height:46px;border:1px solid rgba(214,169,85,.25);border-radius:12px;padding:.6rem .75rem;background:rgba(0,0,0,.18);color:#fff3d4;font:inherit}.fincaMonthBar{display:flex;align-items:center;justify-content:center;gap:.7rem;margin:.75rem 0}.fincaMonthBar strong{min-width:170px;text-align:center;color:#fff3d4;font-family:Georgia,'Times New Roman',serif;font-size:1.08rem}.fincaMonthBar button,.fincaBookingActions button,.fincaRoomReady{min-height:40px;border:1px solid rgba(214,169,85,.28);border-radius:999px;padding:.45rem .7rem;background:rgba(214,169,85,.08);color:#efd99d;cursor:pointer}.fincaHotelScroll{overflow-x:auto;border:1px solid rgba(214,169,85,.2);border-radius:16px;background:rgba(2,6,4,.35)}.fincaHotelGrid{display:grid;grid-template-columns:minmax(170px,190px) repeat(var(--days),minmax(52px,1fr));min-width:max-content}.fincaHotelHead,.fincaHotelRoom,.fincaHotelDay,.fincaHotelCell{min-height:48px;border-right:1px solid rgba(214,169,85,.12);border-bottom:1px solid rgba(214,169,85,.12)}.fincaHotelHead,.fincaHotelDay{display:grid;place-items:center;background:rgba(214,169,85,.08);color:#e4d1a7;font-weight:800}.fincaHotelRoom{position:sticky;left:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:.4rem;padding:.45rem .55rem;background:#0c120e;color:#fff3d4;font-weight:800}.fincaHotelRoom.isReady{background:#9e2f2f;color:#fff}.fincaHotelRoom .fincaRoomReady{min-height:32px;padding:.28rem .45rem;font-size:.72rem;white-space:nowrap}.fincaHotelRoom.isReady .fincaRoomReady{border-color:rgba(255,255,255,.45);color:#fff;background:rgba(255,255,255,.1)}.fincaHotelCell{display:grid;place-items:center;width:100%;padding:.2rem;border-top:0;border-left:0;background:transparent;color:#d8c6a0;cursor:pointer;font:inherit;font-size:.72rem;line-height:1.05}.fincaHotelCell:hover{background:rgba(239,217,157,.1)}.fincaHotelCell.isBooked{background:#d2ae55;color:#182019;font-weight:900}.fincaHotelCell.isSelected{outline:2px solid #fff0bf;outline-offset:-3px;background:#8068d8;color:#fff}.fincaHotelWeekend{background:rgba(255,255,255,.04)}.fincaBookingActions{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.fincaBookingActions .isPrimary{background:#efd99d;color:#182019;font-weight:900}.fincaBookingMessage{margin:.45rem 0;color:#f2d99b}.fincaSelectedBooking{margin:.65rem 0;padding:.75rem .85rem;border:1px solid rgba(214,169,85,.24);border-radius:14px;background:rgba(214,169,85,.06)}.fincaSelectedBooking strong{color:#fff3d4}.fincaSelectedBooking button{margin-top:.5rem;min-height:38px;border:1px solid rgba(220,90,90,.5);border-radius:999px;padding:.4rem .65rem;background:rgba(160,40,40,.16);color:#ffb0a9;cursor:pointer}.fincaHotelHint{margin:.55rem 0 0;color:#bfae88;font-size:.82rem}@media(max-width:720px){.fincaHotelIntro{grid-template-columns:1fr}.fincaHotelGrid{grid-template-columns:150px repeat(var(--days),48px)}.fincaHotelRoom{font-size:.78rem;flex-direction:column;align-items:flex-start}}
      `}</style>

      <div className="fincaHotelIntro">
        <label><span>Qui réserve ?</span><input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ton prénom" /></label>
        <label><span>Note (facultative)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. arrivée tardive, lit bébé…" /></label>
        <button type="button" className="fincaRoomReady" onClick={() => setMonth(monthKey())}>Revenir à ce mois-ci</button>
      </div>

      <div className="fincaMonthBar">
        <button type="button" aria-label="Mois précédent" onClick={() => setMonth((current) => shiftMonth(current, -1))}>←</button>
        <strong>{monthLabel(month)}</strong>
        <button type="button" aria-label="Mois suivant" onClick={() => setMonth((current) => shiftMonth(current, 1))}>→</button>
      </div>

      <div className="fincaHotelScroll">
        <div className="fincaHotelGrid" style={{ "--days": days.length }}>
          <div className="fincaHotelHead">Chambre</div>
          {days.map((day) => {
            const date = new Date(year, monthNumber - 1, day, 12, 0, 0);
            return <div className={`fincaHotelDay ${date.getDay() === 0 || date.getDay() === 6 ? "fincaHotelWeekend" : ""}`} key={`head-${day}`}><span>{day}</span><small>{["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][date.getDay()]}</small></div>;
          })}
          {ROOMS.flatMap((room) => {
            const row = [
              <div className={`fincaHotelRoom ${ready[room] ? "isReady" : ""}`} key={`${room}-name`}><span>{room}</span><button type="button" className="fincaRoomReady" aria-label={`${ready[room] ? "Marquer à préparer" : "Marquer prête"} : ${room}`} onClick={() => toggleReady(room)}>{ready[room] ? "Prête ✓" : "Marquer prête"}</button></div>
            ];
            days.forEach((day) => {
              const date = toDateString(year, monthNumber, day);
              const occupied = bookingsFor(room, date);
              const label = occupied.length
                ? `${room}, ${formatDate(date)}, réservée par ${occupied[0].name}`
                : `${room}, ${formatDate(date)}, libre`;
              row.push(<button type="button" className={cellClass(room, date)} aria-label={label} title={occupied.length ? occupied.map((item) => `${item.name} · ${formatDate(item.arrival)} → ${formatDate(item.departure)}`).join("\n") : `${room} · ${formatDate(date)}`} onClick={() => clickDay(room, date)} key={`${room}-${date}`}>{occupied.length ? occupied[0].name : inSelection(room, date) ? name.trim() : ""}</button>);
            });
            return row;
          })}
        </div>
      </div>

      <p className="fincaHotelHint">Pour réserver : écris ton prénom, clique sur le premier jour puis sur le dernier jour où tu dors dans la chambre. Les cases déjà occupées affichent directement le prénom.</p>

      {selection.start && <div className="fincaBookingActions"><span>{name.trim()} · {selection.room} · {formatDate(selection.start)}{selection.end ? ` → ${formatDate(selection.end)}` : ""}</span><button type="button" className="isPrimary" onClick={confirmBooking}>Confirmer la réservation</button><button type="button" onClick={() => setSelection({ room: "", start: "", end: "" })}>Annuler la sélection</button></div>}
      {message && <p className="fincaBookingMessage">{message}</p>}

      {trash.length > 0 && <details className="fincaSelectedBooking">
        <summary>🗑️ Corbeille ({trash.length})</summary>
        {trash.map((item) => <div key={item.id} className="fincaBookingActions">
          <span>{item.name} — {item.place} · {formatDate(item.arrival)} → {formatDate(item.departure)}</span>
          <button type="button" onClick={() => restoreBooking(item)}>↩ Restaurer</button>
        </div>)}
      </details>}
      {selectedBooking && <div className="fincaSelectedBooking"><strong>{selectedBooking.name} — {selectedBooking.place}</strong><p>{formatDate(selectedBooking.arrival)} → {formatDate(selectedBooking.departure)}</p>{selectedBooking.note && <p>{selectedBooking.note}</p>}<button type="button" onClick={removeSelectedBooking} title="Mettre à la corbeille" aria-label={`Mettre à la corbeille la réservation de ${selectedBooking.name}`} style={{fontSize:"1.15rem", minWidth:"40px"}}>🗑️</button></div>}
    </details>
  );
}

function BookingNavButton() {
  return <button type="button" onClick={() => document.getElementById("reservations")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Chambres</button>;
}

export function FincaHouseBookingCalendarMount() {
  const [hosts, setHosts] = useState({});

  useEffect(() => {
    let attempts = 0;
    const resolve = () => {
      attempts += 1;
      const found = findHosts();
      setHosts((current) => {
        const same = current.dashboard === found.dashboard && current.nav === found.nav && current.section === found.section;
        return same ? current : found;
      });
      if ((found.dashboard || found.section) || attempts >= 40) window.clearInterval(timer);
    };
    const timer = window.setInterval(resolve, 100);
    resolve();
    return () => window.clearInterval(timer);
  }, []);

  if (!hosts.dashboard && !hosts.section && !hosts.nav) return null;
  return <>{hosts.dashboard && createPortal(<DashboardWelcome />, hosts.dashboard)}{hosts.nav && createPortal(<BookingNavButton />, hosts.nav)}{hosts.section && createPortal(<BookingCalendar />, hosts.section)}</>;
}
