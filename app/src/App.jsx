import { lazy, Suspense, useEffect, useState } from "react";
import "./project-work.css";

function lazyView(loader, name) {
  return lazy(() => Promise.all([import("./finca-styles.js"), loader()]).then(([, module]) => ({ default: module[name] })));
}
const Dashboard = lazyView(() => import("./components/FincaMariaDashboard.jsx"), "FincaMariaDashboard");
const Dossiers = lazyView(() => import("./components/CortijoDossierPortal.jsx"), "CortijoDossierPortal");
const Family = lazyView(() => import("./components/CortijoFamilyPortal.jsx"), "CortijoFamilyPortal");
const House = lazyView(() => import("./components/FincaHouseExperience.jsx"), "FincaHouseExperience");
const Export = lazyView(() => import("./components/CortijoExportableView.jsx"), "CortijoExportableView");
const Trees = lazyView(() => import("./components/FincaTreeCountPanel.jsx"), "FincaTreeCountPanel");
const Meetings = lazy(() => import("./components/FincaMeetingsHub.jsx"));
export const NAVIGATION_EVENT = "finca:navigation";
const currentView = () => new URLSearchParams(window.location.search).get("view") || "";
export default function App() {
  const [view, setView] = useState(currentView);
  useEffect(() => {
    const syncRoute = () => setView(currentView());
    window.addEventListener(NAVIGATION_EVENT, syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => { window.removeEventListener(NAVIGATION_EVENT, syncRoute); window.removeEventListener("popstate", syncRoute); };
  }, []);
  let page = <Dashboard />;
  if (view === "reunions") page = <Meetings />;
  else if (view === "cortijo-memoire") page = <Dossiers />;
  else if (view === "cortijo-famille") page = <Family />;
  else if (view === "cortijo-maison") page = <House />;
  else if (view === "cortijo-exportable") page = <Export />;
  else if (view === "finca-comptage-oliviers") page = <main className="cortijoDashboard fincaMariaShell" style={{padding:"1rem"}}><Trees /></main>;
  return <Suspense fallback={<p role="status">Ouverture de FINCA MARIA…</p>}>{page}</Suspense>;
}
