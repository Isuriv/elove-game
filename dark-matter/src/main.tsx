import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/literata/latin-400-italic.css";
import "@fontsource/literata/latin-400.css";
import "@fontsource/literata/latin-600.css";
import "@fontsource/syne/latin-500.css";
import "@fontsource/syne/latin-700.css";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
