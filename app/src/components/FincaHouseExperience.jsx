import { useEffect, useState } from "react";
import { HOUSE_SECTIONS, houseSection } from "../lib/houseData.mjs";
import { HouseReservations } from "./house/HouseReservations";
import { HouseInventory } from "./house/HouseInventory";
import { HouseMaintenance } from "./house/HouseMaintenance";
import { HouseGarden } from "./house/HouseGarden";
import { HouseFunctioning } from "./house/HouseFunctioning";
import { HouseOutings, HouseVisitorGuide } from "./house/HouseOutings";
import { HouseRecovery } from "./house/HouseUI";
import "../house-workspace.css";

const PANELS = { calendrier: HouseReservations, inventaire: HouseInventory, entretien: HouseMaintenance, jardin: HouseGarden, fonctionnement: HouseFunctioning, sorties: HouseOutings };
function HouseWorkspace() {
  const [section, setSection] = useState(() => houseSection(window.location.hash || new URLSearchParams(window.location.search).get("tab") || ""));
  const [destination, setDestination] = useState(() => window.location.hash);
  const [visited, setVisited] = useState(() => new Set([houseSection(window.location.hash || new URLSearchParams(window.location.search).get("tab") || "")]));
  useEffect(() => {
    const update = () => { const next = houseSection(window.location.hash || new URLSearchParams(window.location.search).get("tab") || ""); setSection(next); setDestination(window.location.hash); setVisited((current) => new Set([...current, next])); };
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => { window.removeEventListener("hashchange", update); window.removeEventListener("popstate", update); };
  }, []);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(id) || document.getElementById(section);
      for (let node = target; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
      target?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [section, destination]);
  return <main className="houseWorkspace fincaHouseWorkspace">
    <nav aria-label="Fil d’Ariane" className="houseBreadcrumb"><a href={window.location.pathname}>Accueil</a><span>›</span><a href="#maison">Maison</a><span>›</span><span>{HOUSE_SECTIONS.find((item) => item.id === section)?.title}</span></nav>
    <header className="houseHero" id="maison"><div><small>FINCA MARIA</small><h1>MAISON</h1><p>Réserver, préparer et entretenir la maison familiale.</p></div><a href="#maison">← Retour à Maison</a></header>
    <nav aria-label="Rubriques Maison" className="houseNav">{HOUSE_SECTIONS.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={section === item.id ? "page" : undefined}><strong>{item.title}</strong><span>{item.hint}</span></a>)}</nav>
    {HOUSE_SECTIONS.map((item) => {
      const Panel = PANELS[item.id];
      return <section key={item.id} id={item.id} className="housePanel" hidden={section !== item.id} aria-label={item.title}><div className="housePanelTitle"><h2 tabIndex={-1}>{item.title}</h2><a href="#maison">← Maison</a></div>{visited.has(item.id) && <Panel />}</section>;
    })}
    <HouseRecovery />
  </main>;
}
export function FincaHouseExperience() {
  return new URLSearchParams(window.location.search).get("mode") === "vacanciers" ? <HouseVisitorGuide /> : <HouseWorkspace />;
}
