import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { CatalogProvider } from "./catalog/CatalogProvider.jsx";
import { ShopProvider } from "./context/ShopContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <CatalogProvider>
        <ShopProvider>
          <App />
        </ShopProvider>
      </CatalogProvider>
    </HashRouter>
  </React.StrictMode>,
);
