/**
 * MANVIA Frontend Entrypoint
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/app";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element #root not found. Failed to mount MANVIA frontend.",
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
