import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { HashRouter } from 'react-router-dom';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
