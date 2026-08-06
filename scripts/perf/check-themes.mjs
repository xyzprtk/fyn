import fs from "node:fs";
import path from "node:path";

const cssPath = path.resolve("app/src/app/globals.css");
const css = fs.readFileSync(cssPath, "utf8");
const requiredTokens = ["--background", "--foreground", "--card", "--primary", "--border"];

for (const selector of [":root", ".dark"]) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing ${selector} theme block`);
  const end = css.indexOf("}", start);
  const block = css.slice(start, end);
  for (const token of requiredTokens) {
    if (!block.includes(`${token}:`)) throw new Error(`${selector} is missing ${token}`);
  }
}

console.log("theme tokens: light and dark blocks contain required surface tokens");
