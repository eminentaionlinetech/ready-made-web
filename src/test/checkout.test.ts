import { describe, expect, it } from "vitest";
import { checkoutReference, isPaidTransaction, PUBLISHED_URL, returnOrigin, thankYouUrl } from "@/lib/checkout";

const expected = { amount_cents: 12900000, currency: "NGN" };

describe("marking a purchase paid", () => {
  it("accepts a successful payment for the full naira price", () => {
    expect(isPaidTransaction({ status: "success", amount: 12900000, currency: "NGN" }, expected)).toBe(true);
  });
  it("rejects an underpayment", () => {
    expect(isPaidTransaction({ status: "success", amount: 12900, currency: "NGN" }, expected)).toBe(false);
  });
  it("rejects a payment in another currency", () => {
    expect(isPaidTransaction({ status: "success", amount: 12900000, currency: "USD" }, expected)).toBe(false);
  });
  it("rejects an abandoned payment", () => {
    expect(isPaidTransaction({ status: "abandoned", amount: 12900000, currency: "NGN" }, expected)).toBe(false);
  });
});

describe("return page after paying", () => {
  it("never sends buyers to another site", () => {
    expect(returnOrigin("https://evil.example")).toBe(PUBLISHED_URL);
    expect(returnOrigin("http://localhost:8080")).toBe(PUBLISHED_URL);
  });
  it("returns buyers to the editor preview they paid from", () => {
    const preview = "https://id-preview--be9ba4bb-5232-44d0-bc63-37b0fc0a355c.lovable.app";
    expect(returnOrigin(preview)).toBe(preview);
  });
});

describe("payment references", () => {
  it("only uses characters Paystack accepts", () => {
    expect(checkoutReference("1b2c-3d4e", 1000)).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

describe("thank-you callback", () => {
  it("returns to the thank-you page with the purchased slug", () => {
    expect(thankYouUrl(PUBLISHED_URL, "test-website")).toBe(`${PUBLISHED_URL}/thank-you?checkout=test-website`);
  });
  it("keeps the callback on the shop and safely encodes the slug", () => {
    expect(thankYouUrl("https://evil.example", "a&reference=fake")).toBe(`${PUBLISHED_URL}/thank-you?checkout=a%26reference%3Dfake`);
  });
});
