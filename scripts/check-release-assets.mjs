#!/usr/bin/env node
// Checks that a GitHub release carries every file the Marketplace / HACS must install: sf-cards.js and one sf-cards-i18n-<lang>.js per
// extra language (the list is read from dist/). A release without the language files would switch nine languages to English.
//   node scripts/check-release-assets.mjs v1.27.0        (GH_TOKEN or GITHUB_TOKEN optional; GITHUB_REPOSITORY defaults to khrom06/SF-Cards)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.argv[2];
if (!tag) { console.error("usage: node scripts/check-release-assets.mjs <tag>"); process.exit(2); }
const want = fs.readdirSync(path.join(root, "dist")).filter((f) => f === "sf-cards.js" || /^sf-cards-i18n-[a-z]{2}\.js$/.test(f)).sort();
const repo = process.env.GITHUB_REPOSITORY || "khrom06/SF-Cards", token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const res = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, { headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
if (!res.ok) { console.error(`release ${tag}: HTTP ${res.status}`); process.exit(1); }
const have = new Set(((await res.json()).assets || []).map((a) => a.name));
const missing = want.filter((f) => !have.has(f));
if (missing.length) { console.error(`release ${tag} is missing ${missing.length} asset(s): ${missing.join(", ")}`); process.exit(1); }
console.log(`OK: release ${tag} carries the ${want.length} files (${want.join(", ")})`);
