import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";
import { applyTheme } from "./theme.ts";
import Launch from "./Launch.tsx";
const preference = localStorage.getItem("cadencia-theme");
applyTheme(
  preference === "light" || preference === "dark" ? preference : "system",
);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Launch />
    <App />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });

import "./redesign.css";
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const saved = localStorage.getItem("cadencia-theme");
  applyTheme(saved === "light" || saved === "dark" ? saved : "system");
});
