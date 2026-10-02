import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StorageAccess from "../src/storage/StorageAccess.jsx";

describe("storage access interface", () => {
  it("shows a loading state while checking the storage session", () => {
    const markup = renderToStaticMarkup(
      <StorageAccess session={{ getState: async () => "setup" }} />,
    );

    expect(markup).toContain("Checking private storage");
    expect(markup).toContain('aria-live="polite"');
  });
});
