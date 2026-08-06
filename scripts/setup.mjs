#!/usr/bin/env node
/**
 * One-shot local setup: app dependencies, python virtualenv + parser deps,
 * then database migrations and seed (once drizzle lands). Idempotent —
 * safe to re-run at any time.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const venvDir = path.join(root, "parser", ".venv");
const venvBin = path.join(venvDir, isWin ? "Scripts" : "bin");
const pip = path.join(venvBin, isWin ? "pip.exe" : "pip");
const python = isWin ? "python" : "python3";

function run(label, command, args) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin, // pnpm/pip are .cmd shims on windows
  });
  if (result.status !== 0) {
    console.error(`\nsetup failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run("install root dependencies", "pnpm", ["install"]);
run("install app dependencies", "pnpm", ["--dir", "app", "install"]);

if (existsSync(venvDir)) {
  console.log("\n> python virtualenv already exists, skipping creation");
} else {
  run("create python virtualenv", python, ["-m", "venv", venvDir]);
}

run("install parser dependencies", pip, [
  "install",
  "-r",
  path.join(root, "parser", "requirements.txt"),
]);

const hasDrizzle = ["drizzle.config.ts", "drizzle.config.js"].some((file) =>
  existsSync(path.join(root, "app", file)),
);
if (hasDrizzle) {
  run("apply database migrations", "pnpm", ["--dir", "app", "db:migrate"]);
  const hasSeed = existsSync(path.join(root, "app", "src", "db", "seed.ts"));
  if (hasSeed) {
    run("seed database", "pnpm", ["--dir", "app", "db:seed"]);
  }
} else {
  console.log("\n> drizzle not configured yet, skipping migrations + seed");
}

console.log("\nsetup complete — run `pnpm dev` to start web + parser");
