import { describe, expect, it } from "vitest";
import { getRequestOrigin } from "./origin";

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

describe("getRequestOrigin", () => {
  it("uses the URL's scheme and the Host header when there is no proxy header", () => {
    expect(getRequestOrigin(req("http://localhost:3000/x", { host: "192.168.1.5:3000" }))).toBe(
      "http://192.168.1.5:3000"
    );
  });

  it("trusts X-Forwarded-Proto over the URL's scheme (nginx talks plain HTTP to Node)", () => {
    expect(
      getRequestOrigin(
        req("http://127.0.0.1:3000/x", { host: "diet.example.com", "x-forwarded-proto": "https" })
      )
    ).toBe("https://diet.example.com");
  });

  it("takes the first value of a comma-separated X-Forwarded-Proto", () => {
    expect(
      getRequestOrigin(req("http://127.0.0.1:3000/", { host: "a.test", "x-forwarded-proto": "https, http" }))
    ).toBe("https://a.test");
  });

  it("ignores an X-Forwarded-Proto that is not http or https", () => {
    expect(
      getRequestOrigin(req("http://127.0.0.1:3000/", { host: "a.test", "x-forwarded-proto": "javascript" }))
    ).toBe("http://a.test");
  });

  it("falls back to the URL's own host when the Host header is missing", () => {
    expect(getRequestOrigin(req("https://fallback.test/x"))).toBe("https://fallback.test");
  });
});
