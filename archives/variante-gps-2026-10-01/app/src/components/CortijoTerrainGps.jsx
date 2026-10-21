import { useEffect, useMemo, useRef, useState } from "react";

const GPS_STORAGE_KEY = "cortijo_olive_gps_v1";
const VISIT_STORAGE_KEY = "cortijo_olive_visit_v1";
const TREE_IDS = Array.from({ length: 15 }, (_, index) => `O${String(index + 1).padStart(2, "0")}`);

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function loadGps() {
  try {
    const value = JSON.parse(localStorage.getItem(GPS_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function loadVisit() {
  try {
    const value = JSON.parse(localStorage.getItem(VISIT_STORAGE_KEY) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value) || value.date !== localToday()) {
      return { date: localToday(), visited: {} };
    }
    return { date: value.date, visited: value.visited || {} };
  } catch {
    return { date: localToday(), visited: {} };
  }
}

function saveGps(value) {
  localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify(value));
}

function saveVisit(value) {
  localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(value));
}

function toRad(value) {
  return value * Math.PI / 180;
}

function toDeg(value) {
  return value * 180 / Math.PI;
}

function distanceMeters(a, b) {
  if (!a || !b) return null;
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

function bearingDegrees(a, b) {
  if (!a || !b) return null;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lng - a.lng);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function compassLabel(degrees) {
  if (degrees == null) return "—";
  const labels = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return labels[Math.round(degrees / 45) % 8];
}

function formatDistance(value) {
  if (value == null) return "—";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(2)} km`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseKml(text) {
  const parser = new DOMParser();
  const documentXml = parser.parseFromString(text, "application/xml");
  const placemarks = [...documentXml.querySelectorAll("Placemark")];
  const found = {};

  placemarks.forEach((placemark) => {
    const name = placemark.querySelector("name")?.textContent?.trim()?.toUpperCase();
    if (!TREE_IDS.includes(name)) return;
    const coordinates = placemark.querySelector("Point coordinates")?.textContent?.trim();
    if (!coordinates) return;
    const [lngRaw, latRaw] = coordinates.split(",");
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    found[name] = {
      lat,
      lng,
      accuracy: null,
      capturedAt: new Date().toISOString(),
      source: "KML Google Earth"
    };
  });

  return found;
}

export function CortijoTerrainGps() {
  const [positions, setPositions] = useState(loadGps);
  const [visit, setVisit] = useState(loadVisit);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState("O01");
  const [gpsStatus, setGpsStatus] = useState("GPS arrêté");
  const [message, setMessage] = useState("");
  const watchId = useRef(null);

  useEffect(() => () => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
  }, []);

  const target = positions[selected] || null;
  const distance = useMemo(() => distanceMeters(current, target), [current, target]);
  const bearing = useMemo(() => bearingDegrees(current, target), [current, target]);
  const recordedCount = TREE_IDS.filter((id) => positions[id]).length;
  const visitedCount = TREE_IDS.filter((id) => visit.visited?.[id]).length;

  const nearestUnvisited = useMemo(() => {
    if (!current) return null;
    return TREE_IDS
      .filter((id) => positions[id] && !visit.visited?.[id])
      .map((id) => ({ id, distance: distanceMeters(current, positions[id]) }))
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }, [current, positions, visit]);

  function startGps() {
    if (!navigator.geolocation) {
      setGpsStatus("GPS indisponible sur cet appareil");
      return;
    }

    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    setGpsStatus("Recherche de la position…");

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrent({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsStatus(`Position active · précision ±${Math.round(position.coords.accuracy)} m`);
      },
      (error) => setGpsStatus(`GPS : ${error.message}`),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }

  function stopGps() {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setGpsStatus("GPS arrêté");
  }

  function captureSelected() {
    if (!current) {
      setMessage("Active d’abord le GPS du téléphone.");
      return;
    }

    const next = {
      ...positions,
      [selected]: {
        ...current,
        capturedAt: new Date().toISOString(),
        source: "GPS terrain"
      }
    };
    setPositions(next);
    saveGps(next);
    setMessage(`${selected} enregistré à ±${Math.round(current.accuracy || 0)} m.`);
  }

  function clearSelected() {
    const next = { ...positions };
    delete next[selected];
    setPositions(next);
    saveGps(next);
    setMessage(`${selected} réinitialisé.`);
  }

  function chooseNext() {
    const currentIndex = TREE_IDS.indexOf(selected);
    setSelected(TREE_IDS[(currentIndex + 1) % TREE_IDS.length]);
    setMessage("");
  }

  function chooseNearest() {
    if (!current) {
      setMessage("Active d’abord le GPS du téléphone.");
      return;
    }
    if (!nearestUnvisited) {
      setMessage(recordedCount ? "Tous les arbres GPS enregistrés ont déjà été visités aujourd’hui." : "Aucun arbre n’a encore de GPS enregistré.");
      return;
    }
    setSelected(nearestUnvisited.id);
    setMessage(`${nearestUnvisited.id} est le repère enregistré le plus proche : ${formatDistance(nearestUnvisited.distance)}.`);
  }

  function markVisited() {
    const next = {
      date: localToday(),
      visited: {
        ...(visit.date === localToday() ? visit.visited : {}),
        [selected]: new Date().toISOString()
      }
    };
    setVisit(next);
    saveVisit(next);
    setMessage(`${selected} marqué comme visité aujourd’hui.`);
  }

  function resetVisit() {
    const next = { date: localToday(), visited: {} };
    setVisit(next);
    saveVisit(next);
    setMessage("Tournée du jour réinitialisée.");
  }

  async function copyCoordinates() {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(`${target.lat.toFixed(7)}, ${target.lng.toFixed(7)}`);
      setMessage(`Coordonnées de ${selected} copiées.`);
    } catch {
      setMessage("Impossible de copier automatiquement les coordonnées.");
    }
  }

  function exportKml() {
    const placemarks = TREE_IDS
      .filter((id) => positions[id])
      .map((id) => {
        const point = positions[id];
        return `<Placemark><name>${id}</name><description>${escapeXml(`CORTIJO ALEMANES · ${point.source || "GPS"} · ${point.capturedAt || ""}`)}</description><Point><coordinates>${point.lng},${point.lat},0</coordinates></Point></Placemark>`;
      })
      .join("");

    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>CORTIJO ALEMANES — 15 oliviers repères</name>${placemarks}</Document></kml>`;
    downloadText("CORTIJO_OLIVIERS_O01_O15.kml", kml, "application/vnd.google-earth.kml+xml;charset=utf-8");
  }

  function importKml(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const found = parseKml(String(reader.result || ""));
      const count = Object.keys(found).length;
      if (!count) {
        setMessage("Aucun repère nommé O01 à O15 trouvé dans ce KML.");
      } else {
        const next = { ...positions, ...found };
        setPositions(next);
        saveGps(next);
        setMessage(`${count} repère${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""} depuis Google Earth.`);
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  const mapsHref = target ? `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}` : "";

  return (
    <section className="terrainGpsPanel">
      <div className="terrainGpsHeading">
        <div>
          <span className="cortijoEyebrow">Mode terrain GPS</span>
          <h4>Première série GPS : O01 → O15</h4>
          <p>Premier passage : on enregistre la position exacte de chaque arbre. Cette première série fait partie du registre de 30 témoins. Les visites suivantes, FINCA MARIA retrouve le repère le plus proche et affiche distance + direction.</p>
        </div>
        <div className="terrainGpsCounter"><strong>{recordedCount}/15</strong><span>GPS enregistrés</span></div>
      </div>

      <div className="terrainGpsControls">
        <button type="button" onClick={startGps}>📍 Activer mon GPS</button>
        <button type="button" onClick={stopGps}>Arrêter</button>
        <span>{gpsStatus}</span>
      </div>

      <div className="terrainGpsControls">
        <button type="button" onClick={chooseNearest}>🧭 Me conduire au repère le plus proche</button>
        <span>Tournée du {localToday()} : {visitedCount}/{recordedCount || 15} visités</span>
        {visitedCount > 0 && <button type="button" onClick={resetVisit}>Recommencer la tournée</button>}
      </div>

      <div className="terrainGpsTarget">
        <label>
          Arbre cible
          <select value={selected} onChange={(event) => { setSelected(event.target.value); setMessage(""); }}>
            {TREE_IDS.map((id) => <option key={id}>{id}</option>)}
          </select>
        </label>

        <div className="terrainGpsReadout">
          <span>Distance</span>
          <strong>{target ? formatDistance(distance) : "GPS à enregistrer"}</strong>
        </div>
        <div className="terrainGpsReadout">
          <span>Direction</span>
          <strong>{target && current ? `${compassLabel(bearing)} · ${Math.round(bearing)}°` : "—"}</strong>
        </div>
        <div className="terrainGpsReadout">
          <span>Position de l'arbre</span>
          <strong>{target ? `${target.lat.toFixed(6)}, ${target.lng.toFixed(6)}` : "Non enregistrée"}</strong>
        </div>
      </div>

      <div className="terrainGpsActions">
        <button type="button" className="isPrimary" onClick={captureSelected}>Je suis sur {selected} · enregistrer ici</button>
        {target && <button type="button" onClick={markVisited}>{visit.visited?.[selected] ? "✓ Visité aujourd'hui" : "✓ Je viens de contrôler cet arbre"}</button>}
        {target && <a href={mapsHref} target="_blank" rel="noreferrer">🧭 Ouvrir dans Google Maps</a>}
        {target && <button type="button" onClick={copyCoordinates}>Copier les coordonnées</button>}
        {target && <button type="button" onClick={clearSelected}>Corriger ce GPS</button>}
        <button type="button" onClick={chooseNext}>Arbre suivant →</button>
      </div>

      <div className="terrainGpsImportExport">
        <label>Importer un KML Google Earth<input type="file" accept=".kml,application/vnd.google-earth.kml+xml" onChange={importKml} /></label>
        <button type="button" onClick={exportKml} disabled={recordedCount === 0}>Exporter O01–O15 vers Google Earth</button>
      </div>

      {message && <p className="terrainGpsMessage">{message}</p>}

      <div className="terrainGpsMiniGrid">
        {TREE_IDS.map((id) => (
          <button type="button" key={id} className={selected === id ? "isSelected" : ""} onClick={() => setSelected(id)}>
            <strong>{id}</strong>
            <span>{visit.visited?.[id] ? "visité ✓" : positions[id] ? "GPS ✓" : "à caler"}</span>
          </button>
        ))}
      </div>

      <div className="terrainGpsRule">
        <strong>Important pour le premier passage</strong>
        <span>La capture Google Earth sert à choisir les candidats, mais elle ne donne pas leur GPS au mètre près. Confirme chaque arbre sur le terrain puis appuie sur « Je suis sur Oxx ». À partir de là, les visites suivantes pourront te conduire automatiquement vers le repère enregistré le plus proche.</span>
      </div>
    </section>
  );
}
