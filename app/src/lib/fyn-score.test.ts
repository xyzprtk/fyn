import { describe, expect, it } from "vitest";

import { fynScore } from "./fyn-score";

describe("fynScore", () => {
  it("returns zero when there is no income", () => {
    expect(fynScore(0, 100)).toEqual({ score: 0, verdict: "NOT_FYN", savingsRate: 0 });
  });

  it("clamps negative and high savings rates", () => {
    expect(fynScore(100, 200).score).toBe(0);
    expect(fynScore(100, 0).score).toBe(100);
  });

  it("uses the 40 and 70 verdict boundaries", () => {
    expect(fynScore(100, 80).verdict).toBe("MOSTLY_FYN");
    expect(fynScore(100, 65).verdict).toBe("FYN");
    expect(fynScore(100, 80).score).toBe(40);
    expect(fynScore(100, 65).score).toBe(70);
  });
});
