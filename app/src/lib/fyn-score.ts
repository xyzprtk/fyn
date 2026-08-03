export type FynVerdict = "FYN" | "MOSTLY_FYN" | "NOT_FYN";

export type FynScore = {
  score: number;
  verdict: FynVerdict;
  savingsRate: number;
};

export function fynScore(income: number, spend: number): FynScore {
  if (income <= 0) return { score: 0, verdict: "NOT_FYN", savingsRate: 0 };

  const savingsRate = (income - spend) / income;
  const score = Math.round(Math.min(Math.max(savingsRate * 200, 0), 100));
  const verdict = score >= 70 ? "FYN" : score >= 40 ? "MOSTLY_FYN" : "NOT_FYN";
  return { score, verdict, savingsRate };
}
