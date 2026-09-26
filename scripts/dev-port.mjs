#!/usr/bin/env node
/**
 * Resolve the web dev port up front, then hand it to `next dev`.
 *
 * Next already falls back to the next free port on its own, but it does so
 * silently — the chosen URL is easy to miss in concurrently's prefixed
 * output, and opening the documented port can land on a completely
 * different app (this exact failure hit us when another project's dev
 * server squatted on 3000). Probing here lets us:
 *   - pick the first free port from 3000 upward (3001, 3002, ...),
 *   - honor an explicit PORT env override,
 *   - print the resolved URL as a standalone banner line.
 *
 * Run from app/ (pnpm --dir app dev) so next resolves against the right
 * node_modules and cwd.
 */
import net from "node:net";
import { spawn } from "node:child_process";

const MAX_PROBE_AHEAD = 100;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

const requestedRaw = process.env.PORT ?? "3000";
const requested = Number.parseInt(requestedRaw, 10);
if (!Number.isSafeInteger(requested) || requested < 1 || requested > 65535) {
  console.error(`invalid PORT: ${requestedRaw}`);
  process.exit(1);
}

let port = requested;
while (!(await isPortFree(port))) {
  port += 1;
  if (port > requested + MAX_PROBE_AHEAD) {
    console.error(`no free port found between ${requested} and ${port - 1}`);
    process.exit(1);
  }
}

if (port !== requested) {
  console.log(`port ${requested} is in use — using ${port} instead`);
}
console.log(`\n  fyn web → http://localhost:${port}\n`);

const isWin = process.platform === "win32";
const child = spawn("next", ["dev", "--turbopack", "--port", String(port)], {
  stdio: "inherit",
  shell: isWin, // next is a .cmd shim on windows
});
child.on("exit", (code) => process.exit(code ?? 0));
