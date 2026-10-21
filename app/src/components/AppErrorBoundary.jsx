import React from "react";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("FINCA MARIA : erreur d’interface interceptée", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="azothApp" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
        <section className="dropPlaceholder" role="alert" style={{ maxWidth: "680px" }}>
          <span className="workspaceEyebrow">FINCA MARIA</span>
          <h2>L’interface n’a pas pu s’afficher correctement.</h2>
          <p>Les données enregistrées ne sont pas supprimées. Recharge la page pour reprendre le travail.</p>
          <button type="button" className="primaryAction" onClick={() => window.location.reload()}>Recharger</button>
        </section>
      </main>
    );
  }
}
