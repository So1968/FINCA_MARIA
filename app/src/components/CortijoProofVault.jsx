import { useState } from "react";
import { cortijoProofs, proofTypes } from "../data/cortijo-proofs";

export function CortijoProofVault() {
  const [proofs, setProofs] = useState(cortijoProofs);
  const [fileName, setFileName] = useState("");
  const [type, setType] = useState(proofTypes[0]);
  const [linkedTo, setLinkedTo] = useState("");

  function addProof() {
    if (!fileName) return;
    setProofs((current) => [
      {
        id: `proof-${Date.now()}`,
        title: fileName,
        type,
        date: new Date().toISOString().slice(0, 10),
        linkedTo: linkedTo || "À relier",
        source: "Import local"
      },
      ...current
    ]);
    setFileName("");
    setLinkedTo("");
  }

  return (
    <section className="cortijoPanel cortijoProofVault">
      <div className="cortijoPanelTitle">
        <span>03</span>
        <h3>BAÚL — Coffre de preuves</h3>
      </div>
      <div className="cortijoForm">
        <input type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} />
        <select value={type} onChange={(event) => setType(event.target.value)}>
          {proofTypes.map((proofType) => <option key={proofType}>{proofType}</option>)}
        </select>
        <input value={linkedTo} onChange={(event) => setLinkedTo(event.target.value)} placeholder="Lié à : question, anomalie, facture…" />
        <button type="button" onClick={addProof}>+ Ajouter la preuve</button>
      </div>
      <div className="cortijoList">
        {proofs.map((proof) => (
          <article className="cortijoCard" key={proof.id}>
            <div className="cortijoCardTop"><span className="cortijoPill">{proof.type}</span><small>{proof.date}</small></div>
            <h4>{proof.title}</h4>
            <p>{proof.linkedTo}</p>
            <small>{proof.source}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
