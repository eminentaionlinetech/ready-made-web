import { describe, expect, it } from "vitest";
import { catalogAvailability, browseWebsites, searchWebsites, filterByCategory, formatPrice, safeRedirect } from "@/lib/catalog";

const items = [
  { category: "SaaS", slug: "a" },
  { category: "Blog", slug: "b" },
  { category: "SaaS", slug: "c" },
];

describe("category filter", () => {
  it("shows only websites in the chosen category", () => {
    expect(filterByCategory(items, "saas").map((i) => i.slug)).toEqual(["a", "c"]);
  });
  it("shows every website when no category is chosen", () => {
    expect(filterByCategory(items, undefined)).toHaveLength(3);
  });
});

describe("prices", () => {
  it("shows whole-naira prices without kobo", () => {
    expect(formatPrice(12900000)).toBe("₦129,000");
  });
});

describe("after sign-in redirect", () => {
  it("never sends buyers to another site", () => {
    expect(safeRedirect("//evil.example")).toBe("/dashboard");
    expect(safeRedirect("https://evil.example")).toBe("/dashboard");
    expect(safeRedirect("/websites/test-website")).toBe("/websites/test-website");
  });
});

const searchable = [
  { title: "Test Website", category: "SaaS", tagline: "A launch-ready landing page", description: "For software teams" },
  { title: "Test Portfolio", category: "Portfolio", tagline: "A designer portfolio", description: "Creative work" },
];
describe("shop search", () => {
  it("finds title matches regardless of case and surrounding spaces", () => {
    expect(searchWebsites(searchable, "  TEST WEBSITE  ").map((w) => w.title)).toEqual(["Test Website"]);
  });
  it("searches descriptions and requires all search words", () => {
    expect(searchWebsites(searchable, "software landing").map((w) => w.title)).toEqual(["Test Website"]);
    expect(searchWebsites(searchable, "software designer")).toEqual([]);
  });
  it("combines category and search rather than resetting either", () => {
    expect(browseWebsites(searchable, { category: "Portfolio", q: "Test Website" })).toEqual([]);
    expect(browseWebsites(searchable, { category: "SaaS", q: "Test Website" })).toHaveLength(1);
  });
  it("returns every listing when the query is blank", () => {
    expect(searchWebsites(searchable, "   ")).toHaveLength(2);
  });
});

describe("catalog availability", () => {
  it("hides the ready-to-launch badge when the database returns zero websites", () => {
    expect(catalogAvailability([])).toEqual({ count: 0, showBadge: false, isEmpty: true });
  });
  it("counts the actual uploaded rows without adding sample listings", () => {
    expect(catalogAvailability([{ id: "first" }, { id: "second" }])).toEqual({ count: 2, showBadge: true, isEmpty: false });
    expect(catalogAvailability([{ id: "first" }]).count).toBe(1);
  });
});
