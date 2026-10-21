import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const rows = [
  {
    period: "2026",
    level: "PRIORITAIRE",
    have: "Déclaration PAC 2026 référencée au 12/03/2026 ; facture Vitines n°378 de 5 445 € TTC ; interventions déclarées des 22/04, 29/04 et 01/05/2026.",
    missing: "Dossier PAC 2026 complet ; détail poste par poste de Vitines n°378, produits, matières actives, doses, parcelles et bons de travail ; relevé/achats San Juan 2026 si existants. Le Modelo 100 exercice 2026 sera établi en 2027.",
    ask: ["ASAJA", "Agriculteur / Vitines", "San Juan"],
    contacts: ["asaja", "agriculteur", "san-juan"]
  },
  {
    period: "2025/26",
    level: "PRIORITAIRE",
    have: "Ticket San Juan n°6139 du 23/03/2026 : 7 943 kg, parcelle 27 recinto 3. Environ 6 541 kg ont ensuite été signalés par la famille comme restant au sol ; ils ne sont pas comptés comme livraison faute de ticket.",
    missing: "Tous les autres tickets/vales éventuels, relevé officiel complet, total annuel, rendement, kilos d’huile, repartos et liquidation finale ; Modelo 100 exercice 2025.",
    ask: ["San Juan", "Peláez"],
    contacts: ["san-juan", "pelaez"]
  },
  {
    period: "2024/25",
    level: "À verrouiller",
    have: "6 551 kg, 1 357,37 kg d’huile, rendement 20,72 % ; valeur huile HT ≈ 4 283,31 € ; achats de produits coop visibles en 2025 : 980,63 € ; PAC détaillée 2024.",
    missing: "Liquidation complète et total réellement encaissé ; détail des prestations Vitines de la campagne ; Modelo 100 exercice 2024.",
    ask: ["San Juan", "Agriculteur / Vitines", "Peláez"],
    contacts: ["san-juan", "agriculteur", "pelaez"]
  },
  {
    period: "2023/24",
    level: "À verrouiller",
    have: "Récapitulatif San Juan : 2 294 kg ; trois vales concordants ; 389,06 kg d’huile ; rendement 16,96 % ; valeur huile HT 2 854,62 € ; avances 1 945,28 € et solde final 998,09 €.",
    missing: "Verrouiller la date exacte de la bascule du régime 15 % vers la gestion directe ; détail des coûts et articulation de la facture Vitines n°336 de 1 518 € avec la note manuscrite d’environ 2 565 € ; Modelo 100 exercice 2023.",
    ask: ["San Juan", "Agriculteur / Vitines", "Peláez", "Archives familiales / WhatsApp"],
    contacts: ["san-juan", "agriculteur", "pelaez"]
  },
  {
    period: "2022/23",
    level: "À consolider",
    have: "Récapitulatif San Juan : 684 kg correspondant à la part de 15 % dans l’ancien fonctionnement ; production totale reconstituée [C] ≈ 4 560 kg. Extrait de compte : 421,61 € de crédits documentés à ce stade, hors liquidation finale non retrouvée. Modelo 100 exercice 2022 présent.",
    missing: "Vales détaillés et liquidation finale complète pour fermer le calcul financier de la campagne.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2021/22",
    level: "À consolider",
    have: "Récapitulatif San Juan : 3 861 kg = part 15 % ; production totale reconstituée [C] ≈ 25 740 kg. Extraits de compte : 2 799,11 € de crédits bruts et 55,99 € de retenues, soit ≈ 2 743,12 € net.",
    missing: "Vales détaillés ; Modelo 100 exercice 2021 et justificatifs agricoles sources.",
    ask: ["San Juan", "Peláez"],
    contacts: ["san-juan", "pelaez"]
  },
  {
    period: "2020/21",
    level: "À consolider",
    have: "Récapitulatif San Juan : 1 225 kg = part 15 % ; production totale reconstituée [C] ≈ 8 166,67 kg. Extraits de compte : 653,11 € de crédits bruts et 13,07 € de retenues, soit ≈ 640,04 € net. Le bail écrit s’est terminé le 11/03/2020 mais le fonctionnement à 15 % a continué de fait selon la famille.",
    missing: "Vales détaillés ; Modelo 100 exercice 2020 et justificatifs agricoles sources ; pièces datées de la période de renégociation.",
    ask: ["San Juan", "Peláez", "Archives familiales"],
    contacts: ["san-juan", "pelaez"]
  },
  {
    period: "2019/20",
    level: "À consolider",
    have: "Récapitulatif San Juan : 5 360 kg = part 15 % ; production totale reconstituée [C] ≈ 35 733,33 kg. Crédits de campagne vérifiés : 1 952,74 € brut, 39,05 € de retenues, ≈ 1 913,69 € net. Une ligne résiduelle de 21,55 € reste à attribuer. Modelo 100 exercice 2019 présent.",
    missing: "Vales détaillés et attribution de la ligne résiduelle de 21,55 €.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2018/19",
    level: "À consolider",
    have: "Récapitulatif San Juan : 1 590 kg = part 15 % ; production totale reconstituée [C] ≈ 10 600 kg. Extraits de compte : 602,97 € brut, 12,06 € de retenues, ≈ 590,91 € net. Modelo 100 exercice 2018 présent.",
    missing: "Vales détaillés si disponibles pour rattacher chaque apport au total de campagne.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2017/18",
    level: "À consolider",
    have: "4 008 kg = part 15 % ; 851,60 kg d’huile ; production totale reconstituée [C] ≈ 26 720 kg. Extraits de compte : 2 538,80 € brut, 50,78 € de retenues, ≈ 2 488,02 € net. Modelo 100 exercice 2017 présent.",
    missing: "Jeu San Juan complet si disponible pour rapprocher tous les apports et règlements.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2016/17",
    level: "À consolider",
    have: "1 722 kg = part 15 % ; production totale reconstituée [C] 11 480 kg. Extraits de compte : 1 488,12 € brut, 29,77 € de retenues, ≈ 1 458,35 € net.",
    missing: "Jeu San Juan complet si disponible.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2015/16",
    level: "À consolider",
    have: "3 854 kg = part 15 % ; production totale reconstituée [C] ≈ 25 693,33 kg. Crédits reconstitués à partir du compte : 2 701,70 € brut, 54,02 € de retenues, ≈ 2 647,68 € net. Le repère OCR 9 064 kg n’est pas additionné.",
    missing: "Original/lecture définitive de la pièce OCR ambiguë et jeu San Juan complet si disponible.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2014/15",
    level: "À consolider",
    have: "1 556 kg = part 15 % ; production totale reconstituée [C] ≈ 10 373,33 kg. Trois règlements visibles totalisent au moins 609,91 € avant clôture définitive de la campagne.",
    missing: "Liquidation finale/compte complet pour obtenir le revenu annuel exact.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2013/14",
    level: "À résoudre",
    have: "Un groupe principal à 3 463 kg / 696,14 kg d’huile et une ligne distincte à 1 163 kg dont la lecture reste incohérente.",
    missing: "Original ou relevé officiel permettant de lever l’incohérence et de fixer la campagne complète avant tout calcul 15/85.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2012/13",
    level: "À résoudre",
    have: "Un groupe à 2 174 kg / 390,25 kg d’huile et un autre repère à 489 kg.",
    missing: "Pièce permettant de relier ou séparer définitivement les deux groupes avant tout calcul de total de campagne.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2011/12",
    level: "À confirmer",
    have: "3 635 kg sur le compte de María ; 824,64 kg d’huile ; rendement 22,69 %. Le contrat prévoit 15 % : production totale reconstituée [C] ≈ 24 233,33 kg.",
    missing: "Liquidation financière complète de campagne.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2010/11",
    level: "À confirmer",
    have: "1 405 kg sur le compte de María ; 264,82 kg d’huile ; rendement 18,85 %. Le contrat prévoit 15 % : production totale reconstituée [C] ≈ 9 366,67 kg.",
    missing: "Liquidation financière complète de campagne.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2009/10",
    level: "À résoudre",
    have: "Deux groupes : 1 114 kg / 231,27 kg d’huile et 2 537 kg / 520,98 kg d’huile.",
    missing: "Document expliquant l’articulation des deux groupes. Ils ne sont pas additionnés automatiquement.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2008/09",
    level: "À confirmer",
    have: "1 795 kg sur le compte de María ; 316,49 kg d’huile ; rendement 17,63 %. Le bail 2007 prévoit 15 % : production totale reconstituée [C] ≈ 11 966,67 kg.",
    missing: "Liquidation financière annuelle complète et réconciliation des repartos visibles.",
    ask: ["San Juan"],
    contacts: ["san-juan"]
  },
  {
    period: "2007/08",
    level: "À confirmer",
    have: "Premier bail écrit 12/02/2007–11/02/2013 : María reçoit 15 % de la production oléicole. San Juan : 4 468 kg / 815,03 kg d’huile / 18,24 % ; production totale reconstituée [C] ≈ 29 786,67 kg ; total de campagne documenté pour María : 1 530,94 €.",
    missing: "Relevé San Juan complet si encore disponible ; vérifier la complétude du contrôle PAC 2007.",
    ask: ["San Juan", "ASAJA"],
    contacts: ["san-juan", "asaja"]
  }
];

const economicRows = [
  {
    campaign: "2025/26",
    regime: "Gestion directe / prestations",
    familyKg: "7 943 kg livrés [P]",
    totalKg: "Total annuel non fixé",
    joseKg: "—",
    familyMoney: "Liquidation non disponible",
    joseMoney: "5 445 € TTC [P] facture n°378",
    note: "6 541 kg signalés comme restant au sol : non ajoutés sans ticket. José est ici prestataire, pas titulaire de 85 %."
  },
  {
    campaign: "2024/25",
    regime: "Gestion directe / prestations",
    familyKg: "6 551 kg [P]",
    totalKg: "6 551 kg documentés",
    joseKg: "—",
    familyMoney: "Valeur huile HT ≈ 4 283,31 € ; encaissement final à consolider",
    joseMoney: "Prestations à consolider",
    note: "Produits coop visibles : 980,63 €. Ne pas confondre valeur de l’huile et argent effectivement encaissé."
  },
  {
    campaign: "2023/24",
    regime: "Campagne charnière",
    familyKg: "2 294 kg [P]",
    totalKg: "2 294 kg documentés",
    joseKg: "—",
    familyMoney: "Valeur huile HT 2 854,62 € ; avances 1 945,28 € + solde 998,09 €",
    joseMoney: "1 518 € TTC [P] facture n°336 ; note ≈ 2 565 € à vérifier",
    note: "Ne pas additionner la note manuscrite à la facture n°336 tant que le risque de doublon n’est pas levé."
  },
  {
    campaign: "2022/23",
    regime: "15 % de fait [D]",
    familyKg: "684 kg",
    totalKg: "4 560 kg [C]",
    joseKg: "3 876 kg [C]",
    familyMoney: "≥ 421,61 € brut documenté ; ≈ 413,18 € net",
    joseMoney: "≥ 2 389,12 € brut équivalent [C]",
    note: "Liquidation finale absente : montants minimums. Année de très forte sécheresse à distinguer de la question de gestion."
  },
  {
    campaign: "2021/22",
    regime: "15 % de fait [D]",
    familyKg: "3 861 kg",
    totalKg: "25 740 kg [C]",
    joseKg: "21 879 kg [C]",
    familyMoney: "2 799,11 € brut ; ≈ 2 743,12 € net",
    joseMoney: "≈ 15 861,62 € brut équivalent [C]",
    note: "Une des campagnes qui confirme que la finca conservait encore un potentiel élevé."
  },
  {
    campaign: "2020/21",
    regime: "Après fin écrite du bail ; 15 % de fait [D]",
    familyKg: "1 225 kg",
    totalKg: "8 166,67 kg [C]",
    joseKg: "6 941,67 kg [C]",
    familyMoney: "653,11 € brut ; ≈ 640,04 € net",
    joseMoney: "≈ 3 700,96 € brut équivalent [C]",
    note: "Le bail écrit est fini depuis mars 2020, mais la famille indique que le partage 15/85 a continué."
  },
  {
    campaign: "2019/20",
    regime: "2e bail / 15 %",
    familyKg: "5 360 kg",
    totalKg: "35 733,33 kg [C]",
    joseKg: "30 373,33 kg [C]",
    familyMoney: "≥ 1 952,74 € brut vérifié ; ≈ 1 913,69 € net",
    joseMoney: "≥ 11 065,53 € brut équivalent [C]",
    note: "Une ligne résiduelle de 21,55 € n’est pas intégrée tant que son rattachement n’est pas verrouillé. Très grosse campagne."
  },
  {
    campaign: "2018/19",
    regime: "2e bail / 15 %",
    familyKg: "1 590 kg",
    totalKg: "10 600 kg [C]",
    joseKg: "9 010 kg [C]",
    familyMoney: "602,97 € brut ; ≈ 590,91 € net",
    joseMoney: "≈ 3 416,83 € brut équivalent [C]",
    note: "Les 1 590 kg ne sont pas la récolte totale : ils correspondent à la part de 15 %."
  },
  {
    campaign: "2017/18",
    regime: "2e bail / 15 %",
    familyKg: "4 008 kg",
    totalKg: "26 720 kg [C]",
    joseKg: "22 712 kg [C]",
    familyMoney: "2 538,80 € brut ; ≈ 2 488,02 € net",
    joseMoney: "≈ 14 386,53 € brut équivalent [C]",
    note: "Campagne haute."
  },
  {
    campaign: "2016/17",
    regime: "2e bail / 15 %",
    familyKg: "1 722 kg",
    totalKg: "11 480 kg [C]",
    joseKg: "9 758 kg [C]",
    familyMoney: "1 488,12 € brut ; ≈ 1 458,35 € net",
    joseMoney: "≈ 8 432,68 € brut équivalent [C]",
    note: "Campagne basse dans une alternance déjà ancienne."
  },
  {
    campaign: "2015/16",
    regime: "2e bail / 15 %",
    familyKg: "3 854 kg",
    totalKg: "25 693,33 kg [C]",
    joseKg: "21 839,33 kg [C]",
    familyMoney: "2 701,70 € brut ; ≈ 2 647,68 € net",
    joseMoney: "≈ 15 309,63 € brut équivalent [C]",
    note: "Le repère OCR 9 064 kg est exclu du calcul : il ne doit pas être ajouté aux 3 854 kg."
  },
  {
    campaign: "2014/15",
    regime: "2e bail / 15 %",
    familyKg: "1 556 kg",
    totalKg: "10 373,33 kg [C]",
    joseKg: "8 817,33 kg [C]",
    familyMoney: "≥ 609,91 € de règlements visibles",
    joseMoney: "≥ 3 456,16 € brut équivalent [C]",
    note: "Montants financiers incomplets : ce sont des minimums documentés."
  },
  {
    campaign: "2013/14",
    regime: "Entre les deux baux / à clarifier",
    familyKg: "3 463 kg + repère 1 163 kg non agrégé",
    totalKg: "Non fixé",
    joseKg: "Non fixé",
    familyMoney: "Partiel : groupe principal ≈ 305,62 € net",
    joseMoney: "Non calculé",
    note: "Deux groupes incompatibles : aucun total 15/85 automatique."
  },
  {
    campaign: "2012/13",
    regime: "1er bail / 15 %",
    familyKg: "2 174 kg + repère 489 kg non agrégé",
    totalKg: "Non fixé",
    joseKg: "Non fixé",
    familyMoney: "Partiel : groupe principal ≈ 299,84 € net",
    joseMoney: "Non calculé",
    note: "Deux groupes à résoudre avant tout total."
  },
  {
    campaign: "2011/12",
    regime: "1er bail / 15 %",
    familyKg: "3 635 kg",
    totalKg: "24 233,33 kg [C]",
    joseKg: "20 598,33 kg [C]",
    familyMoney: "À consolider",
    joseMoney: "À consolider",
    note: "Production lisible ; argent annuel pas encore fermé."
  },
  {
    campaign: "2010/11",
    regime: "1er bail / 15 %",
    familyKg: "1 405 kg",
    totalKg: "9 366,67 kg [C]",
    joseKg: "7 961,67 kg [C]",
    familyMoney: "Partiel seulement",
    joseMoney: "À consolider",
    note: "Premier reparto visible, liquidation annuelle complète à retrouver."
  },
  {
    campaign: "2009/10",
    regime: "1er bail / 15 %",
    familyKg: "Groupes 1 114 kg et 2 537 kg",
    totalKg: "Non fixé",
    joseKg: "Non fixé",
    familyMoney: "Partiel / conflictuel",
    joseMoney: "Non calculé",
    note: "Les deux groupes ne sont pas additionnés tant que leur articulation n’est pas prouvée."
  },
  {
    campaign: "2008/09",
    regime: "1er bail / 15 %",
    familyKg: "1 795 kg",
    totalKg: "11 966,67 kg [C]",
    joseKg: "10 171,67 kg [C]",
    familyMoney: "À consolider",
    joseMoney: "À consolider",
    note: "Plusieurs repartos/liquidations existent, mais le total financier annuel n’est pas encore réconcilié proprement."
  },
  {
    campaign: "2007/08",
    regime: "1er bail / 15 %",
    familyKg: "4 468 kg",
    totalKg: "29 786,67 kg [C]",
    joseKg: "25 318,67 kg [C]",
    familyMoney: "1 530,94 € total campagne documenté",
    joseMoney: "≈ 8 675,33 € brut équivalent [C]",
    note: "Le contrat écrit du 12/02/2007 fixe la rente à 15 % de la production d’olives."
  }
];

const contractSummaries = [
  {
    title: "1er bail écrit · 2007 → 2013",
    production: "Sur les 4 campagnes sans groupes conflictuels : famille 11 303 kg ; production reconstituée 75,35 t ; José 64,05 t [C].",
    money: "Le total financier du contrat n’est pas encore calculable proprement. 2007/08 est fermé à 1 530,94 € pour María ; les autres campagnes restent partielles ou conflictuelles.",
    status: "TOTAL INCOMPLET"
  },
  {
    title: "2e bail écrit · 2014 → mars 2020",
    production: "Campagnes 2014/15 à 2019/20 : famille 18 090 kg ; production reconstituée 120,60 t ; José 102,51 t [C].",
    money: "Minimum documenté : famille ≥ 9 894,24 € brut ; équivalent 85 % de José ≥ 56 067,36 € brut [C], avant ses frais d’exploitation. 2014/15 n’est pas financièrement complet.",
    status: "MINIMUM DOCUMENTÉ"
  },
  {
    title: "Continuité du 15 % après mars 2020 · jusqu’à 2022/23",
    production: "Famille 5 770 kg ; production reconstituée 38,47 t ; José 32,70 t [C].",
    money: "Minimum documenté : famille ≥ 3 873,83 € brut ; équivalent 85 % de José ≥ 21 951,70 € brut [C]. Le 2022/23 est incomplet financièrement.",
    status: "RÉGIME DE FAIT [D]"
  },
  {
    title: "Ancien système 15 % · 2014/15 → 2022/23",
    production: "Famille 23 860 kg ; production totale reconstituée 159,07 t ; José 135,21 t [C].",
    money: "Sur les montants déjà documentés : famille ≥ 13 768,07 € brut ; équivalent 85 % de José ≥ 78 019,06 € brut [C]. Ce n’est pas un bénéfice net et ce total reste un minimum.",
    status: "VUE D’ENSEMBLE"
  }
];

const dossierLabels = {
  "san-juan": "San Juan",
  asaja: "ASAJA",
  pelaez: "Peláez",
  agriculteur: "Vitines"
};

function findActionsTarget() {
  const privateSections = Array.from(document.querySelectorAll("#finca-maria-sections > details.cortijoView"));
  const privateDossiers = privateSections.find((item) => item.querySelector("h3")?.textContent?.includes("Dossiers & actions"));
  if (privateDossiers) return privateDossiers;

  const publicSections = Array.from(document.querySelectorAll(".dashboard-sections > details.section"));
  const publicDossiers = publicSections.find((item) => item.querySelector("h3")?.textContent?.includes("Dossiers & actions"));
  return publicDossiers?.querySelector(".section-body") || null;
}

function findAnalysisTarget() {
  const privateSections = Array.from(document.querySelectorAll("#finca-maria-sections > details.cortijoView"));
  const privateAnalysis = privateSections.find((item) => item.querySelector("h3")?.textContent?.trim() === "Analyse");
  if (privateAnalysis) return privateAnalysis;

  const publicSections = Array.from(document.querySelectorAll(".dashboard-sections > details.section"));
  const publicAnalysis = publicSections.find((item) => item.querySelector("h3")?.textContent?.trim() === "Analyse");
  return publicAnalysis?.querySelector(".section-body") || null;
}

function EconomicAnalysis() {
  const box = {
    border: "1px solid rgba(214,169,85,.28)",
    borderRadius: "16px",
    background: "rgba(0,0,0,.16)",
    padding: ".9rem",
    marginTop: "1rem"
  };
  const th = { textAlign: "left", padding: ".58rem", verticalAlign: "bottom" };
  const td = { verticalAlign: "top", padding: ".62rem .58rem" };

  return (
    <section style={{ marginTop: "1rem" }} aria-label="Analyse économique 2007 à 2026">
      <div style={box}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ".8rem", flexWrap: "wrap" }}>
          <div>
            <strong style={{ display: "block", fontSize: "1.12rem" }}>Économie du bail : famille vs agriculteur · 2007 → 2026</strong>
            <small style={{ opacity: .82 }}>Production · argent reçu · part de José · coûts · niveau de preuve</small>
          </div>
          <span className="cortijoPill">MISE À JOUR 20/08/2026</span>
        </div>

        <p style={{ lineHeight: 1.52 }}>
          <strong>Règle de calcul.</strong> Pendant le régime à 15 %, les kilos inscrits au nom de María puis de María Josefa correspondent à la part propriétaire. La production totale est reconstituée par <strong>part famille ÷ 0,15</strong> et la part de José par <strong>85 %</strong>. Les montants indiqués pour José sont donc des <strong>équivalents de recette brute</strong> aux mêmes conditions de valorisation, <strong>pas son bénéfice net</strong> : les contrats mettent les frais d’exploitation à la charge du fermier.
        </p>
        <p style={{ lineHeight: 1.52, marginBottom: 0 }}>
          <strong>Périmètre actuel.</strong> Les totaux ci-dessous portent d’abord sur l’<strong>olivier</strong>. Ils ne comprennent pas encore la valeur des terres arables/céréales ni toutes les subventions. Le bail fixe une rente de 0 % sur les terres de calme ; un brouillon familial de 2020 indique en outre que María conservait la totalité de la subvention. Ces deux postes doivent être reconstitués année par année avant de parler de revenu global définitif du contrat.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: ".7rem", marginTop: ".8rem" }}>
        {contractSummaries.map((item) => (
          <article key={item.title} style={box}>
            <span className="cortijoPill">{item.status}</span>
            <h4 style={{ margin: ".55rem 0 .35rem" }}>{item.title}</h4>
            <p style={{ margin: ".3rem 0", lineHeight: 1.45 }}><strong>Production :</strong> {item.production}</p>
            <p style={{ margin: ".3rem 0", lineHeight: 1.45 }}><strong>Argent :</strong> {item.money}</p>
          </article>
        ))}
      </div>

      <details open style={{ ...box, padding: 0, overflow: "hidden" }}>
        <summary style={{ cursor: "pointer", padding: ".82rem .9rem", fontWeight: 800 }}>Détail campagne par campagne · plus récente d’abord</summary>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "1280px", borderCollapse: "collapse", fontSize: ".86rem", lineHeight: 1.4 }}>
            <thead>
              <tr style={{ borderTop: "1px solid rgba(214,169,85,.14)" }}>
                <th style={th}>Campagne</th>
                <th style={th}>Régime</th>
                <th style={th}>Part famille / kg</th>
                <th style={th}>Total finca</th>
                <th style={th}>Part José / kg</th>
                <th style={th}>Famille / €</th>
                <th style={th}>José / €</th>
                <th style={th}>Lecture</th>
              </tr>
            </thead>
            <tbody>
              {economicRows.map((row) => (
                <tr key={row.campaign} style={{ borderTop: "1px solid rgba(214,169,85,.14)" }}>
                  <td style={td}><strong>{row.campaign}</strong></td>
                  <td style={td}>{row.regime}</td>
                  <td style={td}>{row.familyKg}</td>
                  <td style={td}>{row.totalKg}</td>
                  <td style={td}>{row.joseKg}</td>
                  <td style={td}>{row.familyMoney}</td>
                  <td style={td}>{row.joseMoney}</td>
                  <td style={td}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: ".7rem", marginTop: ".8rem" }}>
        <article style={box}>
          <span className="cortijoPill">[C]</span>
          <h4 style={{ margin: ".55rem 0 .35rem" }}>Ce que les chiffres montrent déjà</h4>
          <ul style={{ margin: ".35rem 0 0", paddingLeft: "1.15rem", lineHeight: 1.52 }}>
            <li>L’ancien système montre une forte alternance : années hautes et années basses se succèdent.</li>
            <li>2019/20 atteint environ <strong>35,73 t</strong> reconstituées : la finca était encore capable d’une très grosse récolte.</li>
            <li>2021/22 atteint encore environ <strong>25,74 t</strong>.</li>
            <li>2022/23 tombe à environ <strong>4,56 t</strong> et coïncide avec un contexte de sécheresse régionale très sévère : cette année ne doit pas être utilisée seule pour juger la gestion.</li>
            <li>La rupture analytique utile est <strong>2023/24</strong>, quand on passe progressivement du 15/85 aux prestations facturées.</li>
          </ul>
        </article>

        <article style={box}>
          <span className="cortijoPill">[H]</span>
          <h4 style={{ margin: ".55rem 0 .35rem" }}>Hypothèse à tester après le non-renouvellement</h4>
          <p style={{ margin: ".3rem 0", lineHeight: 1.5 }}>
            La famille envisage l’hypothèse qu’après le refus de renouveler le contrat, José ait pu avoir intérêt à ce que la finca paraisse moins productive. <strong>Ce n’est pas une conclusion ni une accusation.</strong>
          </p>
          <p style={{ margin: ".3rem 0", lineHeight: 1.5 }}>
            Pour la tester : comparer fruits présents, quantité ramassée, quantité livrée, olives laissées au sol, dates et durée de récolte, taille, traitements, travaux réellement exécutés, factures et tickets de coopérative avant/après 2023/24.
          </p>
        </article>

        <article style={box}>
          <span className="cortijoPill">À FERMER</span>
          <h4 style={{ margin: ".55rem 0 .35rem" }}>Ce qui manque pour un vrai total économique 2007 → 2026</h4>
          <ul style={{ margin: ".35rem 0 0", paddingLeft: "1.15rem", lineHeight: 1.52 }}>
            <li>Liquidations San Juan finales des campagnes financières incomplètes.</li>
            <li>Valeur annuelle des céréales / terres arables sous les deux baux.</li>
            <li>Montants PAC/subventions année par année et leur bénéficiaire réel.</li>
            <li>Date exacte de fin pratique du 15 % autour de 2023/24.</li>
            <li>Liquidation complète 2024/25 et tous les tickets 2025/26.</li>
            <li>Détail des factures Vitines et suppression des éventuels doublons.</li>
          </ul>
        </article>
      </div>

      <p style={{ margin: ".8rem .1rem 0", fontSize: ".82rem", opacity: .8, lineHeight: 1.45 }}>
        Légende : [P] documenté · [D] déclaré par la famille · [C] calculé/reconstitué · [H] hypothèse. Les équivalents 85 % sont des recettes brutes théoriques avant charges d’exploitation ; ils ne doivent jamais être présentés comme le bénéfice personnel de José.
      </p>
    </section>
  );
}

function Checklist() {
  return (
    <details
      style={{
        border: "1px solid rgba(214,169,85,.28)",
        borderRadius: "14px",
        background: "rgba(0,0,0,.14)",
        overflow: "hidden",
        marginTop: ".8rem"
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ".8rem",
          padding: ".8rem .9rem",
          cursor: "pointer",
          listStyle: "none"
        }}
      >
        <div>
          <strong style={{ display: "block" }}>Checklist documentaire 2007 → 2026</strong>
          <small style={{ opacity: .82 }}>ON A · IL MANQUE · À DEMANDER À QUI</small>
        </div>
        <span style={{ whiteSpace: "nowrap", fontSize: ".78rem" }}>20 périodes</span>
      </summary>

      <div style={{ padding: "0 .8rem .8rem" }}>
        <p style={{ margin: ".2rem 0 .7rem", fontSize: ".9rem", lineHeight: 1.45 }}>
          Les nouveaux relevés San Juan comblent désormais les kilos 2018/19 à 2023/24. Ce qui reste à demander porte surtout sur les vales détaillés, les liquidations finales et les exercices fiscaux manquants. Les périodes sont classées de la plus récente à la plus ancienne.
        </p>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "980px", borderCollapse: "collapse", fontSize: ".9rem", lineHeight: 1.42 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: ".55rem", width: "10rem" }}>Période</th>
                <th style={{ textAlign: "left", padding: ".55rem" }}>ON A</th>
                <th style={{ textAlign: "left", padding: ".55rem" }}>IL MANQUE</th>
                <th style={{ textAlign: "left", padding: ".55rem", width: "15rem" }}>À DEMANDER À QUI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.period} style={{ borderTop: "1px solid rgba(214,169,85,.14)" }}>
                  <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}>
                    <strong>{row.period}</strong>
                    <small style={{ display: "block", marginTop: ".2rem", opacity: .78 }}>{row.level}</small>
                  </td>
                  <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}>{row.have}</td>
                  <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}>{row.missing}</td>
                  <td style={{ verticalAlign: "top", padding: ".62rem .55rem" }}>
                    <div>{row.ask.join(" · ")}</div>
                    {row.contacts.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", marginTop: ".45rem" }}>
                        {row.contacts.map((id) => (
                          <a
                            key={`${row.period}-${id}`}
                            href={`/?view=cortijo-memoire&contact=${id}`}
                            style={{ fontSize: ".76rem", whiteSpace: "nowrap" }}
                          >
                            Ouvrir {dossierLabels[id]}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

export function FincaDocumentChecklistMount() {
  const [targets, setTargets] = useState({ actions: null, analysis: null });

  useEffect(() => {
    let observer;
    let frame;

    const resolve = () => {
      const actions = findActionsTarget();
      const analysis = findAnalysisTarget();
      if (!actions && !analysis) return;

      setTargets((current) => {
        if (current.actions === actions && current.analysis === analysis) return current;
        return { actions, analysis };
      });

      if (actions && analysis) {
        observer?.disconnect();
        if (frame) window.cancelAnimationFrame(frame);
      }
    };

    resolve();
    frame = window.requestAnimationFrame(resolve);
    observer = new MutationObserver(resolve);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!targets.actions && !targets.analysis) return null;

  return (
    <>
      {targets.analysis && createPortal(<EconomicAnalysis />, targets.analysis)}
      {targets.actions && createPortal(<Checklist />, targets.actions)}
    </>
  );
}
