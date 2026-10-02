import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import Home from "./ui/Home.jsx";
import "./ui/home.css";
import { usePwaStatus } from "./pwa.js";
import "./style.css";

function App() {
  const { isOnline, offlineReady, updateAvailable, refresh } = usePwaStatus();

  return h(
    "main",
    { className: "shell", "aria-labelledby": "app-title" },
    h(
      "header",
      { className: "masthead" },
      h("img", {
        className: "app-icon",
        src: "/icon.svg",
        alt: "",
        width: 48,
        height: 48,
      }),
      h("p", { className: "eyebrow" }, "Pause. Check. Stay safe."),
      h("h1", { id: "app-title" }, "ZeroDay Detection"),
      h(
        "p",
        { className: "intro" },
        "A private scam checker that helps you pause and check before you act.",
      ),
    ),
    h(
      "section",
      { className: "status-panel", "aria-label": "App status" },
      h(
        "p",
        {
          className: `connection-status ${isOnline ? "is-online" : "is-offline"}`,
          role: "status",
        },
        h("span", { className: "status-dot", "aria-hidden": "true" }),
        isOnline ? "You're online" : "You're offline",
      ),
      offlineReady
        ? h("p", { className: "offline-ready" }, "This app is ready to use offline.")
        : null,
      updateAvailable
        ? h(
            "button",
            { className: "update-button", type: "button", onClick: refresh },
            "Refresh to update",
          )
        : null,
    ),
    h(
      "p",
      { className: "notice" },
      "Scam-checking features are being built. Do not use this app to assess a message yet.",
    ),
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(h(App));
