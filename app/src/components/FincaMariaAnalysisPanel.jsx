import { useEffect, useState } from "react";

const FAMILY_CHECK_STORAGE_KEY = "finca_maria_family_checks_v42_20260818";

const proofLegend = [
  ["[P] Prouvé", "Une pièce ou une confirmation documentaire établit le fait."],
  ["[D] Déclaré", "Une personne le rapporte ; on conserve le témoignage sans le transformer en preuve."],
  ["[C] Calculé", "Le chiffre est reconstitué à partir de données documentées ; la formule reste visible."],
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
    title: "Les campagnes 2014/15 à 2017/18 montrent déjà une forte alternance",
    text: "À partir des parts de 15 % documentées, les productions totales reconstituées sont d'environ 10,37 t ; 25,69 t ; 11,48 t ; 26,72 t. Une forte variation d'une campagne à l'autre existait donc avant la période récente.",
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
    title: "2025/26 : 7 943 kg récoltés sont distincts des 6 541 kg signalés comme restant au sol",
    text: "Un premier ramassage de 7 943 kg est documenté dans le dossier, associé au reçu / ticket nº 6139 du 23/03/2026, parcela 27 recinto 3. Un compte rendu familial précise ensuite que 6 541 kg restaient à ramasser au sol. Ces 6 541 kg ne doivent donc pas être présentés comme un second apport coopérative ni additionnés automatiquement aux 7 943 kg comme olives livrées. Le total officiel de campagne reste à demander à San Juan.",
  },
  {
    status: "[P]",
    title: "La PAC 2026 est déjà documentée",
    text: "La déclaration ASAJA Málaga datée du 12/03/2026 est dans le corpus et les comptes rendus familiaux 2026 indiquent que la demande de subvention a été faite par ASAJA via / à la Coopérative San Juan. La question 'la PAC a-t-elle été faite ?' est fermée. Il faut maintenant extraire titulaire, parcelles, recintos, surfaces, cultures, références et compte de versement.",
  },
  {
    status: "[P]",
    title: "La facture Vitines n°378 existe et ses grands postes sont connus",
    text: "La facture du 04/04/2026 s'élève à 5 445 € TTC. Les comptes rendus familiaux indiquent : 1 tratamiento foliar, 1 cuba de 3 000 litros, 8 horas de desbrozar et 2 cubas liquido al suelo. Ils indiquent aussi deux règlements : 2 500 € le 05/05/2026 et 2 945 € le 10/05/2026. Ce qu'il faut encore obtenir est le détail des produits, doses, parcelles et la ventilation du prix.",
  },
  {
    status: "[P]",
    title: "La surface cadastrale totale ne doit pas être confondue avec la surface d'oliviers",
    text: "Le repère de 11,4951 ha concerne la superficie cadastrale totale. Il ne peut pas servir tel quel à calculer un rendement kg/ha de l'oliveraie. Il faut d'abord ventiler oliviers, céréales / tierra de calma et autres usages à partir de PAC / SIGPAC.",
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
    text: "Une question ne reste ouverte que si les documents déjà reçus ne permettent pas d'y répondre. À chaque nouvel import, FINCA MARIA doit rapprocher le document des questions existantes et proposer de fermer ou reformuler celles qui deviennent obsolètes.",
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
  "Le chiffre de 6 541 kg mentionné comme olives restant au sol a-t-il ensuite donné lieu à un ramassage et à un ticket San Juan identifiable ?",
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
          <h3>Analyse consolidée après relecture documentaire</h3>
          <p>FINCA MARIA V42 — état du 18/08/2026. Les anciennes questions déjà résolues ont été retirées.</p>
        </div>
      </div>

      <section className="cortijoFocusPanel">
        <div>
          <span className="cortijoEyebrow">Conclusion provisoire</span>
          <h3>Le dossier est plus avancé qu'il n'y paraissait : plusieurs inconnues étaient déjà résolues par les pièces.</h3>
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
          <span className="cortijoEyebrow">Méthodologie V42</span>
          <h3>Lire, rapprocher, fermer les fausses questions, puis seulement enquêter</h3>
          <p>Le logiciel doit appliquer cette logique automatiquement au fur et à mesure que le BAÚL reçoit de nouvelles pièces.</p>
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
