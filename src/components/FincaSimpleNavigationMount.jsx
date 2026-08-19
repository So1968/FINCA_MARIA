import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const NAV_KEY = "finca_maria_simple_nav_v1";

const TABS = [
  { id: "gestion", label: "Gestion", icon: "leaf", title: "Comment l’exploitation a été gérée", text: "Comprendre qui gérait la finca et à quelle période." },
  { id: "analyse", label: "Analyse", icon: "search", title: "Analyse de l’exploitation", text: "Voir les constats qui ressortent des pièces déjà réunies." },
  { id: "strategie", label: "Stratégie", icon: "compass", title: "Stratégie", text: "Savoir quoi faire ensuite, dans le bon ordre." },
  { id: "actions", label: "Actions", icon: "folder", title: "Dossiers & actions", text: "Accéder directement aux démarches, responsables, échéances et documents manquants." },
  { id: "maison", label: "Maison", icon: "home", title: "Maison", text: "Gérer la maison, les couchages, les présences et les besoins pratiques." }
];

function Icon({ name }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "leaf") return <svg {...common}><path d="M20 4c-7.5.2-12.5 3.6-13.8 9.6-.8 3.7 1.4 5.8 4.4 5.4 5.5-.7 8.8-6.3 9.4-15Z"/><path d="M5 20c2.6-5 6-8.3 10.8-10.8"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.7" cy="10.7" r="6.4"/><path d="m15.4 15.4 4.3 4.3"/></svg>;
  if (name === "compass") return <svg {...common}><circle cx="12" cy="12" r="8.6"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z"/></svg>;
  if (name === "folder") return <svg {...common}><path d="M3.5 7.5h6l1.7 2h9.3v8.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.5Z"/><path d="M3.5 7.5V5.8a1.7 1.7 0 0 1 1.7-1.7h4l1.7 2h4"/><path d="m9 15 1.8 1.8L15 12.6"/></svg>;
  return <svg {...common}><path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M5.5 9.2V20h13V9.2"/><path d="M9.5 20v-6h5v6"/></svg>;
}

function BrandMark() {
  return (
    <div className="fincaBrand" aria-label="FINCA MARIA">
      <div className="fincaBrandMark" aria-hidden="true">
        <svg viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="31"/>
          <path d="m20 38 16-14 16 14"/>
          <path d="M25 35v17h22V35"/>
          <path d="M29 52v-9h7v9"/>
          <path d="M15 30c8-2 14-7 18-14"/>
          <ellipse cx="18" cy="26" rx="4.8" ry="2.4" transform="rotate(-28 18 26)"/>
          <ellipse cx="24" cy="21" rx="4.8" ry="2.4" transform="rotate(-38 24 21)"/>
          <ellipse cx="30" cy="17" rx="4.4" ry="2.2" transform="rotate(-48 30 17)"/>
        </svg>
      </div>
      <div>
        <strong>FINCA MARIA</strong>
        <span>Gestion familiale</span>
      </div>
    </div>
  );
}

function locateDashboard() {
  const privateRoot = document.querySelector(".fincaMariaShell");
  const privateContainer = privateRoot?.querySelector("#finca-maria-sections");
  if (privateRoot && privateContainer) {
    return {
      root: privateRoot,
      container: privateContainer,
      sections: Array.from(privateContainer.querySelectorAll(":scope > details.cortijoView")),
      headerLead: privateRoot.querySelector(".fincaMariaHeader > div:first-child"),
      eyebrow: privateRoot.querySelector(".cortijoEyebrow"),
      topActions: privateRoot.querySelector(".fincaSectionControls")
    };
  }

  const publicContainer = document.querySelector(".dashboard-sections");
  const publicRoot = publicContainer?.closest(".page");
  if (publicRoot && publicContainer) {
    return {
      root: publicRoot,
      container: publicContainer,
      sections: Array.from(publicContainer.querySelectorAll(":scope > details.section")),
      headerLead: publicRoot.querySelector(".hero > div:first-child"),
      eyebrow: publicRoot.querySelector(".eyebrow"),
      topActions: publicRoot.querySelector(".top-actions")
    };
  }

  return null;
}

function ensureHost(context, className, where) {
  let host = context.root.querySelector(`.${className}`);
  if (host) return host;
  host = document.createElement("div");
  host.className = className;
  if (where === "brand" && context.headerLead) context.headerLead.prepend(host);
  else context.container.before(host);
  return host;
}

export function FincaSimpleNavigationMount() {
  const params = new URLSearchParams(window.location.search);
  const isDashboard = !params.get("view");
  const [context, setContext] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(NAV_KEY);
    return TABS.some((tab) => tab.id === saved) ? saved : "actions";
  });

  useEffect(() => {
    if (!isDashboard) return undefined;
    let cancelled = false;
    let frame = 0;
    const locate = () => {
      if (cancelled) return;
      const found = locateDashboard();
      if (found?.sections?.length >= 5) setContext(found);
      else frame = window.requestAnimationFrame(locate);
    };
    locate();
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isDashboard]);

  useEffect(() => {
    if (!context) return undefined;
    context.root.classList.add("fincaTabsMode");
    if (context.eyebrow) context.eyebrow.hidden = true;
    if (context.topActions) context.topActions.hidden = true;
    context.sections.slice(0, 5).forEach((section) => {
      section.open = true;
      const summary = section.querySelector(":scope > summary");
      if (summary) summary.hidden = true;
    });
    return () => {
      context.root.classList.remove("fincaTabsMode");
      if (context.eyebrow) context.eyebrow.hidden = false;
      if (context.topActions) context.topActions.hidden = false;
      context.sections.slice(0, 5).forEach((section) => {
        section.hidden = false;
        const summary = section.querySelector(":scope > summary");
        if (summary) summary.hidden = false;
      });
    };
  }, [context]);

  useEffect(() => {
    if (!context) return;
    const index = Math.max(0, TABS.findIndex((tab) => tab.id === activeTab));
    context.sections.slice(0, 5).forEach((section, sectionIndex) => {
      section.hidden = sectionIndex !== index;
      section.open = true;
    });
    localStorage.setItem(NAV_KEY, activeTab);
  }, [context, activeTab]);

  if (!isDashboard || !context) return null;

  const navHost = ensureHost(context, "fincaSimpleNavHost", "nav");
  const brandHost = context.headerLead ? ensureHost(context, "fincaBrandHost", "brand") : null;
  const active = TABS.find((tab) => tab.id === activeTab) || TABS[0];

  const nav = (
    <>
      <style>{`
        .fincaTabsMode .fincaSimpleNavHost { margin: 0 0 .9rem; }
        .fincaTabsNav { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:7px; padding:7px; border:1px solid rgba(214,169,85,.24); border-radius:18px; background:rgba(5,9,7,.82); box-shadow:0 14px 34px rgba(0,0,0,.18); }
        .fincaTabsNav button { min-height:58px; display:flex; align-items:center; justify-content:center; gap:.52rem; border:1px solid transparent; border-radius:12px; padding:.68rem .7rem; color:#d9c8a3; background:transparent; font:inherit; font-weight:700; cursor:pointer; }
        .fincaTabsNav button:hover { background:rgba(214,169,85,.08); color:#fff2d1; }
        .fincaTabsNav button.isActive { color:#172019; background:#efd99d; border-color:#f7e6b7; box-shadow:0 5px 16px rgba(0,0,0,.22); }
        .fincaTabsNav button svg { flex:0 0 auto; }
        .fincaTabIntro { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.8rem .95rem .9rem; }
        .fincaTabIntro strong { display:block; color:#fff3d4; font-family:Georgia,'Times New Roman',serif; font-size:1.15rem; }
        .fincaTabIntro span { display:block; margin-top:.12rem; color:#cdb98d; font-size:.9rem; line-height:1.4; }
        .fincaBrandHost { margin-bottom:.45rem; }
        .fincaBrand { display:inline-flex; align-items:center; gap:.72rem; }
        .fincaBrandMark { width:58px; height:58px; display:grid; place-items:center; border-radius:18px; background:linear-gradient(145deg,rgba(239,217,157,.16),rgba(97,120,78,.14)); border:1px solid rgba(239,217,157,.34); box-shadow:inset 0 0 0 1px rgba(255,255,255,.025); }
        .fincaBrandMark svg { width:48px; height:48px; fill:none; stroke:#efd99d; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
        .fincaBrandMark ellipse { fill:rgba(239,217,157,.18); }
        .fincaBrand strong { display:block; color:#fff4d7; font-family:Georgia,'Times New Roman',serif; font-size:1.28rem; letter-spacing:.075em; }
        .fincaBrand span { display:block; margin-top:.08rem; color:#bfae88; font-size:.76rem; letter-spacing:.035em; }
        .fincaTabsMode #finca-maria-sections > details.cortijoView:not([hidden]), .fincaTabsMode .dashboard-sections > details.section:not([hidden]) { margin-top:0; border-radius:16px; }
        .fincaTabsMode .dashboard-sections > details.section:not([hidden]) > .section-body { padding-top:1rem; }
        @media (max-width:760px) { .fincaTabsNav { grid-template-columns:repeat(3,minmax(0,1fr)); } .fincaTabsNav button { min-height:56px; font-size:.92rem; } .fincaTabIntro { padding:.72rem .55rem .82rem; } }
        @media (max-width:470px) { .fincaTabsNav { grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; } .fincaTabsNav button { min-height:54px; justify-content:flex-start; padding:.64rem .72rem; } .fincaBrandMark { width:52px; height:52px; border-radius:16px; } .fincaBrandMark svg { width:43px; height:43px; } .fincaBrand strong { font-size:1.16rem; } .fincaTabIntro strong { font-size:1.05rem; } .fincaTabIntro span { font-size:.86rem; } }
      `}</style>
      <nav className="fincaTabsNav" role="tablist" aria-label="Rubriques principales FINCA MARIA">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "isActive" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="fincaTabIntro" aria-live="polite">
        <div><strong>{active.title}</strong><span>{active.text}</span></div>
      </div>
    </>
  );

  return (
    <>
      {createPortal(nav, navHost)}
      {brandHost && createPortal(<BrandMark />, brandHost)}
    </>
  );
}
