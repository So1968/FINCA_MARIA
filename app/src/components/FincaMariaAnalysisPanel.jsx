import { useEffect, useState } from "react";

const FAMILY_CHECK_STORAGE_KEY = "finca_maria_family_checks_v42_20260818";

const proofLegend = [
  ["[P] Documenté", "Une pièce est référencée dans le dossier pour ce fait précis ; sa portée et sa complétude restent à contrôler."],
  ["[D] Déclaré", "Une personne le rapporte ; on conserve le témoignage sans le transformer en preuve."],
  ["[CR] Compte rendu", "Un compte rendu familial rapporte le fait ; ce n'est pas un justificatif d'exécution ou de paiement."],
  ["[C] Calculé", "La formule et ses hypothèses restent visibles. Un calcul conditionnel n'est pas un total certifié."],
  ["[H] Hypothèse", "C'est une piste de travail qui doit encore être vérifiée."],
];

const currentFindings = [
  {
    status: "[P]",
    title: "Deux baux écrits encadrent l'exploitation jusqu'en mars 2020",
    text: "Les contrats de 2007–2013 puis 2014–2020 prévoient que María reçoit 15 % de la production d'olives et que les frais d'exploitation sont à la charge du fermier. Après le décès de María en avril 2019, les héritiers poursuivent jusqu'au terme du second bail.",
  },
  {
    status: "[C]",
    title: "Les reconstructions anciennes dépendent de l'hypothèse des 15 %",
    text: "Les scénarios 2014/15 à 2017/18 donnent environ 10,37 t ; 25,69 t ; 11,48 t ; 26,72 t, uniquement si les kilos familiaux représentent exactement 15 % de tous les apports. La base 2015/16 présente notamment un groupe de 9 064 kg non résolu. Ces calculs ne sont pas des totaux officiels et ne prouvent pas à eux seuls une alternance agronomique.",
  },
  {
    status: "[P]",
    title: "2023/24 est documentée par trois vales et une liquidation",
    text: "Trois vales totalisent 2 294 kg : 217 + 1 562 + 515 kg. Les pièces de liquidation indiquent 389,06 kg d'huile et un rendement de 16,96 %. Il reste à faire confirmer par San Juan que ces trois vales couvrent bien toute la campagne.",
  },
  {
    status: "[P]",
    title: "2024/25 est documentée à 6 551 kg avec liquidation finale",
    text: "Les documents retrouvés indiquent 6 551 kg d'olives, 1 357,37 kg d'huile et un rendement de 20,72 %, avec une liquidation finale. La seule réserve encore utile est la confirmation par San Juan que tous les apports de la campagne sont bien inclus.",
  },
  {
    status: "[P/D]",
    title: "2025/26 : deux repartos utilisent la même base de 18 210 kg",
    text: "La synthèse mise à jour le 13/09/2026 référence les reçus n°1062 du 20/05 et n°1769 du 15/07 : 18 210 kg d'olives, 3 860,64 kg d'huile, rendement de 21,20 %. Ne pas additionner deux fois ces kilos. Les 7 943 kg rapportés par la famille, les 6 541 kg de nature discutée et la référence 6139 restent à rapprocher des originaux. La complétude des apports et l'éventuelle liquidation finale ne sont pas confirmées.",
  },
  {
    status: "[P]",
    title: "La PAC 2026 est déjà documentée",
    text: "La déclaration ASAJA Málaga du 12/03/2026 est référencée et les comptes rendus familiaux rapportent une démarche ASAJA via la Coopérative San Juan. Les pages détaillées 2026 restent à récupérer pour vérifier titulaire, parcelles, recintos, surfaces, cultures et aides. Une déclaration ne prouve ni l'acceptation ni le versement des aides.",
  },
  {
    status: "[P/CR]",
    title: "La facture Vitines n°378 existe et ses grands postes sont connus",
    text: "La facture du 04/04/2026 s'élève à 5 445 € TTC. Le C.R. familial rapporte un traitement foliaire, une cuve de 3 000 L, huit heures de débroussaillage et deux cuves de liquide au sol, sans dates individuelles confirmées. Il rapporte aussi 2 500 € réglés le 05/05 et 2 945 € le 10/05, dont les preuves bancaires restent à rapprocher. Demander dates réelles, produits, doses, parcelles et ventilation du prix.",
  },
  {
    status: "[P]",
    title: "La surface cadastrale totale ne doit pas être confondue avec la surface d'oliviers",
    text: "Le repère de 11,4951 ha concerne la superficie cadastrale totale. Il ne peut pas servir tel quel à calculer un rendement kg/ha de l'oliveraie. Il faut d'abord ventiler oliviers, céréales / tierra de calma et autres usages à partir de PAC / SIGPAC.",
  },
  {
    status: "[À compléter]",
    title: "Le bénéfice net des oliviers reste inconnu",
    text: "Les recettes et toutes les charges doivent être rapprochées par campagne, sans doubles comptes et avec une même base HT ou TTC. Le solde coopérative de 6 437,10 € mêle plusieurs mouvements ; le résultat fiscal forfaitaire n'est pas une rentabilité réelle. Aucun de ces montants ne constitue le bénéfice net des oliviers.",
  },
  {
    status: "[H]",
    title: "L'écart de production reste à expliquer, pas à attribuer",
    text: "Après confirmation des campagnes et de la surface oléicole, il faudra confronter alternance, climat, taille, entretien, fertilisation, traitements, récolte et circuits d'apport. Aucune responsabilité individuelle ne peut être conclue à ce stade.",
  },
];

const methodSteps = [
  {
    step: "1",
    title: "Lire les pièces avant de créer une question",
    text: "À chaque nouvelle pièce, vérifier les questions existantes et noter celles auxquelles elle répond, avec sa référence et sa portée. Fermer ou reformuler une question après ce contrôle documentaire.",
  },
  {
    step: "2",
    title: "Faire parler San Juan avant de montrer nos chiffres",
    text: "Demander l'historique complet, idéalement 2014/15–2025/26, avec tous les vales, dates, kilos, rendements, huile, liquidations et changements éventuels de titulaire. Ensuite seulement comparer à nos pièces.",
  },
  {
    step: "3",
    title: "Séparer récolte, apport et total de campagne",
    text: "Une quantité récoltée ou restant au sol n'est pas automatiquement une quantité livrée. Un ticket prouve un apport précis. Le total annuel n'est retenu que lorsque la complétude est documentée.",
  },
  {
    step: "4",
    title: "Exploiter les dossiers déjà présents",
    text: "PAC, factures, liquidations, comptes rendus et archives fiscales doivent être lus à fond avant tout nouvel appel. Le but est de demander uniquement ce qui manque encore : détails techniques, pages manquantes, archives ou confirmation de complétude.",
  },
  {
    step: "5",
    title: "Analyser l'agronomie séparément",
    text: "Les écarts de kilos doivent être comparés au climat, à l'alternance de l'olivier, à la taille, aux traitements, à la nutrition, à l'état des arbres, aux dates de récolte et à la surface réellement oléicole.",
  },
  {
    step: "6",
    title: "Présenter uniquement l'état qualifié",
    text: "À la réunion familiale, montrer ce qui est désormais établi, ce qui est déclaré, ce qui est calculé et les seuls vrais points encore ouverts. Une ancienne question ne doit pas survivre à la preuve qui y répond.",
  },
];

const sisterChecklist = [
  "As-tu des documents San Juan pour les campagnes 2019/20 à 2022/23 qui ne sont pas encore dans le dossier ?",
  "As-tu une copie plus complète du dossier PAC 2026 avec les pages indiquant titulaire, parcelles, recintos et surfaces ?",
  "As-tu des archives ou mails de Peláez contenant des déclarations fiscales ou justificatifs agricoles anciens ?",
  "As-tu le détail de la facture Vitines n°378 : produits, doses, parcelles et ventilation du prix ?",
  "Les originaux confirment-ils la nature des 6 541 kg et leur éventuel rattachement à un ramassage et à un ticket San Juan ?",
  "Y a-t-il une démarche déjà lancée auprès de San Juan, ASAJA, Peláez ou Vitines dont nous attendons encore une réponse ?",
];

function loadChecks() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAMILY_CHECK_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function FincaMariaAnalysisPanel() {
  const [familyChecks, setFamilyChecks] = useState(loadChecks);

  useEffect(() => {
    localStorage.setItem(FAMILY_CHECK_STORAGE_KEY, JSON.stringify(familyChecks));
  }, [familyChecks]);

  function updateCheck(index, field, value) {
    setFamilyChecks((current) => ({
      ...current,
      [index]: {
        answer: "",
        source: "Sœur / famille",
        document: "",
        status: "[D]",
        ...(current[index] || {}),
        [field]: value,
      },
    }));
  }

  function exportChecks() {
    const date = new Date().toISOString().slice(0, 10);
    const rows = sisterChecklist.map((question, index) => ({ question, ...(familyChecks[index] || {}) }));
    downloadJson(`FINCA_MARIA_RECOUPEMENT_FAMILLE_${date}.json`, {
      project: "FINCA MARIA",
      version: "V42",
      exportedAt: new Date().toISOString(),
      rows,
    });
  }

  const answeredCount = sisterChecklist.filter((_, index) => familyChecks[index]?.answer?.trim()).length;

  return (
    <section className="cortijoView" aria-label="Analyse consolidée de l'exploitation">
      <div className="cortijoPanelTitle">
        <span>AN</span>
        <div>
          <h3>Analyse documentaire — faits, calculs et points ouverts</h3>
          <p>Revue des synthèses du dossier le 13/11/2026, incluant les compléments de septembre. Les originaux ne sont pas certifiés par cette revue.</p>
        </div>
      </div>

      <section className="cortijoFocusPanel">
        <div>
          <span className="cortijoEyebrow">Conclusion provisoire</span>
          <h3>Les pièces référencées, les témoignages et les calculs doivent rester distincts.</h3>
        </div>
        <p>
          Le travail prioritaire n'est plus de redemander si la PAC existe, si la facture Vitines existe ou quel était le rôle général de Peláez. Il faut maintenant compléter les campagnes San Juan, extraire les détails PAC, ventiler la facture n°378, retrouver les archives fiscales et faire l'analyse agronomique.
        </p>
      </section>

      <div className="cortijoList">
        {currentFindings.map((item) => (
          <article className="cortijoCard" key={item.title}>
            <div className="cortijoCardTop"><span className="cortijoPill">{item.status}</span></div>
            <h4>{item.title}</h4>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <section className="cortijoWorkflow">
        <div>
          <span className="cortijoEyebrow">Méthode de lecture</span>
          <h3>Lire, rapprocher, fermer les fausses questions, puis seulement enquêter</h3>
          <p>Ces étapes décrivent le contrôle documentaire à effectuer lors de l'ajout de pièces au BAÚL.</p>
        </div>
        <ol>
          {methodSteps.map((item) => (
            <li key={item.step}><strong>{item.step}. {item.title}</strong><span>{item.text}</span></li>
          ))}
        </ol>
      </section>

      <section className="cortijoPanel">
        <div className="cortijoPanelTitle">
          <span>FR</span>
          <div>
            <h3>Recoupement familial — uniquement les vrais manques</h3>
            <p>{answeredCount}/{sisterChecklist.length} points renseignés. Les anciennes questions déjà résolues ne sont plus proposées.</p>
          </div>
        </div>
        <button type="button" className="cortijoPrimaryButton" onClick={exportChecks}>Sauvegarder / exporter ce recoupement</button>
        <div className="cortijoList">
          {sisterChecklist.map((question, index) => {
            const entry = familyChecks[index] || {};
            return (
              <article className="cortijoCard" key={question}>
                <h4>{question}</h4>
                <label>Réponse obtenue<textarea rows="3" value={entry.answer || ""} onChange={(event) => updateCheck(index, "answer", event.target.value)} placeholder="Noter la réponse le plus fidèlement possible…" /></label>
                <div className="actionFormRow">
                  <label>Qualification<select value={entry.status || "[D]"} onChange={(event) => updateCheck(index, "status", event.target.value)}><option>[D]</option><option>[P]</option><option>[C]</option><option>[H]</option></select></label>
                  <label>Source / personne<input value={entry.source || ""} onChange={(event) => updateCheck(index, "source", event.target.value)} placeholder="Nom de la personne" /></label>
                </div>
                <label>Document ou piste associée<input value={entry.document || ""} onChange={(event) => updateCheck(index, "document", event.target.value)} placeholder="Ex. mail, ticket, facture, aucune pièce…" /></label>
              </article>
            );
          })}
        </div>
      </section>

      <section className="cortijoPanel">
        <div className="cortijoPanelTitle"><span>→</span><div><h3>Enchaînement utile maintenant</h3><p>On ne recommence pas ce qui est déjà documenté.</p></div></div>
        <div className="cortijoColumns">
          <article className="cortijoCard"><h4>Avant San Juan</h4><p>Finir la lecture des pièces et noter uniquement les campagnes / pages réellement manquantes.</p></article>
          <article className="cortijoCard"><h4>San Juan</h4><p>Faire sortir l'historique officiel puis confronter 2018/19, 2023/24, 2024/25 et 2025/26.</p></article>
          <article className="cortijoCard"><h4>Vitines / ASAJA / Peláez</h4><p>Demander seulement les détails qui manquent encore : ventilation, produits, surfaces, archives.</p></article>
          <article className="cortijoCard"><h4>Réunion famille</h4><p>Présenter les faits consolidés, les vrais manques et les décisions à prendre.</p></article>
        </div>
      </section>

      <section className="cortijoPanel">
        <div className="cortijoPanelTitle"><span>P</span><div><h3>Règle de preuve utilisée dans tout FINCA MARIA</h3></div></div>
        <div className="cortijoColumns">
          {proofLegend.map(([label, text]) => <article className="cortijoCard" key={label}><h4>{label}</h4><p>{text}</p></article>)}
        </div>
      </section>
    </section>
  );
}
