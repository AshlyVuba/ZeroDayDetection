import { createElement as h, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "./ui/Home.jsx";
import "./ui/home.css";
import { usePwaStatus } from "./pwa.js";
import {
  applyLanguage,
  createTranslator,
  getInitialLanguage,
  persistLanguage,
} from "./i18n/index.js";

function App() {
  const { isOnline, offlineReady, updateAvailable, refresh } = usePwaStatus();
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  function handleLanguageChange(nextLanguage) {
    persistLanguage(nextLanguage);
    setLanguage(nextLanguage);
  }

  return h(Home, {
    isOnline,
    offlineReady,
    updateAvailable,
    refresh,
    language,
    onLanguageChange: handleLanguageChange,
    t: createTranslator(language),
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(h(App));
