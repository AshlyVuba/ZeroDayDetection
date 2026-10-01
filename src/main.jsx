import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <main aria-labelledby="app-title">
      <p className="brand">ZeroDay Detection</p>
      <h1 id="app-title">Pause. Check. Then decide.</h1>
      <p className="connection-status" role="status">
        {isOnline
          ? "You are online."
          : "You are offline. The app shell is available on this device."}
      </p>
      <p>
        The scam-checking features are being built. Do not use this app to
        assess a message yet.
      </p>
      {needRefresh && (
        <section className="update-notice" aria-labelledby="update-title">
          <h2 id="update-title">An update is ready</h2>
          <p>Refresh to use the latest version of ZeroDay Detection.</p>
          <button type="button" onClick={() => updateServiceWorker(true)}>
            Refresh now
          </button>
        </section>
      )}
    </main>
  );
}

createRoot(rootElement).render(<App />);
