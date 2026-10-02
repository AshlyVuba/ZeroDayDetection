import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import Home from "./ui/Home.jsx";
import "./ui/home.css";
import { usePwaStatus } from "./pwa.js";

function App() {
  const { isOnline, offlineReady, updateAvailable, refresh } = usePwaStatus();

  return h(Home, { isOnline, offlineReady, updateAvailable, refresh });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(h(App));
