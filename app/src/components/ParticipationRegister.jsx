import { useEffect, useState } from "react";
const LABELS = {
  present: "Présent",
  absent: "Absent",
  excused: "Excusé",
  unknown: "Non renseigné",
};
export default function ParticipationRegister({ onOpen, onClose }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [person, setPerson] = useState("");
  const [data, setData] = useState(null);
  const [years, setYears] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/meetings/participation?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Registre indisponible.");
        if (!Array.isArray(result.people) || !Array.isArray(result.meetings))
          throw new Error("Registre incomplet.");
        if (!controller.signal.aborted) {
          setData(result);
          setYears((old) =>
            [
              ...new Set([
                ...old,
                ...result.meetings.map((m) => m.date.slice(0, 4)),
              ]),
            ]
              .sort()
              .reverse(),
          );
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, attempt]);
  const selected = (data?.people || []).filter((p) =>
    p.name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .includes(person.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()),
  );
  return (
    <section className="meetingSection">
      <h2>Participants, présences et participation</h2>
      <label className="meetingField">
        <span>Année des présences</span>
        <select
          value={
            from.endsWith("-01-01") && to === `${from.slice(0, 4)}-12-31`
              ? from.slice(0, 4)
              : ""
          }
          onChange={(e) => {
            setFrom(e.target.value ? `${e.target.value}-01-01` : "");
            setTo(e.target.value ? `${e.target.value}-12-31` : "");
          }}
        >
          <option value="">Toutes les années / période libre</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <div className="meetingGrid">
        <label className="meetingField">
          <span>Début de période</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="meetingField">
          <span>Fin de période</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="meetingField">
          <span>Rechercher une personne</span>
          <input
            type="search"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
        </label>
      </div>
      <p>
        Pour une année, choisissez du 1er janvier au 31 décembre. Les noms sont
        regroupés sans distinction de casse ; corrigez les variantes dans les
        fiches et distinguez les homonymes avant d’interpréter les chiffres.
      </p>
      {loading && <p role="status">Chargement des présences…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="meetingBtn"
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Réessayer les présences
          </button>
        </p>
      )}
      {!loading && !error && data && (
        <>
          <p>
            {data.meetings.length} réunions dans la période.{" "}
            {data.denominatorNote}
          </p>
          <p className="meetingMuted">
            Une absence de ligne ne prouve pas une invitation ni une absence. Le
            statut reste non renseigné. Les archives non structurées doivent
            être reprises avant d’interpréter le taux.
          </p>
          <div className="archiveTable">
            <table>
              <caption>
                Participation factuelle sur la période sélectionnée
              </caption>
              <thead>
                <tr>
                  <th scope="col">Personne</th>
                  <th scope="col">Présences</th>
                  <th scope="col">Absences</th>
                  <th scope="col">Excuses</th>
                  <th scope="col">Non renseignées</th>
                  <th scope="col">Taux et dénominateur</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((p) => (
                  <tr key={p.name}>
                    <th scope="row">{p.name}</th>
                    <td>{p.present}</td>
                    <td>{p.absent}</td>
                    <td>{p.excused}</td>
                    <td>{p.unknown}</td>
                    <td>
                      {p.rate === null
                        ? "Non calculable"
                        : `${p.rate} % (${p.present}/${p.denominator})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!selected.length && (
            <p>Aucune personne recensée pour cette recherche.</p>
          )}
          {selected.map((p) => (
            <details className="meetingSection" key={p.name}>
              <summary>Historique de {p.name}</summary>
              {[...new Set(p.history.map((h) => h.year))].map((year) => (
                <section key={year}>
                  <h3>{year}</h3>
                  <ul>
                    {p.history
                      .filter((h) => h.year === year)
                      .map((h) => (
                        <li key={h.meetingId}>
                          {h.date} · {LABELS[h.presence]} ·{" "}
                          <button
                            type="button"
                            className="meetingBtn"
                            onClick={() => onOpen(h.meetingId)}
                          >
                            {h.title}
                          </button>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </details>
          ))}
        </>
      )}
      <button type="button" className="meetingBtn" onClick={onClose}>
        Revenir aux réunions
      </button>
    </section>
  );
}
