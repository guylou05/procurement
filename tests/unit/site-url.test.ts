import { describe, it, expect, afterEach } from "vitest";
import { getSiteUrl } from "@/config/brand";

const original = process.env.APP_URL;
afterEach(() => {
  if (original === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = original;
});

describe("getSiteUrl", () => {
  it("passes through a well-formed https URL and trims a trailing slash", () => {
    process.env.APP_URL = "https://app.example.com/";
    expect(getSiteUrl()).toBe("https://app.example.com");
  });

  it("normalizes a bare hostname by adding https:// (the Railway outage case)", () => {
    // This exact value — a hostname with no protocol — crashed every page in
    // production because `new URL(...)` in generateMetadata threw "Invalid URL".
    process.env.APP_URL = "efficient-playfulness-production.up.railway.app";
    expect(getSiteUrl()).toBe("https://efficient-playfulness-production.up.railway.app");
  });

  it("keeps an explicit http:// URL (local dev)", () => {
    process.env.APP_URL = "http://localhost:3000";
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("falls back to the brand domain when APP_URL is unset or blank", () => {
    delete process.env.APP_URL;
    expect(getSiteUrl()).toBe("https://buildflow.africa");
    process.env.APP_URL = "   ";
    expect(getSiteUrl()).toBe("https://buildflow.africa");
  });

  it("never throws — falls back on an unparseable value", () => {
    process.env.APP_URL = "http://";
    expect(() => getSiteUrl()).not.toThrow();
    expect(getSiteUrl()).toBe("https://buildflow.africa");
  });
});
