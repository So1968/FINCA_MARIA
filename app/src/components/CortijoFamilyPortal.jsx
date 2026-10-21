const chronology = [
  ["12/02/2007 → 11/02/2013", "Premier bail écrit", "José López Gallego exploite la finca. María reçoit 15 % de la production d'olives ; les frais d'exploitation sont à la charge du fermier selon le contrat."],
  ["12/03/2014 → 11/03/2020", "Deuxième bail écrit", "Le même fonctionnement est reconduit. María décède en avril 2019 ; le bail se poursuit avec les héritiers jusqu'à son terme."],
  ["2019", "Transition après le décès de María", "Les démarches agricoles continuent avec ASAJA, San Juan et Peláez pendant que les héritiers reprennent progressivement les sujets administratifs."],
  ["11/03/2020 → environ 2023/24", "Attente et renégociation d'un nouveau contrat", "Après la fin du bail, José continue à intervenir dans l'attente d'une éventuelle reconduction. Les échanges portent sur la renégociation, mais aucun nouveau contrat n'est signé."],
  ["Environ 2023/24", "Décision de ne pas reconduire le bail", "La famille indique à José qu'il n'y aura pas de nouveau contrat de fermage et que la finca sera exploitée directement, José intervenant pour les travaux qui lui sont confiés, notamment le labour. La date exacte reste à retrouver dans les échanges."],
  ["2023/24 → aujourd'hui", "Exploitation directe", "La famille reprend directement le pilotage, le paiement et le suivi des travaux, des factures et des campagnes."],
];

const production = [
  ["2014/15", "≈ 10,37 t", "[C] Production totale reconstituée à partir de la part contractuelle de 15 %."],
  ["2015/16", "≈ 25,69 t", "[C] Production totale reconstituée à partir de la part contractuelle de 15 %."],
  ["2016/17", "≈ 11,48 t", "[C] Production totale reconstituée à partir de la part contractuelle de 15 %."],
  ["2017/18", "≈ 26,72 t", "[C] Production totale reconstituée à partir de la part contractuelle de 15 %."],
  ["2018/19", "1 590 kg à qualifier", "[P] Le chiffre apparaît dans une pièce ancienne, mais sa nature exacte reste à confirmer."],
  ["2023/24", "2 294 kg documentés", "[P] Trois vales ; 389,06 kg d'huile ; rendement 16,96 %. Complétude à confirmer."],
  ["2024/25", "6 551 kg documentés", "[P] 1 357,37 kg d'huile ; rendement 20,72 %. Complétude à confirmer."],
  ["2025/26", "18 210 kg — base San Juan", "[P] Les 1er et 2e repartos portent sur la même base : 18 210 kg d'olives, 3 860,64 kg d'huile, rendement 21,20 %. Les kilos des deux repartos ne s'additionnent pas. La liquidation finale reste à retrouver."],
];

const analysis = [
  "L'oliveraie connaissait déjà une forte alternance avant 2020 : les campagnes reconstituées passent d'environ 10 à 26 tonnes d'une année à l'autre. Une année faible n'est donc pas, à elle seule, la preuve d'un problème de gestion.",
  "Les campagnes 2023/24 et 2024/25 retrouvées sont très inférieures aux meilleures campagnes anciennes. En revanche, la base San Juan 2025/26 remonte fortement à 18 210 kg. Avant de parler d'une tendance durable, il faut encore confirmer la complétude des campagnes et obtenir la liquidation finale 2025/26.",
  "La référence cadastrale 2017 fixe 5,6666 ha d'olivier sur 11,4951 ha au total pour les parcelles 25 et 27, soit environ 49,3 % de la surface. Les 11,4951 ha ne doivent donc jamais servir de dénominateur pour calculer un rendement oléicole. La PAC 2024 confirme en outre la coexistence d'OLIVO HOJIBLANCA et de TRITICALE ; le détail PAC 2026 reste à récupérer.",
  "La rupture de gestion se fait en deux temps : le bail écrit se termine en mars 2020, puis la famille décide vers 2023/24 de ne pas le reconduire et de passer à une exploitation directe avec des travaux confiés à José. Cette distinction est essentielle pour comparer les responsabilités, les coûts et les résultats.",
  "La facture Vitines n°378 du 04/04/2026, 5 445 € TTC, reste insuffisamment ventilée entre récolte d'olives et travail phytosanitaire. Les dates secondaires 22/04, 29/04 et 01/05/2026 sont postérieures à la facture : elles ne peuvent donc pas être rattachées automatiquement à cette facture sans pièce complémentaire.",
  "La note manuscrite Vitines 2024, autour de 2 565 €, et la facture officielle n°336 de 1 518 € TTC ne doivent pas être additionnées tant que leur relation n'est pas démontrée. La note apporte du détail sur fumier, taille, bois, débroussaillage et liquides, mais elle peut décrire tout ou partie d'opérations déjà facturées.",
  "Les terres céréalières doivent être suivies séparément de l'oliveraie : les factures du 03/01/2024 prouvent l'achat de 600 kg d'avoine et 500 kg de triticale, mais pas la récolte, la destination ni l'encaissement. Après la fin du bail en 2020, la base contractuelle et les flux des céréales restent à documenter.",
  "À ce stade, on ne peut pas attribuer les écarts de production à une cause unique. Il faut croiser production réellement livrée, surface d'oliviers, travaux, traitements, état des arbres, climat et coûts avant de conclure."
];

const strategy = [
  "San Juan : obtenir les vales / tickets qui composent les 18 210 kg de 2025/26, confirmer qu'il s'agit bien du total des apports et récupérer l'éventuel 3e reparto ou la liquidation finale.",
  "Agriculteur / Vitines : obtenir la ventilation de la facture n°378 entre récolte, phytosanitaire, produits, heures et parcelles, sans lui rattacher automatiquement les interventions postérieures au 04/04/2026.",
  "Vitines 2024 : établir si la note manuscrite de 2 565 € détaille, complète ou est indépendante de la facture n°336 de 1 518 € TTC.",
  "Céréales : retrouver la base contractuelle postérieure au 11/03/2020 puis la facture de ramassage, les kilos récoltés, la destination et les éventuelles recettes d'avoine / autres céréales.",
  "Retrouver la date précise de l'échange où la famille indique à José qu'aucun nouveau bail ne sera signé et que l'exploitation passe en direct.",
  "ASAJA / PAC : conserver 5,6666 ha comme référence cadastrale oléicole 2017, utiliser la PAC 2024 comme photographie détaillée distincte et récupérer les pages PAC 2026 pour comparer recintos, cultures et surfaces réellement déclarées en 2026.",
  "Peláez : compléter les déclarations fiscales manquantes et rapprocher les revenus agricoles 2025 déjà documentés."
];

const openPoints = [
  "Pour 2025/26, San Juan confirme-t-il que 18 210 kg est bien le total des apports de la campagne et existe-t-il un 3e reparto ou une liquidation finale ?",
  "Quelle est la date exacte à laquelle la famille a indiqué à José qu'aucun nouveau bail ne serait conclu ?",
  "La PAC 2026 déclare-t-elle toujours une surface oléicole et des recintos cohérents avec la référence cadastrale 2017 de 5,6666 ha et avec la PAC 2024 ?",
  "Comment se répartissent exactement les 5 445 € de la facture Vitines n°378 et quelles interventions relèvent réellement de cette facture ?",
  "La note manuscrite Vitines 2024 à 2 565 € correspond-elle en tout ou partie à la facture n°336 de 1 518 € TTC ?",
  "Quelle pièce organise l'exploitation des terres arables après mars 2020, et où sont les preuves de récolte, destination et recettes des céréales ?",
  "Quelles archives fiscales et agricoles Peláez conserve-t-il encore ?"
];

export function CortijoFamilyPortal() {
  return (
    <main className="cortijoExportApp">
      <section className="cortijoExportHero">
        <div>
          <span className="cortijoExportEyebrow">FINCA MARIA</span>
          <h1>SYNTHÈSE DE L'EXPLOITATION</h1>
          <p>Historique de gestion, production, analyse et stratégie à partir des pièces réunies à ce jour.</p>
          <div className="cortijoExportBadges"><span>[P] Prouvé</span><span>[D] Déclaré</span><span>[C] Calculé</span><span>[H] Hypothèse</span></div>
        </div>
      </section>

      <details className="cortijoView">
        <summary className="cortijoPanelTitle"><span>01</span><div><h3>Historique de gestion</h3><p>Les grandes phases qui permettent de comprendre comment la finca a été exploitée.</p></div><small className="cortijoSummaryBadge">6 étapes</small></summary>
        <div className="cortijoWorkflow"><ol>{chronology.map(([period, title, text]) => <li key={`${period}-${title}`}><strong>{period}</strong><span><b>{title}</b><br />{text}</span></li>)}</ol></div>
      </details>

      <details className="cortijoView">
        <summary className="cortijoPanelTitle"><span>02</span><div><h3>Repères de production</h3><p>Les chiffres connus ou reconstitués, avec leur niveau de preuve.</p></div><small className="cortijoSummaryBadge">8 campagnes</small></summary>
        <div className="cortijoColumns">{production.map(([campaign, value, detail]) => <article className="cortijoCard" key={campaign}><div className="cortijoCardTop"><small>{campaign}</small></div><h4>{value}</h4><p>{detail}</p></article>)}</div>
      </details>

      <details className="cortijoView">
        <summary className="cortijoPanelTitle"><span>03</span><div><h3>Analyse de l'exploitation</h3><p>Ce que l'ensemble des éléments permet de comprendre aujourd'hui.</p></div><small className="cortijoSummaryBadge">8 constats</small></summary>
        <div className="cortijoList">{analysis.map((item) => <article className="cortijoCard" key={item}><p>{item}</p></article>)}</div>
      </details>

      <details className="cortijoView">
        <summary className="cortijoPanelTitle"><span>04</span><div><h3>Stratégie</h3><p>Les contrôles à mener avant de tirer une conclusion sur la gestion de l'exploitation.</p></div><small className="cortijoSummaryBadge">7 étapes</small></summary>
        <div className="cortijoWorkflow"><ol>{strategy.map((item, index) => <li key={item}><strong>{index + 1}</strong><span>{item}</span></li>)}</ol></div>
      </details>

      <details className="cortijoView">
        <summary className="cortijoPanelTitle"><span>05</span><div><h3>Points encore ouverts</h3><p>Uniquement ce qui manque encore pour consolider l'analyse.</p></div><small className="cortijoSummaryBadge">7 points</small></summary>
        <div className="cortijoList">{openPoints.map((item) => <article className="cortijoCard" key={item}><p>{item}</p></article>)}</div>
      </details>

      <section className="cortijoExportRule">
        <div><strong>Retour</strong><p>Revenir à la situation générale, aux dossiers ou à la Maison.</p></div>
        <div><a href="/">FINCA MARIA</a><a href="/?view=cortijo-memoire&contact=san-juan">Historiques et actions</a><a href="/?view=cortijo-maison">Maison</a></div>
      </section>
    </main>
  );
}
