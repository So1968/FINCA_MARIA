import { useEffect, useMemo, useRef, useState } from "react";
import { CortijoHousePortal } from "./CortijoHousePortal";
import { resolveHouseHash } from "../lib/houseNavigation.mjs";

const PRESENCES_KEY = "finca_maria_maison_presences_v1";
const READY_KEY = "finca_maria_chambres_preparation_v1";
const NAME_KEY = "finca_maria_reservation_prenom_v1";
const ROOM_PLAN_KEY = "finca_maria_couchages_plan_v1";

const ROOMS = [
  { name: "La Hera", level: "Étage", location: "À gauche en haut de l’escalier" },
  { name: "La Golondrina", level: "Étage", location: "À droite en haut de l’escalier" },
  { name: "La Matrimoniala", level: "Étage", location: "Près des toilettes" },
  { name: "La Cueva", level: "Rez-de-chaussée", location: "Côté terrasse, près de la lingerie" },
  { name: "Las Alemanitas / Alemanitos", level: "À confirmer", location: "Emplacement exact à confirmer sur place" }
];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function loadJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(key) {
  const [year, month] = String(key).split("-").map(Number);
  return { year, month };
}

function shiftMonth(key, delta) {
  const { year, month } = parseMonth(key);
  const date = new Date(year, month - 1 + delta, 1, 12, 0, 0);
  return monthKey(date);
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(value, amount) {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day + amount, 12, 0, 0);
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  return `${day}/${month}/${year}`;
}

function bookingCovers(booking, date) {
  return Boolean(booking?.arrival && booking?.departure && booking.arrival <= date && booking.departure > date);
}

function overlaps(start, departure, booking) {
  return start < booking.departure && departure > booking.arrival;
}

function normalizeRoomPlan(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { rooms: {}, updatedAt: null };
  return {
    ...value,
    rooms: value.rooms && typeof value.rooms === "object" ? value.rooms : {}
  };
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function FincaHouseExperience() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "vacanciers") return <CortijoHousePortal />;

  const [bookings, setBookings] = useState(() => loadJson(PRESENCES_KEY, []));
  const [ready, setReady] = useState(() => loadJson(READY_KEY, {}));
  const [roomPlan, setRoomPlan] = useState(() => normalizeRoomPlan(loadJson(ROOM_PLAN_KEY, {})));
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "");
  const [month, setMonth] = useState(monthKey);
  const [selection, setSelection] = useState({ room: "", start: "", end: "" });
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [message, setMessage] = useState("");
  const [mobileRoom, setMobileRoom] = useState(ROOMS[0].name);
  const [showAll, setShowAll] = useState(() => Boolean(resolveHouseHash(window.location.hash).details));
  const [openSection, setOpenSection] = useState(() => resolveHouseHash(window.location.hash).journey);
  function toggleSection(id) {
    const next = openSection === id ? null : id;
    setOpenSection(next);
    if (next) requestAnimationFrame(() => document.getElementById(next)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const [legacyVersion, setLegacyVersion] = useState(0);
  const nameRef = useRef(null);

  useEffect(() => {
    function openHashDestination() {
      const target = resolveHouseHash(window.location.hash);
      if (target.journey) setOpenSection(target.journey);
      if (target.details) {
        setShowAll(true);
        // Le panneau historique est monté après l’ouverture : attendre son rendu.
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          const panel = document.getElementById(target.details);
          if (panel instanceof HTMLDetailsElement) panel.open = true;
          panel?.scrollIntoView({ block: "start" });
        }));
      }
      if (target.journey) {
        window.requestAnimationFrame(() => document.getElementById(target.journey)?.scrollIntoView({ block: "start" }));
      }
    }
    openHashDestination();
    window.addEventListener("hashchange", openHashDestination);
    return () => window.removeEventListener("hashchange", openHashDestination);
  }, []);

  useEffect(() => {
    localStorage.setItem(PRESENCES_KEY, JSON.stringify(bookings));
  }, [bookings]);
  useEffect(() => {
    localStorage.setItem(READY_KEY, JSON.stringify(ready));
  }, [ready]);
  useEffect(() => {
    localStorage.setItem(ROOM_PLAN_KEY, JSON.stringify(roomPlan));
  }, [roomPlan]);
  useEffect(() => {
    localStorage.setItem(NAME_KEY, name);
  }, [name]);

  const { year, month: monthNumber } = parseMonth(month);
  const days = useMemo(
    () => Array.from({ length: new Date(year, monthNumber, 0).getDate() }, (_, index) => index + 1),
    [year, monthNumber]
  );
  const monthTitle = `${MONTHS[monthNumber - 1]} ${year}`;
  const selectedBooking = bookings.find((item) => item.id === selectedBookingId);
  const readyCount = ROOMS.filter((room) => ready[room.name]).length;

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

  function selectDay(room, date) {
    const occupied = bookingsFor(room, date);
    if (occupied.length) {
      setSelectedBookingId(occupied[0].id);
      setSelection({ room: "", start: "", end: "" });
      setMessage("");
      return;
    }

    setSelectedBookingId("");
    if (!name.trim()) {
      setMessage("Écris d’abord ton prénom, puis choisis les jours.");
      nameRef.current?.focus();
      return;
    }

    if (selection.room !== room || !selection.start || selection.end) {
      setSelection({ room, start: date, end: "" });
      setMessage("Premier jour choisi. Clique maintenant sur le dernier jour où tu dors dans cette chambre.");
      return;
    }

    setSelection((current) => ({ ...current, end: date }));
    setMessage("La période est choisie. Vérifie puis confirme la réservation.");
  }

  function normalizedSelection() {
    if (!selection.start) return null;
    const end = selection.end || selection.start;
    const first = selection.start <= end ? selection.start : end;
    const last = selection.start <= end ? end : selection.start;
    return { first, last, departure: addDays(last, 1) };
  }

  function confirmBooking() {
    const range = normalizedSelection();
    if (!range || !selection.room || !name.trim()) return;
    const conflict = bookings.find(
      (booking) => booking.place === selection.room && overlaps(range.first, range.departure, booking)
    );
    if (conflict) {
      setMessage(`Impossible : ${selection.room} est déjà réservée par ${conflict.name} sur une partie de cette période.`);
      return;
    }

    const booking = {
      id: `presence-${Date.now()}`,
      name: name.trim(),
      arrival: range.first,
      departure: range.departure,
      place: selection.room,
      note: "Réservation chambre"
    };
    setBookings((current) => [...current, booking]);
    setSelection({ room: "", start: "", end: "" });
    setMessage(`${booking.name} · ${booking.place} · ${formatDate(booking.arrival)} → ${formatDate(booking.departure)} : réservé.`);
    setLegacyVersion((value) => value + 1);
  }

  function removeSelectedBooking() {
    if (!selectedBooking) return;
    if (!window.confirm(`Retirer la réservation de ${selectedBooking.name} dans ${selectedBooking.place} ?`)) return;
    setBookings((current) => current.filter((item) => item.id !== selectedBooking.id));
    setSelectedBookingId("");
    setMessage("Réservation retirée.");
    setLegacyVersion((value) => value + 1);
  }

  function toggleReady(room) {
    setReady((current) => ({ ...current, [room]: !current[room] }));
  }

  function resetPreparation() {
    if (!window.confirm("Commencer la préparation d’un nouveau séjour ? Les informations sur les chambres sont conservées ; seuls les états « prête » sont remis à zéro.")) return;
    const next = {};
    ROOMS.forEach((room) => { next[room.name] = false; });
    setReady(next);
  }

  function updateRoom(room, patch) {
    setRoomPlan((current) => ({
      ...current,
      rooms: {
        ...(current.rooms || {}),
        [room]: { ...(current.rooms?.[room] || {}), ...patch }
      },
      updatedAt: new Date().toISOString()
    }));
  }

  function occupantsForMonth(room) {
    const start = isoDate(year, monthNumber, 1);
    const end = monthNumber === 12 ? isoDate(year + 1, 1, 1) : isoDate(year, monthNumber + 1, 1);
    return Array.from(new Set(
      bookings.filter((item) => item.place === room && item.arrival < end && item.departure > start).map((item) => item.name)
    ));
  }

  function revealLegacy(id) {
    setShowAll(true);
    // « Ouvrir le jardin / les consignes » doit aussi déplier la fiche ciblée.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const panel = document.getElementById(id);
      if (panel instanceof HTMLDetailsElement) panel.open = true;
      panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }

  function dayCell(room, day, mobile = false) {
    const date = isoDate(year, monthNumber, day);
    const occupied = bookingsFor(room, date);
    const selected = inSelection(room, date);
    const weekday = new Date(year, monthNumber - 1, day, 12).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const className = [
      mobile ? "fincaStayMobileDay" : "fincaStayCell",
      occupied.length ? "isBooked" : "",
      selected ? "isSelected" : "",
      isWeekend ? "isWeekend" : ""
    ].filter(Boolean).join(" ");

    return (
      <button
        type="button"
        key={`${room}-${date}-${mobile ? "m" : "d"}`}
        className={className}
        onClick={() => selectDay(room, date)}
        title={occupied.length ? `${occupied.map((item) => item.name).join(", ")} — ${room}` : `Libre — ${room} — ${formatDate(date)}`}
      >
        {mobile && <b>{day}</b>}
        <span>{occupied.length ? occupied.map((item) => item.name).join(" / ") : mobile ? "Libre" : day}</span>
      </button>
    );
  }

  const range = normalizedSelection();
  const mobileOffset = (new Date(year, monthNumber - 1, 1, 12).getDay() + 6) % 7;

  return (
    <div className={`fincaHouseExperience ${showAll ? "showAll" : ""}`}>
      <style>{`
        .fincaHouseExperience{max-width:1180px;margin:0 auto;padding:clamp(.7rem,2vw,1.25rem);color:#eadab7}.fincaWelcomeHero{position:relative;overflow:hidden;border:1px solid rgba(214,169,85,.28);border-radius:28px;padding:clamp(1.3rem,4vw,2.6rem);background:radial-gradient(circle at 85% 15%,rgba(214,169,85,.18),transparent 34%),linear-gradient(145deg,rgba(20,31,23,.98),rgba(5,9,7,.98));box-shadow:0 24px 60px rgba(0,0,0,.22)}.fincaWelcomeHero small{display:block;color:#c4aa72;letter-spacing:.15em;font-size:.72rem}.fincaWelcomeHero h1{max-width:760px;margin:.35rem 0 .5rem;color:#fff3d4;font:700 clamp(2rem,6vw,4.4rem)/.98 Georgia,'Times New Roman',serif}.fincaWelcomeHero p{max-width:760px;margin:0;color:#d7c39b;font-size:clamp(.95rem,2vw,1.08rem);line-height:1.55}.fincaJourney{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin:1rem 0}.fincaJourney button{min-height:96px;text-align:left;border:1px solid rgba(214,169,85,.2);border-radius:18px;padding:.9rem;background:rgba(5,10,7,.74);color:#f5e6c2;cursor:pointer;font:inherit}.fincaJourney button b{display:block;color:#efd99d;font-size:1rem}.fincaJourney button span{display:block;margin-top:.25rem;color:#cdb98d;font-size:.8rem;line-height:1.35}.fincaStaySection{scroll-margin-top:12px;margin:1rem 0;border:1px solid rgba(214,169,85,.22);border-radius:22px;padding:clamp(.8rem,2vw,1.1rem);background:rgba(5,9,7,.55)}.fincaStaySectionHead{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.75rem}.fincaStaySectionHead h2{margin:0;color:#fff3d4;font:700 clamp(1.25rem,3vw,1.7rem)/1.15 Georgia,'Times New Roman',serif}.fincaStaySectionHead p{margin:.25rem 0 0;color:#cdb98d;font-size:.86rem;line-height:1.4}.fincaStaySectionHead button,.fincaStayButton,.fincaMonthBar button,.fincaReadyButton{min-height:42px;border:1px solid rgba(214,169,85,.3);border-radius:999px;padding:.48rem .72rem;background:rgba(214,169,85,.08);color:#efd99d;cursor:pointer;font:inherit;font-weight:700}.fincaArrivalIdentity{display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:.65rem;align-items:end;margin:.65rem 0}.fincaArrivalIdentity label span{display:block;margin-bottom:.28rem;color:#d7c39b;font-size:.78rem;font-weight:800}.fincaArrivalIdentity input{width:100%;min-height:46px;border:1px solid rgba(214,169,85,.24);border-radius:12px;padding:.58rem .7rem;background:rgba(0,0,0,.2);color:#fff3d4;font:inherit}.fincaMonthBar{display:flex;align-items:center;justify-content:center;gap:.75rem;margin:.65rem 0}.fincaMonthBar strong{min-width:180px;text-align:center;color:#fff3d4;font:700 1.08rem Georgia,'Times New Roman',serif}.fincaBookingDesktop{overflow-x:auto;border:1px solid rgba(214,169,85,.18);border-radius:16px;background:rgba(0,0,0,.12)}.fincaBookingGrid{display:grid;grid-template-columns:minmax(165px,190px) repeat(var(--days),minmax(45px,1fr));min-width:max-content}.fincaStayHead,.fincaStayRoom,.fincaStayCell{min-height:48px;border-right:1px solid rgba(214,169,85,.1);border-bottom:1px solid rgba(214,169,85,.1)}.fincaStayHead{display:grid;place-items:center;background:rgba(214,169,85,.09);color:#e6d5ad;font-weight:800}.fincaStayRoom{position:sticky;left:0;z-index:3;display:flex;align-items:center;padding:.4rem .55rem;background:#0c120e;color:#fff3d4;font-size:.78rem;font-weight:800}.fincaStayRoom.isReady{background:#982f2f;color:#fff}.fincaStayCell{display:grid;place-items:center;border-top:0;border-left:0;background:transparent;color:#cdb98d;cursor:pointer;font:inherit;font-size:.7rem}.fincaStayCell.isWeekend{background:rgba(255,255,255,.035)}.fincaStayCell.isBooked{background:#637665;color:#fff;font-weight:900}.fincaStayCell.isSelected{background:#d7b45e;color:#172019;outline:2px solid #fff0bd;outline-offset:-3px;font-weight:900}.fincaBookingMobile{display:none}.fincaBookingActions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:.75rem 0 0}.fincaBookingActions .isPrimary{background:#efd99d;color:#182019}.fincaBookingMessage{margin:.5rem 0 0;color:#e8d4a5;font-size:.86rem}.fincaBookingSelected{margin-top:.65rem;border:1px solid rgba(214,169,85,.2);border-radius:14px;padding:.7rem;background:rgba(214,169,85,.06)}.fincaBookingSelected strong{color:#fff3d4}.fincaRoomPlanNote{margin:.1rem 0 .8rem;color:#bfae88;font-size:.8rem}.fincaRoomGroups{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.fincaRoomLevel{border:1px solid rgba(214,169,85,.16);border-radius:18px;padding:.7rem;background:rgba(0,0,0,.11)}.fincaRoomLevel h3{margin:.1rem 0 .55rem;color:#efd99d;font-size:.9rem;text-transform:uppercase;letter-spacing:.08em}.fincaRoomCards{display:grid;gap:.55rem}.fincaRoomCard{border:1px solid rgba(214,169,85,.18);border-radius:15px;padding:.7rem;background:#0b120e}.fincaRoomCard.isReady{border-color:#cc7777;background:#822a2a;color:#fff}.fincaRoomCardTop{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem}.fincaRoomCard h4{margin:0;color:#fff3d4}.fincaRoomCard small{display:block;margin-top:.2rem;color:#bfae88}.fincaRoomCard.isReady small{color:#f0d4d4}.fincaRoomCard.isReady .fincaReadyButton{border-color:rgba(255,255,255,.45);color:#fff;background:rgba(255,255,255,.1)}.fincaRoomMeta{display:grid;grid-template-columns:110px 1fr;gap:.45rem;margin-top:.65rem}.fincaRoomMeta label{color:#d7c39b;font-size:.74rem}.fincaRoomMeta input,.fincaRoomMeta textarea{width:100%;margin-top:.18rem;border:1px solid rgba(214,169,85,.18);border-radius:9px;padding:.45rem .5rem;background:rgba(0,0,0,.18);color:inherit;font:inherit}.fincaRoomMeta textarea{min-height:64px;resize:vertical}.fincaOccupants{margin-top:.55rem;color:#e7d2a5;font-size:.78rem}.fincaLifeGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.fincaLifeCard{border:1px solid rgba(214,169,85,.18);border-radius:16px;padding:.8rem;background:rgba(0,0,0,.12)}.fincaLifeCard h3{margin:.05rem 0 .3rem;color:#fff3d4;font-size:1rem}.fincaLifeCard p{margin:.15rem 0 .55rem;color:#cdb98d;font-size:.82rem;line-height:1.4}.fincaDepartureList{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem;margin:.65rem 0}.fincaDepartureList span{border:1px solid rgba(214,169,85,.14);border-radius:12px;padding:.6rem;background:rgba(0,0,0,.1);font-size:.82rem}.fincaLegacyToggle{display:flex;justify-content:center;margin:1rem 0}.fincaLegacyHouse{display:none}.showAll .fincaLegacyHouse{display:block}.fincaLegacyHouse .cortijoExportHero,.fincaLegacyHouse .fincaHouseJump,.fincaLegacyHouse .fincaHouseSummary,.fincaLegacyHouse .fincaSaveHint,#finca-booking-section-host{display:none!important}.fincaLegacyHouse .cortijoView{scroll-margin-top:12px}.fincaLegacyHouse #presences{display:none}.fincaLegacyHouse .cortijoExportApp{padding-top:0!important}
        @media(max-width:760px){.fincaHouseExperience{padding:.55rem}.fincaJourney{grid-template-columns:1fr 1fr}.fincaArrivalIdentity{grid-template-columns:1fr}.fincaBookingDesktop{display:none}.fincaBookingMobile{display:block}.fincaMobileRoomSelect{display:grid;gap:.3rem;margin:.5rem 0}.fincaMobileRoomSelect select{min-height:46px;border:1px solid rgba(214,169,85,.22);border-radius:12px;padding:.5rem;background:#101811;color:#fff3d4;font:inherit}.fincaMobileWeekHead,.fincaMobileCalendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.fincaMobileWeekHead span{text-align:center;color:#bfae88;font-size:.66rem}.fincaStayMobileDay{min-height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.12rem;border:1px solid rgba(214,169,85,.12);border-radius:9px;background:rgba(0,0,0,.13);color:#d7c39b;font:inherit;font-size:.62rem;cursor:pointer}.fincaStayMobileDay b{font-size:.78rem;color:#fff3d4}.fincaStayMobileDay.isBooked{background:#637665;color:#fff}.fincaStayMobileDay.isSelected{background:#d7b45e;color:#182019;outline:2px solid #fff0bd}.fincaStayMobileBlank{min-height:62px}.fincaRoomGroups{grid-template-columns:1fr}.fincaRoomMeta{grid-template-columns:1fr}.fincaLifeGrid,.fincaDepartureList{grid-template-columns:1fr}.fincaStaySectionHead{align-items:stretch;flex-direction:column}.fincaStaySectionHead button{width:100%}}
      `}</style>

      <header className="fincaWelcomeHero">
        <small>FINCA MARIA — MAISON FAMILIALE</small>
        <h1>Bienvenue à la Finca Maria</h1>
        <p>On arrive à la maison, on choisit où dormir, on prépare ce qu’il faut, on profite du séjour et on laisse la maison prête pour les suivants.</p>
      </header>

      <nav className="fincaJourney" aria-label="Parcours du séjour">
        <button type="button" onClick={() => toggleSection("arrivee-reservation")} aria-expanded={openSection === "arrivee-reservation"}><b>1 · J’arrive</b><span>Prénom, dates et chambre</span></button>
        <button type="button" onClick={() => toggleSection("preparer-chambres")} aria-expanded={openSection === "preparer-chambres"}><b>2 · Je prépare</b><span>Chambres, lits et linge</span></button>
        <button type="button" onClick={() => toggleSection("vivre-maison")} aria-expanded={openSection === "vivre-maison"}><b>3 · Je suis à la maison</b><span>Maison, jardin et sorties</span></button>
        <button type="button" onClick={() => toggleSection("depart-maison")} aria-expanded={openSection === "depart-maison"}><b>4 · Je repars</b><span>Ménage, fermeture et transmission</span></button>
      </nav>

      <section id="arrivee-reservation" className="fincaStaySection" style={{display:openSection === "arrivee-reservation" ? undefined : "none"}}>
        <div className="fincaStaySectionHead">
          <div><h2>Je choisis ma chambre</h2><p>Comme une réservation d’hôtel : les jours occupés affichent le prénom de la personne. Le rouge n’est jamais utilisé pour une réservation ; il signifie uniquement « chambre prête » dans le plan de préparation.</p></div>
        <button type="button" className="fincaStayButton" onClick={() => setOpenSection(null)}>✕ Fermer</button></div>
        <div className="fincaArrivalIdentity">
          <label><span>Qui vient ?</span><input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} placeholder="Prénom" autoComplete="name" /></label>
          <button type="button" className="fincaStayButton" onClick={() => setSelection({ room: "", start: "", end: "" })}>Effacer ma sélection</button>
        </div>
        <div className="fincaMonthBar">
          <button type="button" onClick={() => setMonth((value) => shiftMonth(value, -1))}>←</button>
          <strong>{monthTitle}</strong>
          <button type="button" onClick={() => setMonth((value) => shiftMonth(value, 1))}>→</button>
        </div>

        <div className="fincaBookingDesktop" aria-label={`Toutes les chambres — ${monthTitle}`}>
          <div className="fincaBookingGrid" style={{ "--days": days.length }}>
            <div className="fincaStayHead">Toutes les chambres</div>
            {days.map((day) => <div className="fincaStayHead" key={`head-${day}`}>{day}</div>)}
            {ROOMS.map((room) => (
              <div style={{ display: "contents" }} key={room.name}>
                <div className={`fincaStayRoom ${ready[room.name] ? "isReady" : ""}`}>{room.name}</div>
                {days.map((day) => dayCell(room.name, day))}
              </div>
            ))}
          </div>
        </div>

        <div className="fincaBookingMobile">
          <label className="fincaMobileRoomSelect">Chambre
            <select value={mobileRoom} onChange={(event) => { setMobileRoom(event.target.value); setSelection({ room: "", start: "", end: "" }); }}>
              {ROOMS.map((room) => <option key={room.name} value={room.name}>{room.name}</option>)}
            </select>
          </label>
          <div className="fincaMobileWeekHead">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="fincaMobileCalendar">
            {Array.from({ length: mobileOffset }, (_, index) => <span className="fincaStayMobileBlank" key={`blank-${index}`} />)}
            {days.map((day) => dayCell(mobileRoom, day, true))}
          </div>
        </div>

        <div className="fincaBookingActions">
          {range && selection.room && <span>{name || "Prénom"} · {selection.room} · {formatDate(range.first)} → {formatDate(range.departure)}</span>}
          <button type="button" className="fincaStayButton isPrimary" disabled={!range || !selection.room || !name.trim()} onClick={confirmBooking}>Confirmer la réservation</button>
        </div>
        {message && <p className="fincaBookingMessage">{message}</p>}
        {selectedBooking && (
          <div className="fincaBookingSelected"><strong>{selectedBooking.name} — {selectedBooking.place}</strong><p>{formatDate(selectedBooking.arrival)} → {formatDate(selectedBooking.departure)}</p><button type="button" className="fincaStayButton" onClick={removeSelectedBooking}>Retirer cette réservation</button></div>
        )}
      </section>

      <section id="preparer-chambres" className="fincaStaySection" style={{display:openSection === "preparer-chambres" ? undefined : "none"}}>
        <div className="fincaStaySectionHead">
          <div><h2>Je prépare les chambres</h2><p>{readyCount}/{ROOMS.length} chambres marquées prêtes. Une chambre ne devient rouge que lorsque quelqu’un la marque explicitement « prête ».</p></div>
          <button type="button" className="fincaStayButton" onClick={() => setOpenSection(null)}>✕ Fermer</button>
          <button type="button" onClick={resetPreparation}>Préparer un nouveau séjour</button>
        </div>
        <p className="fincaRoomPlanNote">Plan schématique — disposition issue du règlement ancien et des repères familiaux ; les éléments non confirmés restent indiqués comme tels.</p>
        <div className="fincaRoomGroups">
          {["Étage", "Rez-de-chaussée", "À confirmer"].map((level) => {
            const levelRooms = ROOMS.filter((room) => room.level === level);
            if (!levelRooms.length) return null;
            return (
              <div className="fincaRoomLevel" key={level}>
                <h3>{level}</h3>
                <div className="fincaRoomCards">
                  {levelRooms.map((room) => {
                    const meta = roomPlan.rooms?.[room.name] || {};
                    const occupants = occupantsForMonth(room.name);
                    return (
                      <article className={`fincaRoomCard ${ready[room.name] ? "isReady" : ""}`} key={room.name}>
                        <div className="fincaRoomCardTop">
                          <div><h4>{room.name}</h4><small>{room.location}</small></div>
                          <button type="button" className="fincaReadyButton" onClick={() => toggleReady(room.name)}>{ready[room.name] ? "Prête ✓" : "Marquer prête"}</button>
                        </div>
                        <div className="fincaOccupants">{occupants.length ? `Ce mois-ci : ${occupants.join(", ")}` : "Aucune réservation ce mois-ci"}</div>
                        <div className="fincaRoomMeta">
                          <label>Couchages<input type="number" min="0" value={meta.beds ?? ""} onChange={(event) => updateRoom(room.name, { beds: event.target.value === "" ? "" : Number(event.target.value) })} placeholder="Nombre" /></label>
                          <label>Types de lits<input value={meta.bedTypes || ""} onChange={(event) => updateRoom(room.name, { bedTypes: event.target.value })} placeholder="Ex. 1 lit double, 1 lit simple" /></label>
                          <label style={{ gridColumn: "1 / -1" }}>Note<textarea value={meta.note || ""} onChange={(event) => updateRoom(room.name, { note: event.target.value })} placeholder="Linge, particularité, rangement, photo à ajouter…" /></label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="vivre-maison" className="fincaStaySection" style={{display:openSection === "vivre-maison" ? undefined : "none"}}>
        <div className="fincaStaySectionHead"><div><h2>Je suis à la maison</h2><p>Les choses utiles pendant le séjour, sans passer par une arborescence administrative.</p></div><button type="button" className="fincaStayButton" onClick={() => setOpenSection(null)}>✕ Fermer</button></div>
        <div className="fincaLifeGrid">
          <article className="fincaLifeCard"><h3>La maison</h3><p>Eau, électricité, clés, ménage, inventaire et petites réparations.</p><button type="button" className="fincaStayButton" onClick={() => revealLegacy("fonctionnement")}>Ouvrir la maison pratique</button></article>
          <article className="fincaLifeCard"><h3>Le jardin</h3><p>Laurier, cerisier, citronnier et suivi des interventions dans le patio.</p><button type="button" className="fincaStayButton" onClick={() => revealLegacy("patio-jardin")}>Ouvrir le jardin</button></article>
          <article className="fincaLifeCard"><h3>Je profite</h3><p>Les endroits à conseiller, les balades et le guide vacanciers.</p><button type="button" className="fincaStayButton" onClick={() => revealLegacy("sorties")}>Voir les sorties</button></article>
        </div>
      </section>

      <section id="depart-maison" className="fincaStaySection" style={{display:openSection === "depart-maison" ? undefined : "none"}}>
        <div className="fincaStaySectionHead"><div><h2>Je prépare le départ</h2><p>Un dernier passage simple avant de fermer la maison.</p></div><button type="button" className="fincaStayButton" onClick={() => setOpenSection(null)}>✕ Fermer</button></div>
        <div className="fincaDepartureList"><span>Linge utilisé</span><span>Ménage des espaces occupés</span><span>Déchets sortis</span><span>Eau, fenêtres et accès</span><span>Clés rangées</span><span>Incident ou réparation signalé</span></div>
        <button type="button" className="fincaStayButton" onClick={() => revealLegacy("menage")}>Ouvrir les consignes détaillées</button>
      </section>

      <div className="fincaLegacyToggle"><button type="button" className="fincaStayButton" onClick={() => setShowAll((value) => !value)}>{showAll ? "Masquer les détails" : "Tout voir — inventaire, fonctionnement, historique et outils"}</button></div>

      <div className="fincaLegacyHouse">
        <CortijoHousePortal key={legacyVersion} />
      </div>
    </div>
  );
}
