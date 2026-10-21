import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./clickable-highlight.css";
import "./vogue-polish.css";
import RootApp from "./RootApp.jsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.jsx";

function lazyFincaMount(loader, exportName) {
  return lazy(() => Promise.all([import("./finca-styles.js"), loader()]).then(([, module]) => ({ default: module[exportName] })));
}

const FincaDocumentChecklistMount = lazyFincaMount(() => import("./components/FincaDocumentChecklistMount.jsx"), "FincaDocumentChecklistMount");
const FincaOperationsMount = lazyFincaMount(() => import("./components/FincaOperationsMount.jsx"), "FincaOperationsMount");
const FincaHouseRulesHistoryMount = lazyFincaMount(() => import("./components/FincaHouseRulesHistoryMount.jsx"), "FincaHouseRulesHistoryMount");
const FincaHouseBookingCalendarMount = lazyFincaMount(() => import("./components/FincaHouseBookingCalendarMount.jsx"), "FincaHouseBookingCalendarMount");
const FincaHouseStatusMount = lazyFincaMount(() => import("./components/FincaHouseStatusMount.jsx"), "FincaHouseStatusMount");
const FincaHouseInventoryMount = lazyFincaMount(() => import("./components/FincaHouseInventoryMount.jsx"), "FincaHouseInventoryMount");
const FincaSharedSyncMount = lazyFincaMount(() => import("./components/FincaSharedSyncMount.jsx"), "FincaSharedSyncMount");

const NAVIGATION_EVENT = "finca:navigation";

function getRouteState() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") || "";
  return {
    directHouseView: view === "cortijo-maison",
    isFincaEntry: true,
  };
}

function DeferredFincaEnhancements() {
  const initialRoute = getRouteState();
  const [ready, setReady] = useState(initialRoute.isFincaEntry);
  const [directHouseView, setDirectHouseView] = useState(initialRoute.directHouseView);

  useEffect(() => {
    const handleNavigation = () => {
      const route = getRouteState();
      setDirectHouseView(route.directHouseView);
      if (route.isFincaEntry) setReady(true);
    };

    window.addEventListener(NAVIGATION_EVENT, handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    return () => {
      window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <FincaDocumentChecklistMount />
      <FincaOperationsMount />
      <FincaHouseRulesHistoryMount />
      {!directHouseView && <FincaHouseBookingCalendarMount />}
      <FincaHouseStatusMount />
      <FincaHouseInventoryMount />
      <FincaSharedSyncMount />
    </Suspense>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <RootApp />
      <DeferredFincaEnhancements />
    </AppErrorBoundary>
  </React.StrictMode>
);
