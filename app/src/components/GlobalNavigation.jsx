import { useEffect, useState } from "react";
import "./GlobalNavigation.css";

function isHome() {
  return (window.location.pathname === "/" || window.location.pathname === "/family/") && !window.location.search;
}
export default function GlobalNavigation() {
  const homeUrl = window.location.pathname.startsWith("/family/") ? "/family/" : "/";
  const [home, setHome] = useState(isHome);
  useEffect(() => {
    const update = () => setHome(isHome());
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    window.addEventListener("finca:navigation", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
      window.removeEventListener("finca:navigation", update);
    };
  }, []);
  if (home || window.location.pathname.includes("login")) return null;
  return <nav className="fincaGlobalNav" aria-label="Navigation principale">
    <a href={homeUrl} title="Retour à l'accueil FINCA MARIA">← FINCA MARIA</a>
  </nav>;
}
