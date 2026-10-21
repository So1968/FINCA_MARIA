import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cortijoHouseStatus, getHousePriorityCounts } from "../data/cortijoHouseStatus.js";
import {
  HOUSE_INVENTORY_KEY,
  getHouseEssentialSummary,
  normalizeUserInventory
} from "../data/cortijoHouseInventory.js";

const ROOM_PLAN_KEY = "finca_maria_couchages_plan_v1";

function resolveHost() {
  if (new URLSearchParams(window.location.search).get("mode") === "vacanciers") return null;
  const house = document.querySelector(".fincaHouseExperience");
  if (!house) return null;

  let host = document.getElementById("finca-house-status-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "finca-house-status-host";
    const journey = house.querySelector(".fincaJourney");
    if (journey) house.insertBefore(host, journey);
    else house.prepend(host);
  }
  return host;
}

function parseRoomPlan(raw) {
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return { rooms: {} };
    return { ...value, rooms: value.rooms && typeof value.rooms === "object" ? value.rooms : {} };
  } catch {
    return { rooms: {} };
  }
}

function parseInventory(raw) {
  try {
    return normalizeUserInventory(JSON.parse(raw || "[]"));
  } catch {
    return [];
  }
}

function summarizeCapacity(roomPlan) {
  const rooms = cortijoHouseStatus.roomsExpected.map((name) => {
    const meta = roomPlan.rooms?.[name] || {};
    const numericBeds = Number(meta.beds);
    const beds = meta.beds !== "" && Number.isFinite(numericBeds) && numericBeds > 0 ? numericBeds : null;
    return { name, beds, bedTypes: String(meta.bedTypes || "").trim() };
  });
  const withBeds = rooms.filter((room) => room.beds !== null);
  const total = withBeds.reduce((sum, room) => sum + room.beds, 0);
  const withTypes = withBeds.filter((room) => room.bedTypes).length;
  return {
    rooms,
    total,
    withBeds: withBeds.length,
    withTypes,
    totalRooms: rooms.length
  };
}

function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isClosedWork(work) {
  const status = normalized(work?.status);
  return ["fait", "termine", "terminee", "clos", "resolu", "resolue"].some((word) => status.includes(word));
}

function hasPriority(work, code) {
  return String(work?.priority || "").split("/").map((item) => item.trim()).includes(code);
}

function deriveHouseDecision(essentials) {
  const works = cortijoHouseStatus.works || [];
  const activeWorks = works.filter((work) => !isClosedWork(work));
  const pendingP1Checks = essentials.checks.filter((item) => !item.matches.length && String(item.priority).includes("P1"));
  const pendingP2Checks = essentials.checks.filter((item) => !item.matches.length && String(item.priority).includes("P2"));
  const activeP0Works = activeWorks.filter((work) => hasPriority(work, "P0"));
  const activeP1Works = activeWorks.filter((work) => hasPriority(work, "P1"));
  const activeP2Works = activeWorks.filter((work) => hasPriority(work, "P2"));
  const explicitRentalBlockers = activeWorks.filter((work) => normalized(work.status).includes("bloquant location") || work.blocksRental === true);
  const explicitHabitabilityBlockers = activeWorks.filter((work) => work.blocksHabitability === true);

  let habitability;
  if (activeP0Works.length || explicitHabitabilityBlockers.length) {
    const count = new Set([...activeP0Works, ...explicitHabitabilityBlockers].map((item) => item.id)).size;
    habitability = {
      status: "Non validée — blocage documenté",
      detail: `${count} point${count > 1 ? "s" : ""} documenté${count > 1 ? "s" : ""} impose${count > 1 ? "nt" : ""} de ne pas valider l’habitabilité avant résolution.`
    };
  } else if (pendingP1Checks.length || activeP1Works.length) {
    habitability = {
      status: "À vérifier",
      detail: `${pendingP1Checks.length} contrôle${pendingP1Checks.length > 1 ? "s" : ""} P1 reste${pendingP1Checks.length > 1 ? "nt" : ""} à vérifier et ${activeP1Works.length} travail${activeP1Works.length > 1 ? "aux" : ""} P1 documenté${activeP1Works.length > 1 ? "s" : ""} reste${activeP1Works.length > 1 ? "nt" : ""} ouvert${activeP1Works.length > 1 ? "s" : ""}. Un P1 ouvert n’est pas automatiquement présenté comme un blocage d’habitabilité.`
    };
  } else {
    habitability = {
      status: "Pré-requis P1 renseignés",
      detail: "Les contrôles P1 sont renseignés dans l’inventaire et aucun blocage documenté n’est détecté. Une validation globale reste nécessaire avant d’afficher « habitable : oui »."
    };
  }

  let rental;
  if (activeP0Works.length || explicitRentalBlockers.length) {
    const count = new Set([...activeP0Works, ...explicitRentalBlockers].map((item) => item.id)).size;
    rental = {
      status: "Bloquée / à ne pas valider",
      detail: `${count} point${count > 1 ? "s" : ""} est${count > 1 ? "sont" : ""} explicitement bloquant${count > 1 ? "s" : ""} ou de niveau P0. La location ne doit pas être présentée comme possible tant que ${count > 1 ? "ils ne sont" : "il n’est"} pas résolu${count > 1 ? "s" : ""}.`
    };
  } else if (pendingP1Checks.length || pendingP2Checks.length || activeP1Works.length || activeP2Works.length) {
    const openCount = pendingP1Checks.length + pendingP2Checks.length + activeP1Works.length + activeP2Works.length;
    rental = {
      status: "Sous conditions / à vérifier",
      detail: `${openCount} point${openCount > 1 ? "s" : ""} P1/P2 reste${openCount > 1 ? "nt" : ""} ouvert${openCount > 1 ? "s" : ""} entre contrôles et travaux. Ils empêchent une validation automatique de la location, sans être tous qualifiés de « bloquants ».`
    };
  } else {
    rental = {
      status: "Pré-requis P1/P2 renseignés",
      detail: "Aucun contrôle P1/P2 ni travail prioritaire ouvert n’est détecté. Cela ne vaut pas autorisation de louer : la décision finale reste à confirmer avec sécurité, capacité réelle et règles applicables."
    };
  }

  return {
    habitability,
    rental,
    pendingP1Checks,
    pendingP2Checks,
    activeP0Works,
    activeP1Works,
    activeP2Works,
    explicitRentalBlockers
  };
}

function StatusCard({ label, value, detail }) {
  return (
    <article className="fincaHouseStatusCard">
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function HouseStatusPanel() {
  const priorityCounts = getHousePriorityCounts();
  const [roomPlan, setRoomPlan] = useState(() => parseRoomPlan(localStorage.getItem(ROOM_PLAN_KEY)));
  const [inventory, setInventory] = useState(() => parseInventory(localStorage.getItem(HOUSE_INVENTORY_KEY)));
  const capacity = summarizeCapacity(roomPlan);
  const essentials = getHouseEssentialSummary(inventory);
  const decision = deriveHouseDecision(essentials);
  const essentialPending = essentials.checks.filter((item) => !item.matches.length);

  useEffect(() => {
    let lastRoomRaw = localStorage.getItem(ROOM_PLAN_KEY) || "";
    let lastInventoryRaw = localStorage.getItem(HOUSE_INVENTORY_KEY) || "";
    const refresh = () => {
      const nextRoomRaw = localStorage.getItem(ROOM_PLAN_KEY) || "";
      if (nextRoomRaw !== lastRoomRaw) {
        lastRoomRaw = nextRoomRaw;
        setRoomPlan(parseRoomPlan(nextRoomRaw));
      }
      const nextInventoryRaw = localStorage.getItem(HOUSE_INVENTORY_KEY) || "";
      if (nextInventoryRaw !== lastInventoryRaw) {
        lastInventoryRaw = nextInventoryRaw;
        setInventory(parseInventory(nextInventoryRaw));
      }
    };
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const capacityValue = capacity.total > 0
    ? `${capacity.total} couchage${capacity.total > 1 ? "s" : ""} renseigné${capacity.total > 1 ? "s" : ""}`
    : cortijoHouseStatus.capacity.status;
  const capacityDetail = capacity.total > 0
    ? `${capacity.withBeds}/${capacity.totalRooms} chambres ont un nombre de couchages saisi ; ${capacity.withTypes}/${capacity.withBeds} ont aussi le type de lit. Ce total est une capacité physique renseignée, pas encore une capacité confortable ou maximale validée.`
    : cortijoHouseStatus.capacity.reason;
  const essentialValue = `${essentials.repereCount}/${essentials.total} repérés`;
  const essentialDetail = essentials.repereCount
    ? `${essentials.remainingCount} point${essentials.remainingCount > 1 ? "s" : ""} reste${essentials.remainingCount > 1 ? "nt" : ""} à vérifier sur place. « Repéré » signifie seulement qu’un équipement correspondant est déclaré présent dans l’inventaire ; cela ne valide ni fonctionnement ni sécurité.`
    : "Aucun des équipements essentiels n’est encore confirmé dans l’inventaire actuel. Cela signifie « à vérifier », pas « manquant ».";

  return (
    <section className="fincaHouseStatusPanel" aria-label="État documentaire de la maison">
      <style>{`
        .fincaHouseStatusPanel{margin:1rem 0;border:1px solid rgba(214,169,85,.26);border-radius:22px;padding:clamp(.8rem,2vw,1.1rem);background:linear-gradient(145deg,rgba(15,24,18,.95),rgba(7,11,8,.95));color:#eadab7}.fincaHouseStatusHead{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.75rem}.fincaHouseStatusHead h2{margin:0;color:#fff3d4;font:700 clamp(1.25rem,3vw,1.7rem)/1.15 Georgia,'Times New Roman',serif}.fincaHouseStatusHead p{margin:.25rem 0 0;color:#cdb98d;font-size:.84rem;line-height:1.4}.fincaHouseStatusHead small{white-space:nowrap;color:#a9956f;font-size:.72rem}.fincaHouseStatusGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem}.fincaHouseStatusCard{border:1px solid rgba(214,169,85,.16);border-radius:16px;padding:.75rem;background:rgba(0,0,0,.13)}.fincaHouseStatusCard small{display:block;color:#bfae88;text-transform:uppercase;letter-spacing:.08em;font-size:.66rem}.fincaHouseStatusCard strong{display:block;margin:.2rem 0;color:#fff3d4;font-size:1rem}.fincaHouseStatusCard p{margin:0;color:#cdb98d;font-size:.78rem;line-height:1.4}.fincaRoomCapacityList{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.45rem;margin:.7rem 0}.fincaRoomCapacityList article{border:1px solid rgba(214,169,85,.13);border-radius:12px;padding:.55rem .65rem;background:rgba(0,0,0,.1)}.fincaRoomCapacityList strong{display:block;color:#fff3d4;font-size:.82rem}.fincaRoomCapacityList span{display:block;margin-top:.12rem;color:#bfae88;font-size:.72rem;line-height:1.35}.fincaHousePriorityLegend{display:flex;gap:.35rem;flex-wrap:wrap;margin:.75rem 0}.fincaHousePriorityLegend span{border:1px solid rgba(214,169,85,.18);border-radius:999px;padding:.3rem .5rem;background:rgba(214,169,85,.06);font-size:.7rem}.fincaHousePriorityLegend b{color:#efd99d}.fincaHouseDecisionNote{margin:.7rem 0;border:1px solid rgba(214,169,85,.16);border-radius:14px;padding:.65rem .75rem;background:rgba(214,169,85,.05);color:#cdb98d;font-size:.78rem;line-height:1.45}.fincaHouseDecisionNote strong{color:#fff3d4}.fincaHouseEssentials,.fincaHouseWorks{margin-top:.55rem;border-top:1px solid rgba(214,169,85,.14);padding-top:.55rem}.fincaHouseEssentials>summary,.fincaHouseWorks>summary{cursor:pointer;color:#efd99d;font-weight:800}.fincaHouseEssentialList,.fincaHouseWorkList{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.6rem;margin-top:.65rem}.fincaHouseEssential,.fincaHouseWork{border:1px solid rgba(214,169,85,.16);border-radius:15px;padding:.72rem;background:rgba(0,0,0,.12)}.fincaHouseEssential h3,.fincaHouseWork h3{margin:0;color:#fff3d4;font-size:.96rem}.fincaHouseEssential p,.fincaHouseWork p{margin:.35rem 0 0;color:#cdb98d;font-size:.78rem;line-height:1.42}.fincaHouseEssentialTop,.fincaHouseWorkTop{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start}.fincaHouseEssentialBadge,.fincaHouseWorkBadge{white-space:nowrap;border:1px solid rgba(214,169,85,.24);border-radius:999px;padding:.2rem .45rem;color:#efd99d;font-size:.69rem;font-weight:800}.fincaHouseWork ul{margin:.4rem 0 0;padding-left:1.05rem;color:#bfae88;font-size:.75rem;line-height:1.4}.fincaHouseMethod{margin:.7rem 0 0;color:#a9956f;font-size:.72rem;line-height:1.4}@media(max-width:980px){.fincaHouseStatusGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.fincaHouseStatusHead{flex-direction:column}.fincaHouseStatusHead small{white-space:normal}.fincaHouseStatusGrid{grid-template-columns:1fr}.fincaHouseEssentialList,.fincaHouseWorkList{grid-template-columns:1fr}}
      `}</style>

      <div className="fincaHouseStatusHead">
        <div>
          <h2>État de la maison</h2>
          <p>Vue de gestion issue des pièces reliées et des informations réellement saisies dans la Maison. Elle distingue ce qui est documenté de ce qui reste à vérifier.</p>
        </div>
        <small>Revu le {cortijoHouseStatus.reviewedAt.split("-").reverse().join("/")}</small>
      </div>

      <div className="fincaHouseStatusGrid">
        <StatusCard label="Habitabilité" value={decision.habitability.status} detail={decision.habitability.detail} />
        <StatusCard label="Location" value={decision.rental.status} detail={decision.rental.detail} />
        <StatusCard label="Capacité" value={capacityValue} detail={capacityDetail} />
        <StatusCard label="Équipements essentiels" value={essentialValue} detail={essentialDetail} />
      </div>

      <p className="fincaHouseDecisionNote"><strong>Règle de décision :</strong> un point « à vérifier » reste une inconnue, pas une défaillance. Un travail P1/P2 ouvert maintient la décision sous réserve, mais il n’est qualifié de « bloquant » que si le dossier le dit explicitement. Un P0 actif, en revanche, empêche la validation automatique.</p>

      <div className="fincaRoomCapacityList" aria-label="Couchages renseignés par chambre">
        {capacity.rooms.map((room) => (
          <article key={room.name}>
            <strong>{room.name}</strong>
            <span>{room.beds !== null ? `${room.beds} couchage${room.beds > 1 ? "s" : ""}` : "Nombre de couchages à renseigner"}</span>
            <span>{room.bedTypes || "Type de lit à renseigner"}</span>
          </article>
        ))}
      </div>

      <details className="fincaHouseEssentials" open>
        <summary>Vérifications P1 / P2 à terminer · {essentialPending.length}</summary>
        <div className="fincaHouseEssentialList">
          {essentialPending.map((item) => (
            <article className="fincaHouseEssential" key={item.id}>
              <div className="fincaHouseEssentialTop">
                <div><h3>{item.label}</h3><p>{item.area}</p></div>
                <span className="fincaHouseEssentialBadge">{item.priority}</span>
              </div>
              <p><strong>Statut :</strong> à vérifier sur place</p>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </details>

      <div className="fincaHousePriorityLegend" aria-label="Priorités travaux">
        {cortijoHouseStatus.priorityLegend.map((item) => (
          <span key={item.code}><b>{item.code}</b> · {item.label}{priorityCounts[item.code] ? ` (${priorityCounts[item.code]})` : ""}</span>
        ))}
      </div>

      <details className="fincaHouseWorks" open>
        <summary>Travaux et points documentés · {cortijoHouseStatus.works.length}</summary>
        <div className="fincaHouseWorkList">
          {cortijoHouseStatus.works.map((work) => (
            <article className="fincaHouseWork" key={work.id}>
              <div className="fincaHouseWorkTop">
                <div><h3>{work.title}</h3><p>{work.area} · {work.type}</p></div>
                <span className="fincaHouseWorkBadge">{work.priority}</span>
              </div>
              <p><strong>Statut :</strong> {work.status}</p>
              <p>{work.evidence}</p>
              <p><strong>Pourquoi cette priorité :</strong> {work.priorityBasis}</p>
              <p><strong>À retrouver / vérifier :</strong></p>
              <ul>{work.missing.map((item) => <li key={item}>{item}</li>)}</ul>
              <p><strong>Impact location :</strong> {work.rentalImpact}</p>
            </article>
          ))}
        </div>
      </details>

      <p className="fincaHouseMethod">{cortijoHouseStatus.method}. Le nombre de couchages affiché vient uniquement des champs déjà saisis dans les chambres ; il n’est jamais inventé à partir du nom d’une pièce. Les contrôles P1/P2 ci-dessus sont alimentés uniquement par l’inventaire actuel de la ferme. « À vérifier » ne veut pas dire « manquant », et « repéré » ne vaut ni test de fonctionnement ni contrôle de sécurité. Aucun P0 n’est créé sans pièce établissant un danger ou une sécurité immédiate.</p>
    </section>
  );
}

export function FincaHouseStatusMount() {
  const [host, setHost] = useState(null);

  useEffect(() => {
    const resolve = () => {
      const next = resolveHost();
      setHost((current) => current === next ? current : next);
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return host ? createPortal(<HouseStatusPanel />, host) : null;
}
