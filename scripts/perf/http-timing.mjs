import { performance } from "node:perf_hooks";

const baseUrl = process.env.FYN_BASE_URL ?? "http://127.0.0.1:3000";
const cookie = process.env.FYN_COOKIE ?? "";
const runs = Number.parseInt(process.env.FYN_RUNS ?? "2", 10);
const targets = [
  ["dashboard", "/dashboard"],
  ["transactions", "/transactions"],
  ["settings", "/settings"],
  ["upload", "/upload"],
  ["accounts", "/api/accounts"],
  ["rules", "/api/category-rules"],
  ["imports", "/api/imports"],
  ["stats", "/api/stats?from=2024-01-01&to=2026-12-31"],
  ["transactions-api", "/api/transactions?page=1"],
];

async function measure(path) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });
  const body = await response.arrayBuffer();
  return {
    status: response.status,
    milliseconds: Math.round((performance.now() - started) * 100) / 100,
    bytes: body.byteLength,
  };
}

console.log(`base: ${baseUrl}`);
console.log(`cookie: ${cookie ? "provided" : "not provided"}`);
console.log("target\tstatus\tcold_ms\twarm_ms\twarm_bytes");

for (const [name, path] of targets) {
  const measurements = [];
  for (let run = 0; run < Math.max(2, runs); run += 1) {
    measurements.push(await measure(path));
  }
  const first = measurements[0];
  const warm = measurements[measurements.length - 1];
  console.log(`${name}\t${warm.status}\t${first.milliseconds}\t${warm.milliseconds}\t${warm.bytes}`);
}
