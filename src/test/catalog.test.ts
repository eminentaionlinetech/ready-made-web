import { describe, expect, it } from "vitest";
import { filterByCategory, formatPrice, safeRedirect } from "@/lib/catalog";

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
    expect(safeRedirect("/websites/northwind")).toBe("/websites/northwind");
  });
});
