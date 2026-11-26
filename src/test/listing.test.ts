import { describe, expect, it } from "vitest";
import { nairaToKobo, slugify, validateListing, type ListingDraft } from "@/lib/listing";
import { isStoredPath } from "@/lib/screenshots";

const complete: ListingDraft = {
  title: "Test Website",
  slug: "test-website",
  category: "SaaS",
  price: "129000",
  demoUrl: "https://test-website-demo.com",
  description: "A landing page.",
  screenshotCount: 1,
  hasZip: true,
};

describe("admin listing prices", () => {
  it("stores naira prices in kobo", () => {
    expect(nairaToKobo("129000")).toBe(12900000);
    expect(nairaToKobo("₦129,000")).toBe(12900000);
    expect(nairaToKobo("99.50")).toBe(9950);
  });
  it("rejects prices that aren't amounts", () => {
    expect(nairaToKobo("abc")).toBeNull();
    expect(nairaToKobo("-5")).toBeNull();
  });
});

describe("admin listing requirements", () => {
  it("accepts a listing with every required field", () => {
    expect(validateListing(complete)).toEqual({});
  });
  it("requires the website's zip file", () => {
    expect(validateListing({ ...complete, hasZip: false }).hasZip).toBeDefined();
  });
  it("requires at least one screenshot", () => {
    expect(validateListing({ ...complete, screenshotCount: 0 }).screenshotCount).toBeDefined();
  });
  it("requires a real demo link", () => {
    expect(validateListing({ ...complete, demoUrl: "javascript:alert(1)" }).demoUrl).toBeDefined();
  });
  it("rejects a free listing", () => {
    expect(validateListing({ ...complete, price: "0" }).price).toBeDefined();
  });
});

describe("listing web addresses", () => {
  it("turns titles into clean addresses", () => {
    expect(slugify("Test & Company")).toBe("test-and-company");
  });
});

describe("screenshot storage", () => {
  it("treats uploaded files as private paths and site images as non-storage paths", () => {
    expect(isStoredPath("3f2a/1700-0-home.png")).toBe(true);
    expect(isStoredPath("/assets/test-image.jpg")).toBe(false);
    expect(isStoredPath("https://cdn.example.com/a.png")).toBe(false);
  });
});
