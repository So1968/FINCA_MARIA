export const TABS = [
  { id: "gestion", label: "Gestion", icon: "leaf", title: "Comment l’exploitation a été gérée", text: "Comprendre qui gérait la finca et à quelle période." },
  { id: "analyse", label: "Analyse", icon: "search", title: "Analyse de l’exploitation", text: "Voir les constats qui ressortent des pièces déjà réunies." },
  { id: "strategie", label: "Stratégie", icon: "compass", title: "Stratégie", text: "Savoir quoi faire ensuite, dans le bon ordre." },
  { id: "actions", label: "Actions", icon: "folder", title: "Dossiers & actions", text: "Accéder directement aux démarches, responsables, échéances et documents manquants." },
  { id: "travaux", label: "Travaux", icon: "folder", title: "Travaux à faire", text: "Suivre les travaux de la maison, du jardin, du patio et des oliviers." },
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

export function BrandMark() {
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

export function FincaNavigation({ activeTab, onChange }) {
  function moveFocus(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    onChange(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  }
  const active = TABS.find((tab) => tab.id === activeTab) || TABS[3];
  return <>
    <nav className="fincaTabsNav" role="tablist" aria-label="Rubriques principales FINCA MARIA">
      {TABS.map((tab, index) => <button
        key={tab.id} id={`tab-${tab.id}`} type="button" role="tab"
        aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`}
        tabIndex={activeTab === tab.id ? 0 : -1}
        className={activeTab === tab.id ? "isActive" : ""}
        onClick={() => onChange(tab.id)} onKeyDown={(event) => moveFocus(event, index)}
      ><Icon name={tab.icon} /><span>{tab.label}</span></button>)}
    </nav>
    <div className="fincaTabIntro" aria-live="polite"><div><strong>{active.title}</strong><span>{active.text}</span></div></div>
  </>;
}
