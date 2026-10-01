import { createElement } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(
  createElement(
    "main",
    { "aria-labelledby": "app-title" },
    createElement("h1", { id: "app-title" }, "ZeroDay Detection"),
    createElement(
      "p",
      null,
      "The scam-checking features are being built. Do not use this app to assess a message yet.",
    ),
  ),
);
