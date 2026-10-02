import React from "react";
import LanguageSelector from "./LanguageSelector.jsx";

const actions = [
  { label: "Check a message", icon: "01" },
  { label: "Check a payment", icon: "02" },
];

export default function Home({
  isOnline = true,
  offlineReady = false,
  updateAvailable = false,
  refresh,
  language = "en",
  onLanguageChange = () => {},
  t,
}) {
  return (
    <div className="home-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="ZeroDay Detection home">
          <span className="wordmark-mark" aria-hidden="true">
            Z
          </span>
          <span>ZeroDay Detection</span>
        </a>
        <LanguageSelector
          language={language}
          onChange={onLanguageChange}
          t={t}
        />
      </header>

      <main className="home-main" aria-labelledby="home-title">
        <section className="welcome-panel">
          <p className="eyebrow">A moment to think</p>
          <h1 id="home-title">Take a moment before you act.</h1>
          <p className="intro-copy">
            Choose what you want to check. These checks are not available yet.
          </p>

          <div className="action-list" aria-describedby="actions-note">
            {actions.map((action) => (
              <button
                className="action-button"
                type="button"
                disabled
                key={action.label}
              >
                <span className="action-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="action-label">{action.label}</span>
                <span className="coming-soon">Coming soon</span>
                <span className="action-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
          <p className="actions-note" id="actions-note">
            Message and payment checks are being built.
          </p>
        </section>

        <aside
          className="offline-banner"
          aria-label="Connection status"
          aria-live="polite"
          data-slot="offline-banner"
        >
          <span className="offline-indicator" aria-hidden="true" />
          <span className="offline-message">
            {isOnline ? "You're online." : "You're offline."}
            {offlineReady ? " This app is ready to use offline." : ""}
          </span>
          {updateAvailable ? (
            <button
              className="offline-update"
              type="button"
              onClick={refresh}
            >
              Refresh to update
            </button>
          ) : null}
        </aside>
      </main>

      <footer className="site-footer">
        <span>ZeroDay Detection</span>
        <span>Pause. Think. Then decide.</span>
      </footer>
    </div>
  );
}
