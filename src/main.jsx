import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { FincaDocumentChecklistMount } from "./components/FincaDocumentChecklistMount.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <FincaDocumentChecklistMount />
  </React.StrictMode>
);
