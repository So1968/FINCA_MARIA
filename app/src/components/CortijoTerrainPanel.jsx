import { useEffect, useState } from "react";
import { cortijoOliveReference, cortijoTerrainHistory } from "../data/cortijoTerrainHistory";

const MISSION_STORAGE_KEY = "cortijo_terrain_mission_2026_08";
const TREES_STORAGE_KEY = "cortijo_terrain_olive_markers_v2_30";
const TREE_SAMPLE_TARGET = 30;
const EXISTING_TREE_PHOTOS_TO_LINK = 5;

const timeline = [
  {
    period: "Printemps 2026",
    label: "Référence à retrouver",
    detail: "Anciennes vidéos / photos et conclusion déjà faite à retrouver pour constituer le point zéro.",
    status: "À relier"
  },
  {
    period: "15 août 2026",
    label: "État visuel enregistré",
    detail: "Vidéo panorama conservée comme première référence certaine de l'état actuel des oliviers.",
    status: "En mémoire"
  },
  {
    period: "Début octobre 2026",
    label: "Comparaison possible",
    detail: "Refaire les mêmes arbres repères et, si possible, organiser une visite technique.",
    status: "À prévoir"
  },
  {
    period: "Avril–mai 2027",
    label: "Diagnostic expert",
    detail: "Comparer printemps → août → automne → nouveau printemps avec l'avis du technicien.",
    status: "Cible"
  }
];

const missionItems = [
  {
    id: "oliviers",
    title: "Constituer les 30 oliviers témoins",
    detail: "Créer progressivement O01 → O30. Cinq arbres ont déjà été photographiés : les rattacher au registre seulement quand leur identité terrain est certaine."
  },
  {
    id: "limite-l01",
    title: "Fixer le point L01",
    detail: "Relever le GPS du passage de tracteurs et filmer amont → passage → aval."
  },
  {
    id: "panorama",
    title: "Faire un panorama de la finca",
    detail: "Une séquence lente et large pour garder l'état général du terrain en août."
  }
];

const treeProtocol = [
  "30 oliviers témoins répartis dans plusieurs zones et plusieurs états.",
  "Toujours filmer : arbre entier → tour de couronne → tronc → feuilles → olives → sol.",
  "Une photo fixe de l'arbre entier et une photo du tronc pour pouvoir le reconnaître sans étiquette.",
  "Numéro O01, O02… + position GPS + particularité visuelle du tronc.",
  "Même point de vue à chaque visite pour rendre la comparaison possible."
];

const boundaryChecklist = [
  "Point GPS exact du passage de tracteurs.",
  "Photo / vidéo de l'amont, du passage et de l'aval dans une seule séquence.",
  "Vue de profil du passage : remblai, buse, pierres, différence de hauteur.",
  "Comparer le tracé actuel avec les limites cadastrales et la couche Hidrografía.",
  "Chercher une vue aérienne ancienne avant l'aménagement du passage."
];

const initialTrees = Array.from({ length: TREE_SAMPLE_TARGET }, (_, index) => ({
  id: `O${String(index + 1).padStart(2, "0")}`,
  state: "À choisir"
}));

function loadLocal(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function StateTag({ children }) {
  return <span className="terrainStateTag">{children}</span>;
}

export function CortijoTerrainPanel() {
  const latestOliveState = cortijoTerrainHistory.find((entry) => entry.title.includes("oliviers") && entry.type === "Terrain");
  const boundaryState = cortijoTerrainHistory.find((entry) => entry.title.includes("Limite entre parcelles"));
  const mappingState = cortijoTerrainHistory.find((entry) => entry.type === "Cartographie");
  const [missionDone, setMissionDone] = useState(() => loadLocal(MISSION_STORAGE_KEY, []));
  const [trees, setTrees] = useState(() => loadLocal(TREES_STORAGE_KEY, initialTrees));

  useEffect(() => {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(missionDone));
  }, [missionDone]);

  useEffect(() => {
    localStorage.setItem(TREES_STORAGE_KEY, JSON.stringify(trees));
  }, [trees]);

  const missionProgress = missionItems.filter((item) => missionDone.includes(item.id)).length;
  const filmedTrees = trees.filter((tree) => tree.state === "Filmé").length;
  const locatedTrees = trees.filter((tree) => tree.state !== "À choisir").length;

  function toggleMission(id) {
    setMissionDone((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  }

  function cycleTreeState(id) {
    const nextState = {
      "À choisir": "Repéré",
      "Repéré": "Filmé",
      "Filmé": "À choisir"
    };

    setTrees((current) => current.map((tree) => (
      tree.id === id ? { ...tree, state: nextState[tree.state] || "À choisir" } : tree
    )));
  }

  return (
    <div className="terrainView">
      <section className="terrainHero">
        <div>
          <span className="cortijoEyebrow">Terrain</span>
          <h3>Voir la finca, puis comprendre son évolution</h3>
          <p>
            Ici, on garde les repères physiques : oliviers, sol, eau, limites, photos, vidéos et comparaisons dans le temps.
          </p>
        </div>
        <a className="terrainMemoryLink" href="/?view=cortijo-memoire">Ouvrir toute la mémoire</a>
      </section>

      <section className="terrainSimplePanel">
        <div className="terrainSectionHeading compact">
          <span>00</span>
          <div>
            <h3>Base de travail de l'oliveraie</h3>
            <p>{cortijoOliveReference.method} — imagerie du {cortijoOliveReference.date}.</p>
          </div>
        </div>
        <div className="terrainParcelGrid">
          <div><span>Parcelle 25</span><strong>{cortijoOliveReference.parcel25.olives}</strong><small>oliviers retenus</small></div>
          <div><span>Parcelle 27</span><strong>{cortijoOliveReference.parcel27.olives}</strong><small>oliviers retenus</small></div>
          <div><span>Total de travail</span><strong>{cortijoOliveReference.totalOlives}</strong><small>oliviers</small></div>
        </div>
        <div className="terrainCallout muted">
          <strong>Comment lire ce chiffre</strong>
          <span>Parcelle 25 : {cortijoOliveReference.parcel25.visibleTrees} arbres visibles, dont {cortijoOliveReference.parcel25.excludedOtherTrees} identifiés comme frênes, soit {cortijoOliveReference.parcel25.olives} oliviers retenus. Parcelle 27 : {cortijoOliveReference.parcel27.olives} oliviers. {cortijoOliveReference.status}.</span>
        </div>

        <div className="terrainSectionHeading compact" style={{ marginTop: "1rem" }}>
          <span>S</span>
          <div>
            <h3>Surfaces agricoles — référence cadastrale 2017</h3>
            <p>Distinguer la surface totale de la surface réellement oléicole.</p>
          </div>
        </div>
        <div className="terrainParcelGrid">
          <div><span>Oliviers</span><strong>{cortijoOliveReference.cadastralOliveArea}</strong><small>{cortijoOliveReference.cadastralOliveShare} du total cadastral</small></div>
          <div><span>Terres labourables</span><strong>{cortijoOliveReference.cadastralArableArea}</strong><small>parcelles 25 + 27</small></div>
          <div><span>Surface totale</span><strong>{cortijoOliveReference.cadastralTotalArea}</strong><small>olivier + labour + pâture</small></div>
        </div>
        <div className="terrainCallout muted">
          <strong>Par parcelle</strong>
          <span>Parcelle 25 : {cortijoOliveReference.parcel25.cadastralOliveArea} d'olivier + {cortijoOliveReference.parcel25.cadastralArableArea} de labour + {cortijoOliveReference.parcel25.cadastralPastureArea} de pâture = {cortijoOliveReference.parcel25.cadastralTotalArea}. Parcelle 27 : {cortijoOliveReference.parcel27.cadastralOliveArea} d'olivier + {cortijoOliveReference.parcel27.cadastralArableArea} de labour = {cortijoOliveReference.parcel27.cadastralTotalArea}. <strong>Ne jamais utiliser {cortijoOliveReference.cadastralTotalArea} comme surface oléicole.</strong></span>
        </div>
        <div className="terrainCallout">
          <strong>PAC : ce qui est acquis / ce qui manque</strong>
          <span>PAC 2024 ({cortijoOliveReference.pac2024.date}) : {cortijoOliveReference.pac2024.summary} PAC 2026 ({cortijoOliveReference.pac2026.date}) : {cortijoOliveReference.pac2026.summary}</span>
        </div>
      </section>

      <section className="terrainMission">
        <div className="terrainMissionHeader">
          <div>
            <span className="cortijoEyebrow">Prochaine visite terrain</span>
            <h3>La petite mission utile, sans paperasse</h3>
            <p>Trois choses suffisent pour transformer la prochaine visite en vraie référence comparable.</p>
          </div>
          <div className="terrainProgress">
            <strong>{missionProgress}/3</strong>
            <span>faits</span>
          </div>
        </div>

        <div className="terrainMissionGrid">
          {missionItems.map((item) => {
            const isDone = missionDone.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                className={`terrainMissionItem ${isDone ? "isDone" : ""}`}
                onClick={() => toggleMission(item.id)}
              >
                <span className="terrainMissionCheck">{isDone ? "✓" : "○"}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="terrainNow">
        <div className="terrainSectionHeading">
          <span>01</span>
          <div>
            <h3>État actuel des oliviers</h3>
            <p>Dernier repère visuel validé dans FINCA MARIA.</p>
          </div>
        </div>

        {latestOliveState && (
          <article className="terrainObservationCard">
            <div className="terrainCardTop">
              <strong>{latestOliveState.date}</strong>
              <StateTag>Observation visuelle</StateTag>
            </div>
            <h4>{latestOliveState.title}</h4>
            <p>{latestOliveState.summary}</p>
            <div className="terrainSourceLine">
              <span>Source</span>
              <strong>{latestOliveState.location}</strong>
            </div>
            <small>{latestOliveState.status}</small>
          </article>
        )}
      </section>

      <section className="terrainTimelineSection">
        <div className="terrainSectionHeading">
          <span>02</span>
          <div>
            <h3>Frise d'observation</h3>
            <p>La même finca observée aux mêmes périodes, avec les mêmes repères.</p>
          </div>
        </div>

        <div className="terrainTimeline">
          {timeline.map((item) => (
            <article key={item.period}>
              <div className="terrainTimelineDot" />
              <span className="terrainTimelinePeriod">{item.period}</span>
              <h4>{item.label}</h4>
              <p>{item.detail}</p>
              <StateTag>{item.status}</StateTag>
            </article>
          ))}
        </div>
      </section>

      <section className="terrainTreeRegister">
        <div className="terrainSectionHeading compact">
          <span>03</span>
          <div>
            <h3>Oliviers témoins</h3>
            <p>Un registre de 30 arbres pour retrouver exactement les mêmes sujets à chaque passage.</p>
          </div>
        </div>

        <div className="terrainTreeToolbar">
          <p><strong>{locatedTrees}/{TREE_SAMPLE_TARGET}</strong> repérés · <strong>{filmedTrees}/{TREE_SAMPLE_TARGET}</strong> filmés · <strong>{EXISTING_TREE_PHOTOS_TO_LINK}</strong> arbres déjà photographiés à rattacher</p>
          <StateTag>Les états restent mémorisés sur cet appareil</StateTag>
        </div>

        <div className="terrainTreeGrid">
          {trees.map((tree) => (
            <article className="terrainTreeCard" data-state={tree.state} key={tree.id}>
              <div>
                <strong>{tree.id}</strong>
                <span>{tree.state}</span>
              </div>
              <button type="button" onClick={() => cycleTreeState(tree.id)}>
                {tree.state === "À choisir" ? "Marquer repéré" : tree.state === "Repéré" ? "Marquer filmé" : "Réinitialiser"}
              </button>
            </article>
          ))}
        </div>

        <div className="terrainCallout">
          <strong>Méthode de prise de vue</strong>
          <span>{treeProtocol.join(" · ")}</span>
        </div>
      </section>

      <section className="terrainSimplePanel boundaryPanel">
        <div className="terrainSectionHeading compact">
          <span>04</span>
          <div>
            <h3>Limites & eau — L01</h3>
            <p>Passage de tracteurs entre les parcelles et tracé du cauce.</p>
          </div>
        </div>

        {boundaryState && <p className="terrainBoundarySummary">{boundaryState.summary}</p>}

        <div className="terrainParcelGrid">
          <div>
            <span>Parcelle</span>
            <strong>25</strong>
            <small>29015A185000250000TT</small>
          </div>
          <div>
            <span>Parcelle</span>
            <strong>27</strong>
            <small>29015A185000270000TM</small>
          </div>
        </div>

        <ol className="terrainChecklist boundaryChecklist">
          {boundaryChecklist.map((item) => <li key={item}>{item}</li>)}
        </ol>

        {mappingState && (
          <div className="terrainCallout muted">
            <strong>Cartographie</strong>
            <span>{mappingState.status}</span>
          </div>
        )}
      </section>

      <section className="terrainExpertStrip">
        <div>
          <span className="cortijoEyebrow">Dossier expert</span>
          <h3>Montrer l'essentiel sans ouvrir toute l'usine</h3>
          <strong className="terrainExpertStatus">
            Base actuelle : {cortijoOliveReference.totalOlives} oliviers de travail sur {cortijoOliveReference.cadastralOliveArea} d'oliveraie cadastrale + panorama août + cartographie + {EXISTING_TREE_PHOTOS_TO_LINK} arbres déjà photographiés à rattacher + {filmedTrees} arbre{filmedTrees > 1 ? "s" : ""} témoin{filmedTrees > 1 ? "s" : ""} filmé{filmedTrees > 1 ? "s" : ""} dans le registre.
          </strong>
        </div>
        <div className="terrainExpertItems">
          <span>Évolution des oliviers</span>
          <span>Photos & vidéos datées</span>
          <span>Travaux réalisés</span>
          <span>Productions par campagne</span>
          <span>Parcelles & limites</span>
          <span>Questions à vérifier</span>
        </div>
      </section>
    </div>
  );
}
