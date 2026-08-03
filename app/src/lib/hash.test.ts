import { describe, expect, it } from "vitest";

import { normalizeDescription, transactionHash } from "./hash";

describe("transactionHash", () => {
  it("normalizes whitespace and trailing reference digits", () => {
    expect(normalizeDescription("  UPI-SWIGGY   123456  ")).toBe("upi-swiggy");
    expect(
      transactionHash(4, "2026-06-03", -450, "UPI-SWIGGY 123456"),
    ).toBe(transactionHash(4, "2026-06-03", -450, "upi-swiggy"));
  });

  it("changes when account, date or amount changes", () => {
    const original = transactionHash(4, "2026-06-03", -450, "UPI-SWIGGY");
    expect(transactionHash(5, "2026-06-03", -450, "UPI-SWIGGY")).not.toBe(original);
    expect(transactionHash(4, "2026-06-04", -450, "UPI-SWIGGY")).not.toBe(original);
    expect(transactionHash(4, "2026-06-03", -451, "UPI-SWIGGY")).not.toBe(original);
  });
});
