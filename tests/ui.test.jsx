import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../src/ui/Home.jsx";

describe("Home screen", () => {
  it("renders the ZeroDay Detection brand and language", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("ZeroDay Detection");
    expect(markup).toContain('aria-label="Language: English"');
    expect(markup).toContain("English");
  });

  it("shows both actions as unavailable instead of implying checks run", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Check a message");
    expect(markup).toContain("Check a payment");
    expect(markup.match(/disabled/g)).toHaveLength(2);
    expect(markup).toContain("These checks are not available yet.");
    expect(markup).toContain("Coming soon");
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
