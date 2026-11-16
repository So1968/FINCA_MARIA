import { infrastructureSections, visitSequence } from "../../data/houseContent.mjs";
import { HouseNote } from "./HouseUI";
import { HouseRulesHistory } from "../FincaHouseRulesHistoryMount";

export function HouseFunctioning() {
  return <>
    <p>Renseignez les consignes réellement vérifiées sur place. Un champ vide indique une information à compléter.</p>
    <div className="houseCards">{[...infrastructureSections, ["Équipements", "Notices, utilisation et précautions des équipements."]].map(([title, hint]) => <article className="houseCard" key={title}><h3>{title}</h3><p>{hint}</p><HouseNote field={`infra-${title}`} label={`Consignes — ${title}`} /></article>)}</div>
    <details className="houseCard" id="visite"><summary>Repères de visite et anciennes notes par pièce</summary><div className="houseCards">{visitSequence.map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.text}</p><HouseNote field={`visit-${item.id}`} label={`Repères — ${item.title}`} /></article>)}</div></details>
    <HouseRulesHistory />
  </>;
}
