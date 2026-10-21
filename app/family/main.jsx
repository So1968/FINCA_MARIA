import React from "react";
import { createRoot } from "react-dom/client";
import FincaFamilySafeApp from "./FincaFamilySafeApp.jsx";
import "./finca-family.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FincaFamilySafeApp />
  </React.StrictMode>,
);
