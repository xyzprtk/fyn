import { execFileSync } from "node:child_process";

const ports = [3000, 8000];
const requireServices = process.env.FYN_REQUIRE_SERVICES === "1";

let output = "";
try {
  output = execFileSync("ss", ["-ltnp"], { encoding: "utf8" });
} catch {
  if (requireServices) throw new Error("ss is required for strict port checks");
  console.log("port check skipped: ss is not available on this platform");
  process.exit(0);
}

for (const port of ports) {
  const listeners = output.split("\n").filter((line) => new RegExp(`:${port}\\b`).test(line));
  if (listeners.length === 0) {
    if (requireServices) throw new Error(`nothing is listening on ${port}`);
    console.log(`${port}: free`);
    continue;
  }
  if (listeners.length > 1) throw new Error(`${port}: multiple listening sockets detected`);
  console.log(`${port}: ${listeners[0].trim()}`);
}
