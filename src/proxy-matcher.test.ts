import { describe, expect, it } from "vitest";
import { config } from "./proxy";
import manifest from "./app/manifest";

// Next turns `matcher` into a path regex; as a JS regex the same string works anchored.
// The exclusions are PREFIXES (as the existing login/register ones always were), so a
// made-up path like /sw.js.map would also skip the check; nothing lives there and every
// real app route is still protected, which the last test pins.
const protectedPath = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("which paths need a login", () => {
  it("the installable-app files do not (a signed-out browser must be able to read them)", () => {
    for (const path of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png", "/icons/maskable-512.png", "/apple-icon.png"]) {
      expect(protectedPath(path), path).toBe(false);
    }
  });

  it("the existing public paths still do not", () => {
    for (const path of ["/login", "/register", "/api/login", "/api/register", "/api/health", "/api/cron/daily-summary", "/_next/static/chunks/a.js", "/favicon.ico"]) {
      expect(protectedPath(path), path).toBe(false);
    }
  });

  it("every app page and API route still does", () => {
    for (const path of ["/", "/products", "/meals", "/profile", "/suggestions", "/api/diary", "/api/goals", "/api/bmi", "/offline", "/icons-private", "/products/offline.html"]) {
      expect(protectedPath(path), path).toBe(true);
    }
  });
});

describe("the web app manifest", () => {
  const m = manifest();

  it("is installable: name, standalone, start_url, 192 and 512 icons plus a maskable one", () => {
    expect(m.name).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.icons?.some((i) => i.sizes === "192x192")).toBe(true);
    expect(m.icons?.some((i) => i.sizes === "512x512")).toBe(true);
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("is Hebrew and right-to-left like the app", () => {
    expect(m.lang).toBe("he");
    expect(m.dir).toBe("rtl");
  });

  it("every icon it names exists in public/", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    for (const icon of m.icons ?? []) expect(existsSync(join(process.cwd(), "public", icon.src)), icon.src).toBe(true);
  });
});
