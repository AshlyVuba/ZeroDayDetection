import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../src/ui/Home.jsx";

describe("Home screen", () => {
  it("renders the ZeroDay Detection brand and language", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("ZeroDay Detection");
    expect(markup).toContain('id="language-selector"');
    expect(markup).toContain("English — Beta");
  });

  it("renders message and payment checks as accessible active actions", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Check a message");
    expect(markup).toContain("Check a payment");
    expect(markup).not.toContain("disabled");
    expect(markup).toContain("Nothing is sent to the API unless you choose");
    expect(markup).toContain("Lock app");
  });

  it("does not expose an API submission before a user enters a flow", () => {
    const markup = renderToStaticMarkup(
      <Home session={{}} />,
    );

    expect(markup).toContain("Check a message");
    expect(markup).not.toContain("Send message to optional API");
    expect(markup).not.toContain("<textarea");
  });

  it("exposes a live connection-status banner slot", () => {
    const markup = renderToStaticMarkup(
      <Home isOnline={false} offlineReady={true} />,
    );

    expect(markup).toContain('data-slot="offline-banner"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("You&#x27;re offline.");
    expect(markup).toContain("This app is ready to use offline.");
  });

  it("shows an update action when a service worker update is available", () => {
    const markup = renderToStaticMarkup(
      <Home isOnline={true} updateAvailable={true} refresh={() => {}} />,
    );

    expect(markup).toContain("Refresh to update");
  });
});
