import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — never bundle it
  serverExternalPackages: ["better-sqlite3"],
  // app is the project root even though the repo root has its own lockfile
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default nextConfig;
