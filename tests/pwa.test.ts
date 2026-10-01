import { describe, expect, it } from "vitest";
import manifestSource from "../public/manifest.webmanifest?raw";
import icon192 from "../public/icons/icon-192.svg?raw";
import icon512 from "../public/icons/icon-512.svg?raw";
import headers from "../public/_headers?raw";
import html from "../index.html?raw";

describe("PWA deployment assets", () => {
  it("uses ZeroDay Detection branding and local icons in its manifest", () => {
    const manifest = JSON.parse(manifestSource);

    expect(manifest.name).toBe("ZeroDay Detection");
    expect(manifest.theme_color).toBe("#f97316");
    expect(manifest.background_color).toBe("#0c0a09");
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([
      "/icons/icon-192.svg",
      "/icons/icon-512.svg",
    ]);
    expect(icon192).toContain("<svg");
    expect(icon512).toContain("<svg");
  });

  it("serves the required policy as a host header, not a meta policy", () => {
    expect(headers).toContain(
      "Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    expect(html).not.toMatch(/http-equiv=["']Content-Security-Policy/i);
  });
});
