import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidPaystackSignature } from "@/lib/paystack-signature";

const secret = "sk_test_example";
const body = JSON.stringify({ event: "charge.success", data: { reference: "rm-1" } });
const sig = createHmac("sha512", secret).update(body).digest("hex");

describe("webhook signature", () => {
  it("accepts a body signed with the secret key", async () => {
    expect(await isValidPaystackSignature(body, sig, secret)).toBe(true);
  });
  it("rejects a tampered body", async () => {
    expect(await isValidPaystackSignature(body.replace("rm-1", "rm-2"), sig, secret)).toBe(false);
  });
  it("rejects a missing signature", async () => {
    expect(await isValidPaystackSignature(body, null, secret)).toBe(false);
  });
});
