import { Dashboard } from "./components/Dashboard.jsx";
import { Dossiers } from "./components/Dossiers.jsx";
import { House } from "./components/House.jsx";
import { Summary } from "./components/Summary.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "cortijo-memoire" || view === "dossiers") return <Dossiers />;
  if (view === "cortijo-maison" || view === "maison") return <House />;
  if (view === "cortijo-famille" || view === "synthese") return <Summary />;
  return <Dashboard />;
}
