import { useEffect, useState } from "react";
import "./GlobalNavigation.css";

function isHome() {
  return (window.location.pathname === "/" || window.location.pathname === "/family/") && !window.location.search && !window.location.hash;
}
function isLogin() {
  return window.location.pathname.includes("login");
}
export default function GlobalNavigation() {
  const homeUrl = window.location.pathname.startsWith("/family/") ? "/family/" : "/";
  const [home, setHome] = useState(isHome);
  const [login, setLogin] = useState(isLogin);
  useEffect(() => {
    const update = () => { setHome(isHome()); setLogin(isLogin()); };
    window.addEventListener("popstate",update);
    window.addEventListener("hashchange",update);
    window.addEventListener("finca:navigation",update);
    return () => {
      window.removeEventListener("popstate",update);
      window.removeEventListener("hashchange",update);
      window.removeEventListener("finca:navigation",update);
    };
  }, []);
  if (login || home) return null;
  return <nav className="fincaGlobalNav" aria-label="Navigation principale">
    <button type="button" onClick={() => {
      if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back();
      else window.location.assign(homeUrl);
    }} title="Revenir à la page précédente">← Retour</button>
    <a href="/" title="Revenir à l'accueil de FINCA MARIA">⌂ Menu principal</a>
  </nav>;
}
