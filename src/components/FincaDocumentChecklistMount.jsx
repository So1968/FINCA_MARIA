import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const rows = [
  { period: "2007/08", level: "À confirmer", have: "Premier bail écrit 12/02/2007–11/02/2013 ; pièces San Juan 4 468 kg / 815,03 kg d’huile / 18,24 % ; contrôle PAC terrain du 12/07/2007.", missing: "Vérifier si le contrôle PAC comporte réellement une page absente ; obtenir le relevé/jeu San Juan complet si la coopérative peut encore le fournir.", ask: ["San Juan", "ASAJA"], contacts: ["san-juan", "asaja"] },
  { period: "2008/09", level: "À confirmer", have: "Pièces San Juan : 1 795 kg, 316,49 kg d’huile, rendement 17,63 %.", missing: "Vales et liquidation complète si les pièces conservées ne couvrent pas toute la campagne.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2009/10", level: "À résoudre", have: "Deux groupes de pièces : 1 114 kg / 231,27 kg d’huile et 2 537 kg / 520,98 kg d’huile.", missing: "Document permettant d’expliquer l’articulation des deux groupes et de fixer le total officiel complet de campagne.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2010/11", level: "À confirmer", have: "Pièces San Juan : 1 405 kg, 264,82 kg d’huile, rendement 18,85 %.", missing: "Confirmation de complétude et liquidation complète si elle n’est pas déjà dans les originaux.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2011/12", level: "À confirmer", have: "Pièces San Juan : 3 635 kg, 824,64 kg d’huile, rendement 22,69 %.", missing: "Confirmation de complétude et liquidation complète si elle n’est pas déjà dans les originaux.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2012/13", level: "À résoudre", have: "Un groupe à 2 174 kg / 390,25 kg d’huile et un autre repère à 489 kg.", missing: "Pièce permettant de relier ou séparer définitivement les deux groupes et de fixer le total officiel.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2013/14", level: "À résoudre", have: "Une ligne à 1 163 kg et un groupe à 3 463 kg / 696,14 kg d’huile ; incohérence de lecture conservée.", missing: "Original ou relevé officiel permettant de lever l’incohérence et de fixer la campagne complète.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2014/15", level: "À consolider", have: "Production totale reconstituée à environ 10,37 t à partir de la part contractuelle de 15 %.", missing: "Relevé officiel complet des apports/liquidation pour confronter le calcul reconstitué aux écritures coopératives.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2015/16", level: "À consolider", have: "Production totale reconstituée à environ 25,69 t à partir de la part contractuelle de 15 %.", missing: "Relevé officiel complet des apports/liquidation pour confronter le calcul reconstitué aux écritures coopératives.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2016/17", level: "À consolider", have: "Production totale reconstituée à environ 11,48 t à partir de la part contractuelle de 15 %.", missing: "Relevé officiel complet des apports/liquidation pour confronter le calcul reconstitué aux écritures coopératives.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2017/18", level: "À consolider", have: "Pièce San Juan 4 008 kg / 851,60 kg d’huile ; production totale reconstituée ≈ 26,72 t ; Modelo 100 exercice 2017 présent.", missing: "Jeu San Juan complet permettant de rapprocher la part figurant sur le compte de María et la production totale reconstituée.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2018/19", level: "PRIORITAIRE", have: "Repère ancien de 1 590 kg à qualifier ; Modelo 100 exercice 2018 présent.", missing: "Tous les vales/tickets et la liquidation complète pour identifier ce que représentent les 1 590 kg et fixer la campagne.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2019/20", level: "PRIORITAIRE", have: "État de factures San Juan 2019 sous le compte de María ; Modelo 100 exercice 2019 présent ; continuité administrative documentée.", missing: "Vales d’apport, dates, kilos, rendement, huile, repartos et liquidation finale de la campagne 2019/20.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2020/21", level: "PRIORITAIRE", have: "État San Juan 2020 couvrant au moins 01/01–26/06/2020 ; fin du deuxième bail le 11/03/2020.", missing: "Production coopérative complète 2020/21 ; Modelo 100 exercice 2020 et justificatifs agricoles sources ; pièces utiles de la période de renégociation si elles existent.", ask: ["San Juan", "Peláez", "Archives familiales"], contacts: ["san-juan", "pelaez"] },
  { period: "2021/22", level: "PRIORITAIRE", have: "État de factures San Juan 2021 au nom de María Josefa.", missing: "Vales, apports et liquidation complète 2021/22 ; Modelo 100 exercice 2021 et justificatifs agricoles sources.", ask: ["San Juan", "Peláez"], contacts: ["san-juan", "pelaez"] },
  { period: "2022/23", level: "PRIORITAIRE", have: "État de factures San Juan 2022 ; réponse PAC 2022 ; Modelo 100 exercice 2022 présent.", missing: "Vales, apports, rendement, huile, repartos et liquidation complète de la campagne 2022/23.", ask: ["San Juan"], contacts: ["san-juan"] },
  { period: "2023/24", level: "À verrouiller", have: "Trois vales totalisant 2 294 kg ; 389,06 kg d’huile ; rendement 16,96 % ; passage au paiement à la prestation documenté vers 2023/24.", missing: "Confirmation officielle que les 2 294 kg couvrent toute la campagne ; échange daté établissant précisément l’absence de nouveau bail ; Modelo 100 exercice 2023.", ask: ["San Juan", "Peláez", "Archives familiales / WhatsApp"], contacts: ["san-juan", "pelaez"] },
  { period: "2024/25", level: "À verrouiller", have: "6 551 kg, 1 357,37 kg d’huile, rendement 20,72 % ; PAC détaillée 2024 ; facture Vitines n°336 de 1 518 € TTC + note manuscrite séparée.", missing: "Confirmation de complétude et vales individuels ; détail de la facture n°336 et articulation avec la note manuscrite ; Modelo 100 exercice 2024.", ask: ["San Juan", "Agriculteur / Vitines", "Peláez"], contacts: ["san-juan", "agriculteur", "pelaez"] },
  { period: "2025/26", level: "PRIORITAIRE", have: "Premier ramassage documenté à 7 943 kg ; 6 541 kg signalés ensuite comme restant au sol, sans les compter comme apport livré faute de ticket.", missing: "Tous les tickets/vales originaux, relevé officiel complet, total annuel, rendement, kilos d’huile, repartos et liquidation finale ; Modelo 100 exercice 2025 déclaré en 2026.", ask: ["San Juan", "Peláez"], contacts: ["san-juan", "pelaez"] },
  { period: "2026", level: "PRIORITAIRE", have: "Déclaration PAC 2026 référencée au 12/03/2026 ; facture Vitines n°378 de 5 445 € TTC ; interventions déclarées des 22/04, 29/04 et 01/05/2026.", missing: "Dossier PAC 2026 complet (parcelles, recintos, surfaces, cultures, aides, justificatif de dépôt) ; détail poste par poste de Vitines n°378, produits, matières actives, doses, parcelles et bons de travail ; relevé/achats San Juan 2026 si existants. Le Modelo 100 exercice 2026 n’est pas manquant : il sera établi en 2027.", ask: ["ASAJA", "Agriculteur / Vitines", "San Juan"], contacts: ["asaja", "agriculteur", "san-juan"] }
];

const dossierLabels = { "san-juan": "San Juan", asaja: "ASAJA", pelaez: "Peláez", agriculteur: "Vitines" };

function findTarget() {
  const privateSections = Array.from(document.querySelectorAll("#finca-maria-sections > details.cortijoView"));
  const privateDossiers = privateSections.find((item) => item.querySelector("h3")?.textContent?.includes("Dossiers & actions"));
  if (privateDossiers) return privateDossiers;
  const publicSections = Array.from(document.querySelectorAll(".dashboard-sections > details.section"));
  const publicDossiers = publicSections.find((item) => item.querySelector("h3")?.textContent?.includes("Dossiers & actions"));
  return publicDossiers?.querySelector(".section-body") || null;
}

function Checklist() {
  return (
    <details style={{ border: "1px solid rgba(214,169,85,.28)", borderRadius: "14px", background: "rgba(0,0,0,.14)", overflow: "hidden", marginTop: ".8rem" }}>
      <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".8rem", padding: ".8rem .9rem", cursor: "pointer", listStyle: "none" }}>
        <div><strong style={{ display: "block" }}>Checklist documentaire 2007 → 2026</strong><small style={{ opacity: .82 }}>ON A · IL MANQUE · À DEMANDER À QUI</small></div>
        <span style={{ whiteSpace: "nowrap", fontSize: ".78rem" }}>20 périodes</span>
      </summary>
      <div style={{ padding: "0 .8rem .8rem" }}>
        <p style={{ margin: ".2rem 0 .7rem", fontSize: ".9rem", lineHeight: 1.45 }}>Un document est marqué comme manquant seulement s’il n’est pas retrouvé ou s’il ne permet pas encore de verrouiller la période. Les années anciennes restent à confirmer sans devenir automatiquement prioritaires.</p>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "980px", borderCollapse: "collapse", fontSize: ".9rem", lineHeight: 1.42 }}>
            <thead><tr><th style={{ textAlign: "left", padding: ".55rem", width: "10rem" }}>Période</th><th style={{ textAlign: "left", padding: ".55rem" }}>ON A</th><th style={{ textAlign: "left", padding: ".55rem" }}>IL MANQUE</th><th style={{ textAlign: "left", padding: ".55rem", width: "15rem" }}>À DEMANDER À QUI</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.period} style={{ borderTop: "1px solid rgba(214,169,85,.14)" }}>
                <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}><strong>{row.period}</strong><small style={{ display: "block", marginTop: ".2rem", opacity: .78 }}>{row.level}</small></td>
                <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}>{row.have}</td>
                <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}>{row.missing}</td>
                <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}><div>{row.ask.join(" · ")}</div>{row.contacts.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginTop: ".45rem" }}>{row.contacts.map((id) => <a key={`${row.period}-${id}`} href={`/?view=cortijo-memoire&contact=${id}`} style={{ fontSize: ".76rem", whiteSpace: "nowrap" }}>Ouvrir {dossierLabels[id]}</a>)}</div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

export function FincaDocumentChecklistMount() {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    let observer;
    let frame;
    const resolve = () => {
      const found = findTarget();
      if (!found) return;
      setTarget(found);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
    resolve();
    frame = window.requestAnimationFrame(resolve);
    observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer?.disconnect(); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  if (!target) return null;
  return createPortal(<Checklist />, target);
}
