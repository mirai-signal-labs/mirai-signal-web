/**
 * tokenize-colors.mjs
 *
 * Replaces every hardcoded hex color in src/**\/*.tsx with its design token.
 * Run once, review the diff, commit.
 *
 *   node scripts/tokenize-colors.mjs --dry    # preview only
 *   node scripts/tokenize-colors.mjs          # write
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src";
const DRY = process.argv.includes("--dry");

/** hex (lowercase, normalized to 6 digits) -> token name */
const HEX_TO_TOKEN = {
  // surfaces
  "#080810": "ms-bg",
  "#0a0a14": "ms-bg-subtle",
  "#0b0b14": "ms-bg-sidebar",
  "#0e0e1a": "ms-bg-card",
  "#12121e": "ms-bg-tag",
  "#14142a": "ms-bg-elevated",
  // borders
  "#1e1e30": "ms-border",
  "#1a1a28": "ms-border-nav",
  "#2a2a40": "ms-border-soft",
  "#555555": "ms-border-input",
  // accent
  "#534ab7": "ms-accent",
  "#7f77dd": "ms-accent-strong",
  "#1a1830": "ms-accent-dim",
  "#26215c": "ms-accent-border",
  "#ffffff": "ms-on-accent",
  // text
  "#e8e6ff": "ms-text-strong",
  "#cecbf6": "ms-text-link",
  "#c8c4ff": "ms-text-heading",
  "#afa9ec": "ms-text-primary",
  "#a0a0c0": "ms-text-meta",
  "#888780": "ms-text-tertiary",
  "#5f5e5a": "ms-text-secondary",
  "#444441": "ms-text-label",
  "#3c3489": "ms-text-muted",
  "#2c2c2a": "ms-text-disabled",
  "#999999": "ms-text-button-muted",
  // status
  "#1d9e75": "ms-green",
  "#0f6e56": "ms-green-border",
  "#0a1f18": "ms-green-bg",
  "#993c1d": "ms-red",
  "#712b13": "ms-red-border",
  "#1f0a0a": "ms-red-bg",
  "#e05a5a": "ms-error",
};

/** old var name -> new var name */
const VAR_RENAMES = {
  "--ms-accent-light": "--ms-accent-strong",
};

function expand(hex) {
  const h = hex.toLowerCase();
  if (h.length === 4) return "#" + h.slice(1).split("").map((c) => c + c).join("");
  return h;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === ".tsx" || extname(p) === ".ts") out.push(p);
  }
  return out;
}

const unmapped = new Map();
let changedFiles = 0;
let replacements = 0;

for (const file of walk(ROOT)) {
  const original = readFileSync(file, "utf8");
  let next = original;

  // 1. rename outdated variables
  for (const [oldVar, newVar] of Object.entries(VAR_RENAMES)) {
    next = next.split(oldVar).join(newVar);
  }

  // 2. hex -> var()
  next = next.replace(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g, (match) => {
    const token = HEX_TO_TOKEN[expand(match)];
    if (!token) {
      unmapped.set(match, (unmapped.get(match) ?? 0) + 1);
      return match;
    }
    replacements++;
    return `var(--${token})`;
  });

  if (next !== original) {
    changedFiles++;
    if (!DRY) writeFileSync(file, next, "utf8");
    console.log(`${DRY ? "would update" : "updated"}: ${file}`);
  }
}

console.log(`\n${replacements} replacements across ${changedFiles} files.`);

if (unmapped.size) {
  console.log("\nUNMAPPED COLORS — add these to HEX_TO_TOKEN and re-run:");
  for (const [hex, count] of [...unmapped].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${hex}  (${count}x)`);
  }
  process.exitCode = 1;
}
