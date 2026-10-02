import { createElement as h, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "./ui/Home.jsx";
import "./ui/home.css";
import { usePwaStatus } from "./pwa.js";
import { createStorageSession } from "./storage/index.ts";
import StorageAccess from "./storage/StorageAccess.jsx";
import {
  applyLanguage,
  createTranslator,
  getInitialLanguage,
  persistLanguage,
} from "./i18n/index.js";

const storageSession = createStorageSession();

function App() {
  const { isOnline, offlineReady, updateAvailable, refresh } = usePwaStatus();
  const [language, setLanguage] = useState(getInitialLanguage);
  const [storageState, setStorageState] = useState(null);
  const [storageError, setStorageError] = useState("");
  const handleStorageState = useCallback((nextState) => {
    setStorageState(nextState);
    setStorageError("");
  }, []);

  useEffect(() => {
    return storageSession.onStorageLocked(() => {
      setStorageState("locked");
    });
  }, []);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  function handleLanguageChange(nextLanguage) {
    persistLanguage(nextLanguage);
    setLanguage(nextLanguage);
  }

  async function lockStorage() {
    storageSession.lock();
    setStorageState("locked");
    try {
      setStorageState(await storageSession.getState());
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : "Unable to read storage.");
    }
  }

  if (storageState !== "unlocked" && storageState !== "memory-only") {
    return h(StorageAccess, {
      session: storageSession,
      onStateChange: handleStorageState,
      onError: setStorageError,
      externalError: storageError,
    });
  }

  return h(Home, {
    isOnline,
    offlineReady,
    updateAvailable,
    refresh,
    language,
    onLanguageChange: handleLanguageChange,
    onLock: lockStorage,
    storageMode: storageState,
    session: storageSession,
    t: createTranslator(language),
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(h(App));
