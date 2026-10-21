import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const NAV_KEY = "finca_maria_navigation_v2";

const STAY_SECTIONS = [
  {
    title: "Avant l’arrivée",
    items: ["Vérifier eau et électricité", "Préparer les couchages", "Contrôler les produits indispensables", "Aérer et remettre la maison en service"]
  },
  {
    title: "Pendant le séjour",
    items: ["Noter les réparations à faire", "Mettre à jour les besoins", "Gérer le linge et les couchages utilisés", "Signaler tout problème de fonctionnement"]
  },
  {
    title: "Avant de partir",
    items: ["Faire le ménage et traiter le linge", "Fermer eau, fenêtres et accès", "Ranger les clés", "Faire la vérification finale de la maison"]
  }
];

function openHouse(hash = "") {
  window.location.assign(`/?view=cortijo-maison${hash ? `#${hash}` : ""}`);
}

function normalizeStoredNavigation() {
  try {
    const current = JSON.parse(localStorage.getItem(NAV_KEY) || "{}");
    if (current?.houseTab !== "afaire") return;
    localStorage.setItem(NAV_KEY, JSON.stringify({ ...current, houseTab: "gerer" }));
  } catch {
    // La navigation sera simplement réécrite au prochain clic.
  }
}

function findTargets() {
  const shell = document.querySelector(".fincaTwoWorlds");
  if (!shell) return {};

  const nav = Array.from(shell.querySelectorAll(".fincaSubNav")).find((candidate) => {
    const labels = Array.from(candidate.querySelectorAll("button")).map((button) => button.textContent?.trim());
    return (labels.includes("Gérer") || labels.includes("Séjour")) && labels.includes("À faire");
  });
  if (!nav) return {};

  const buttons = Array.from(nav.querySelectorAll("button"));
  const stayButton = buttons.find((button) => ["Gérer", "Séjour"].includes(button.textContent?.trim()));
  const todoButton = buttons.find((button) => button.textContent?.trim() === "À faire");
  if (!stayButton || !todoButton) return {};

  const stayLabel = stayButton.querySelector("span");
  if (stayLabel && stayLabel.textContent?.trim() !== "Séjour") stayLabel.textContent = "Séjour";
  if (todoButton.style.display !== "none") todoButton.style.display = "none";
  todoButton.setAttribute("aria-hidden", "true");
  todoButton.tabIndex = -1;

  if (todoButton.classList.contains("isActive")) {
    normalizeStoredNavigation();
    stayButton.click();
  }

  const intro = nav.nextElementSibling;
  if (stayButton.classList.contains("isActive")) {
    const title = intro?.querySelector("strong");
    const subtitle = intro?.querySelector("span");
    if (title && title.textContent !== "Préparer et gérer le séjour") title.textContent = "Préparer et gérer le séjour";
    if (subtitle && subtitle.textContent !== "Une seule rubrique pour préparer, vivre et fermer la maison") subtitle.textContent = "Une seule rubrique pour préparer, vivre et fermer la maison";
  }

  const functioningTitle = Array.from(shell.querySelectorAll(".fincaHouseCard h4")).find((title) => title.textContent?.trim() === "Fonctionnement");
  const oldGrid = functioningTitle?.closest(".fincaHouseGrid");
  const stayPane = oldGrid?.parentElement;
  if (!oldGrid || !stayPane) return { nav };

  if (oldGrid.style.display !== "none") oldGrid.style.display = "none";
  let host = document.getElementById("finca-house-stay-merged-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "finca-house-stay-merged-host";
    stayPane.appendChild(host);
  }
  return { nav, host };
}

function StayPanel() {
  return (
    <>
      <style>{`
        .fincaStayMerged{display:grid;gap:.8rem}.fincaStayMergedLead{border:1px solid rgba(214,169,85,.24);border-radius:18px;padding:.85rem 1rem;background:rgba(214,169,85,.06)}.fincaStayMergedLead strong{display:block;color:#fff3d4;font-size:1.05rem}.fincaStayMergedLead span{display:block;margin-top:.18rem;color:#cdb98d;font-size:.86rem}.fincaStayMergedPhases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem}.fincaStayMergedPhases article,.fincaStayMergedLinks article{border:1px solid rgba(214,169,85,.2);border-radius:18px;padding:1rem 1.05rem;background:rgba(5,9,7,.5)}.fincaStayMergedPhases h4,.fincaStayMergedLinks h4{margin:.1rem 0 .4rem;color:#fff3d4}.fincaStayMergedPhases ul{margin:.45rem 0 0;padding-left:1.15rem;color:#d7c39b}.fincaStayMergedLinks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.fincaStayMergedLinks p{color:#d7c39b}.fincaStayMergedLinks button{margin-top:.65rem;min-height:44px;border:1px solid rgba(214,169,85,.32);border-radius:999px;padding:.5rem .8rem;background:rgba(214,169,85,.08);color:#efd99d;cursor:pointer}@media(max-width:760px){.fincaStayMergedPhases,.fincaStayMergedLinks{grid-template-columns:1fr}}
      `}</style>
      <div className="fincaStayMerged">
        <div className="fincaStayMergedLead"><strong>Séjour</strong><span>« Gérer » et « À faire » sont regroupés ici : on prépare la maison, on suit le séjour, puis on la laisse prête pour les suivants.</span></div>
        <div className="fincaStayMergedPhases">
          {STAY_SECTIONS.map((section) => <article key={section.title}><h4>{section.title}</h4><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        </div>
        <div className="fincaStayMergedLinks">
          <article><h4>Checklist active du séjour</h4><p>Cocher réellement ce qui est fait avant l’arrivée, pendant le séjour et avant le départ.</p><button type="button" onClick={() => openHouse("menage")}>Ouvrir la checklist</button></article>
          <article><h4>Fonctionnement de la maison</h4><p>Clés, eau, électricité, équipements, ménage détaillé et autres repères pratiques restent dans le module Maison.</p><button type="button" onClick={() => openHouse("fonctionnement")}>Ouvrir le module Maison</button></article>
        </div>
      </div>
    </>
  );
}

export function FincaHouseStayOptimizationMount() {
  const [targets, setTargets] = useState({});

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let attempts = 0;

    const resolve = () => {
      if (cancelled) return;
      const next = findTargets();
      setTargets((current) => current.host === next.host && current.nav === next.nav ? current : next);
      if (!next.host && attempts < 20) {
        attempts += 1;
        timer = window.setTimeout(resolve, 75);
      }
    };

    timer = window.setTimeout(resolve, 0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!targets.host) return null;
  return createPortal(<StayPanel />, targets.host);
}
