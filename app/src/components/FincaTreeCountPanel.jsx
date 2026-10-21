const TREE_COUNT = {
  countedOn: "22/08/2026",
  imageryDate: "21/04/2023",
  parcels: [
    {
      id: "25",
      visibleTrees: 94,
      excluded: 2,
      excludedDetail: "2 frênes identifiés sur le terrain et signalés en rouge",
      oliveTrees: 92
    },
    {
      id: "27",
      visibleTrees: 186,
      excluded: 0,
      excludedDetail: "aucun arbre non-olivier signalé dans le comptage actuel",
      oliveTrees: 186
    }
  ],
  totalOliveTrees: 278
};

const COUNTING_STEPS = [
  {
    title: "1. Travailler parcelle par parcelle",
    text: "Le comptage est fait sur les vues zoomées, séparément pour la parcelle 25 puis pour la parcelle 27. Le contour jaune sert de limite de travail. Une vue générale ne sert qu'à se repérer, pas à fixer le total."
  },
  {
    title: "2. Repérer chaque couronne visible",
    text: "Chaque arbre est recherché individuellement dans le polygone. Le traitement d'image peut aider à repérer des couronnes candidates, mais le nombre final vient d'une vérification visuelle arbre par arbre, et non d'un calcul automatique de densité."
  },
  {
    title: "3. Contrôler les limites",
    text: "Les arbres situés hors du contour jaune ne sont pas comptés. Les arbres de bord sont contrôlés pour éviter de compter une couronne extérieure ou de compter deux fois le même arbre. Une zone réellement ambiguë doit être signalée au lieu d'être tranchée au hasard."
  },
  {
    title: "4. Utiliser la connaissance du terrain",
    text: "Les corrections données par la famille priment sur l'interprétation de l'image. Un repère rouge signifie : arbre connu, mais à exclure des oliviers. Sur la parcelle 25, les deux grosses couronnes signalées sont des frênes : elles sont donc retirées du total."
  },
  {
    title: "5. Faire un passage de contrôle",
    text: "Le résultat est revu par zones pour rechercher les oublis, doublons et arbres masqués par les limites, textes ou repères de la carte. Une deuxième vue de moins bonne qualité peut servir à lever un doute, mais jamais à ajouter une deuxième fois les mêmes arbres."
  },
  {
    title: "6. Conserver la nature du chiffre",
    text: "278 est un comptage visuel sur imagerie, pas un chiffre cadastral et pas une estimation de densité. Il pourra être confirmé ou corrigé par un inventaire de terrain ou une imagerie plus précise. Aucune marge numérique d'erreur n'est inventée tant que les cas ambigus n'ont pas été identifiés un par un."
  }
];

const REJECTED_REFERENCES = [
  "≈ 180 : ancien chiffre familial / estimation, pas un comptage visuel indépendant.",
  "327 : premier comptage grossier sur la vue générale, remplacé par le travail sur vues zoomées.",
  "16 arbres repères (8 en parcelle 25 + 8 en parcelle 27) : échantillon de surveillance, pas le nombre total d'oliviers."
];

function ParcelCountCard({ parcel }) {
  return (
    <article className="fincaTreeCountParcel">
      <div className="fincaTreeCountParcelHead">
        <span>Parcelle</span>
        <strong>{parcel.id}</strong>
      </div>
      <div className="fincaTreeCountNumbers">
        <div><strong>{parcel.visibleTrees}</strong><span>arbres visibles</span></div>
        <div><strong>− {parcel.excluded}</strong><span>exclus</span></div>
        <div className="isResult"><strong>{parcel.oliveTrees}</strong><span>oliviers retenus</span></div>
      </div>
      <p>{parcel.excludedDetail}</p>
    </article>
  );
}

export function FincaTreeCountPanel() {
  return (
    <section className="fincaTreeCountPanel" aria-label="Méthode de comptage des oliviers">
      <style>{`
        .fincaTreeCountPanel{display:grid;gap:1rem}.fincaTreeCountHero{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;padding:1.05rem 1.1rem;border:1px solid rgba(214,169,85,.24);border-radius:20px;background:linear-gradient(145deg,rgba(16,24,19,.9),rgba(5,9,7,.75))}.fincaTreeCountHero h3{margin:.15rem 0;color:#fff3d4;font-family:Georgia,'Times New Roman',serif;font-size:1.45rem}.fincaTreeCountHero p{margin:.3rem 0 0;color:#d7c39b;line-height:1.5}.fincaTreeCountTotal{min-width:150px;text-align:center;padding:.8rem 1rem;border-radius:18px;background:rgba(239,217,157,.1);border:1px solid rgba(239,217,157,.24)}.fincaTreeCountTotal strong{display:block;color:#fff3d4;font-size:2.2rem}.fincaTreeCountTotal span{display:block;color:#cdb98d;font-size:.78rem}.fincaTreeCountParcels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.fincaTreeCountParcel{border:1px solid rgba(214,169,85,.2);border-radius:18px;padding:1rem;background:rgba(5,9,7,.5)}.fincaTreeCountParcelHead{display:flex;align-items:center;justify-content:space-between;color:#cdb98d}.fincaTreeCountParcelHead strong{font-size:1.5rem;color:#fff3d4}.fincaTreeCountNumbers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem;margin:.8rem 0}.fincaTreeCountNumbers div{padding:.55rem;border-radius:12px;background:rgba(255,255,255,.035)}.fincaTreeCountNumbers strong{display:block;color:#efd99d;font-size:1.35rem}.fincaTreeCountNumbers span{display:block;margin-top:.12rem;color:#bfae88;font-size:.72rem}.fincaTreeCountNumbers .isResult{background:rgba(239,217,157,.1)}.fincaTreeCountParcel p{margin:.45rem 0 0;color:#d7c39b;font-size:.86rem}.fincaTreeCountMethod{border:1px solid rgba(214,169,85,.2);border-radius:18px;padding:1rem 1.05rem;background:rgba(5,9,7,.42)}.fincaTreeCountMethod h4,.fincaTreeCountAudit h4{margin:.05rem 0 .7rem;color:#fff3d4}.fincaTreeCountMethod ol{display:grid;gap:.65rem;margin:0;padding-left:1.35rem}.fincaTreeCountMethod li{color:#efd99d}.fincaTreeCountMethod li strong{display:block;color:#fff3d4}.fincaTreeCountMethod li span{display:block;margin-top:.12rem;color:#d7c39b;line-height:1.45}.fincaTreeCountAudit{border:1px solid rgba(214,169,85,.18);border-radius:18px;padding:1rem 1.05rem;background:rgba(0,0,0,.16)}.fincaTreeCountAudit ul{margin:.4rem 0 0;padding-left:1.2rem;color:#d7c39b}.fincaTreeCountAudit li+li{margin-top:.38rem}.fincaTreeCountMeta{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem}.fincaTreeCountMeta span{padding:.32rem .55rem;border:1px solid rgba(214,169,85,.2);border-radius:999px;color:#cdb98d;font-size:.75rem}@media(max-width:760px){.fincaTreeCountHero{align-items:stretch;flex-direction:column}.fincaTreeCountTotal{min-width:0}.fincaTreeCountParcels{grid-template-columns:1fr}.fincaTreeCountNumbers{grid-template-columns:1fr 1fr 1fr}}
      `}</style>

      <div className="fincaTreeCountHero">
        <div>
          <span className="cortijoPill">Comptage visuel indépendant</span>
          <h3>Comment les oliviers ont été comptés</h3>
          <p>Le chiffre est traçable : source, exclusions, contrôles et chiffres remplacés restent visibles au même endroit.</p>
          <div className="fincaTreeCountMeta">
            <span>Comptage : {TREE_COUNT.countedOn}</span>
            <span>Imagerie affichée : {TREE_COUNT.imageryDate}</span>
            <span>Polygone 185 · parcelles 25 et 27</span>
          </div>
        </div>
        <div className="fincaTreeCountTotal">
          <strong>{TREE_COUNT.totalOliveTrees}</strong>
          <span>oliviers retenus actuellement</span>
        </div>
      </div>

      <div className="fincaTreeCountParcels">
        {TREE_COUNT.parcels.map((parcel) => <ParcelCountCard key={parcel.id} parcel={parcel} />)}
      </div>

      <div className="fincaTreeCountMethod">
        <h4>Méthode utilisée</h4>
        <ol>
          {COUNTING_STEPS.map((step) => (
            <li key={step.title}><strong>{step.title}</strong><span>{step.text}</span></li>
          ))}
        </ol>
      </div>

      <div className="fincaTreeCountAudit">
        <h4>Ce qui ne doit pas être confondu avec ce comptage</h4>
        <ul>{REJECTED_REFERENCES.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
