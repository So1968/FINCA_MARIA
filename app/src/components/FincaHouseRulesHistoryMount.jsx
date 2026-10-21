import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const history = [
  {
    date: "30/11/2016",
    title: "Règlement intérieur d’ALEMANES 2017 — version remaniée",
    status: "Brouillon le plus avancé retrouvé",
    source: "Envoyé avec le compte rendu du conseil de famille du 20/11/2016.",
    text: "Précise les habitants et limites du Cortijo, les parties communes, le parking, les suites, les réservations, les courses, le ménage, le linge, les traditions, les gages et les projets à venir."
  },
  {
    date: "11/10/2016",
    title: "Règlement intérieur d’ALEMANES 2017 — brouillon de travail",
    status: "Brouillon préparant 2017",
    source: "Mail « Règlement intérieur Alemanes remanié par Gloria MJ et Sofia N 1 ».",
    text: "Reprend le grand remaniement de 2015 et ajoute des règles très pratiques : affaires personnelles, ménage pour les arrivées et départs, ménage quotidien, visites, linge et tolérance en cas d’oubli."
  },
  {
    date: "16/09/2015",
    title: "Règlement intérieur d’ALEMANES 2015",
    status: "Grand remaniement — 8 pages",
    source: "Pièce jointe « Alemanes règlement remanié.doc ».",
    text: "Le règlement devient un véritable mode d’emploi familial : copropriété, parties communes, parking, suites, réservations, cotisations, tâches, courses, cuisine, ménage, linge, sieste, alberca, veillée, déplacements, sanctions et projets communs."
  },
  {
    date: "11/05/2015",
    title: "Règlement intérieur — mise à mettre à jour",
    status: "Réouverture de la base 2010",
    source: "Pièce jointe du mail « Règlement Intérieur ALEMANES ».",
    text: "Le texte reste celui de 2010 mais il est remis en circulation pour préparer les séjours de 2015, avec une demande de mise à jour avant le 18/05/2015."
  },
  {
    date: "2010",
    title: "Règlement intérieur d’Alemanes 2010",
    status: "Première base structurée retrouvée",
    source: "Document retrouvé dans un mail familial du 22/07/2013, objet « Règlement intérieur 2010 Essai ».",
    text: "Base en 16 rubriques : membres, cotisations, enfants, traditions locales, animaux, couvertures, piscine, linge, cuisine, entretien, temps de travail, intimité, rangement, lieux communs, projets et dimanche de repos."
  }
];

function hosts() {
  if (new URLSearchParams(window.location.search).get("mode") === "vacanciers") return {};
  const main = document.querySelector(".cortijoExportApp");
  const nav = main?.querySelector(".fincaHouseJump");
  const footer = main?.querySelector(".cortijoExportRule");
  if (!main || !nav || !footer) return {};
  let navHost = document.getElementById("finca-rules-nav-host");
  if (!navHost) {
    navHost = document.createElement("span");
    navHost.id = "finca-rules-nav-host";
    navHost.style.display = "contents";
    nav.appendChild(navHost);
  }
  let sectionHost = document.getElementById("finca-rules-section-host");
  if (!sectionHost) {
    sectionHost = document.createElement("div");
    sectionHost.id = "finca-rules-section-host";
    main.insertBefore(sectionHost, footer);
  }
  return { nav: navHost, section: sectionHost };
}

function openRules() {
  const target = document.getElementById("reglements");
  if (target instanceof HTMLDetailsElement) target.open = true;
  window.history.replaceState(null, "", "/?view=cortijo-maison#reglements");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function HistoryPanel() {
  useEffect(() => {
    if (window.location.hash === "#reglements") requestAnimationFrame(openRules);
  }, []);
  return (
    <details id="reglements" className="cortijoView">
      <summary className="cortijoPanelTitle"><span>08</span><div><h3>Règlements intérieurs — historique</h3><p>Les versions familiales retrouvées, sans les confondre avec les règles actuelles.</p></div><small className="cortijoSummaryBadge">5 jalons</small></summary>
      <article className="cortijoCard" style={{ marginBottom: ".8rem" }}>
        <div className="cortijoCardTop"><span className="cortijoPill">ARCHIVE FAMILIALE</span><small>2010 → préparation 2017</small></div>
        <h4>Conserver l’évolution sans écraser l’histoire</h4>
        <p>Les documents retrouvés montrent le passage d’un règlement court en 2010 à un véritable mode d’emploi familial en 2015, puis à des brouillons 2017 beaucoup plus détaillés préparés à l’automne 2016.</p>
        <p><strong>Règle :</strong> une ancienne règle, une suggestion ou un brouillon n’est pas automatiquement une règle actuelle de FINCA MARIA.</p>
      </article>
      <div className="cortijoColumns">
        {history.map((item) => (
          <article className="cortijoCard" key={`${item.date}-${item.title}`}>
            <div className="cortijoCardTop"><span className="cortijoPill">{item.date}</span><small>{item.status}</small></div>
            <h4>{item.title}</h4>
            <p>{item.text}</p>
            <p><strong>Source :</strong> {item.source}</p>
          </article>
        ))}
      </div>
      <article className="cortijoCard" style={{ marginTop: ".8rem" }}>
        <h4>Fil directeur</h4>
        <p><strong>Constant :</strong> respect de la maison, partage des tâches, dépenses communes et vie locale. <strong>À partir de 2015 :</strong> réservations, chambres, parking, courses, linge, planning de ménage et parties communes deviennent beaucoup plus précis. <strong>En 2016 :</strong> les brouillons préparant 2017 insistent davantage sur les arrivées et départs, les visites, le linge et la prévention des petits conflits.</p>
        <p><strong>Conservation :</strong> le futur règlement actuel restera séparé de cet historique.</p>
      </article>
    </details>
  );
}

export function FincaHouseRulesHistoryMount() {
  const [targets, setTargets] = useState({});
  useEffect(() => {
    const resolve = () => setTargets(hosts());
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  if (!targets.nav && !targets.section) return null;
  return <>{targets.nav && createPortal(<button type="button" onClick={openRules}>Règlements</button>, targets.nav)}{targets.section && createPortal(<HistoryPanel />, targets.section)}</>;
}
