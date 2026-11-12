#!/usr/bin/env node
// Renders the bench outputs from bench/results.json and nothing else:
//   docs/diagrams/bench-results.svg  bar chart of matched cases by family
//   README.md                        BENCH_* placeholders and badges filled
//   docs/results.md                  method and full results table
// With --check it recomputes all three and fails if the files on disk
// differ, so CI can catch drift between docs and results.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const checkOnly = process.argv.includes("--check");
const results = JSON.parse(readFileSync("bench/results.json", "utf8"));

const summary = results.summary;
const families = [
  { key: "stopped-backup", label: "Stopped backups" },
  { key: "broken-file", label: "Broken or partial files" },
  { key: "single-copy", label: "Only one copy" },
  { key: "ransomware-burst", label: "Mass change" },
  { key: "healthy", label: "Healthy controls (must not flag)" }
];

function readmeAfter() {
  const before = readFileSync("README.md", "utf8");
  let text = before;
  const score = `${summary.score}/${summary.total}`;
  text = text.replace(/Drill%20Pack-(?:BENCH_SCORE|\d+%2F\d+)-brightgreen/g, `Drill%20Pack-${encodeURIComponent(score)}-brightgreen`);
  text = text.replace(/healthy%20folders%20flagged-(?:HEALTHY_FLAGGED|\d+)-brightgreen/g, `healthy%20folders%20flagged-${summary.healthyFlagged}-brightgreen`);

  const row = (label, total, familyKey) => {
    const matched = summary.byFamily[familyKey]?.matched ?? 0;
    const pattern = new RegExp(`(\\| ${label} \\| ${total} \\| )(?:BENCH_[A-Z]+|\\d+)( \\|)`);
    return { pattern, replacement: `$1${matched}$2` };
  };
  const rows = [
    row("Stopped backups", 4, "stopped-backup"),
    row("Broken or partial files", 5, "broken-file"),
    row("Only one copy", 4, "single-copy"),
    row("Mass change", 3, "ransomware-burst"),
    row("Healthy controls \\(must not flag\\)", 4, "healthy")
  ];
  for (const { pattern, replacement } of rows) text = text.replace(pattern, replacement);
  text = text.replace(/(\| \*\*Total\*\* \| \*\*20\*\* \| \*\*)(?:BENCH_SCORE|\d+\/\d+)(\*\* \|)/, `$1${score}$2`);

  // Holdout packs. The v1 before-fix score (1/6) was recorded on Night 4 (PR #4).
  const v1 = results.blindPack ? `${results.blindPack.matched}/${results.blindPack.total}` : "n/a";
  const v2 = results.blindPackV2 ? `${results.blindPackV2.matched}/${results.blindPackV2.total}` : "n/a";
  const v1Before = "1/6";
  text = text.replace(/(\| Design pack \| )(?:DESIGN_SCORE|\d+\/\d+)( \|)/, `$1${score}$2`);
  text = text.replace(/(\| Blind pack v1 \| )(?:BLIND_V1_SCORE|\d+\/\d+)( \|)/, `$1${v1}$2`);
  text = text.replace(/\((?:BLIND_V1_BEFORE|\d+\/\d+) before the fixes, (?:BLIND_V1_SCORE|\d+\/\d+) after\)/, `(${v1Before} before the fixes, ${v1} after)`);
  text = text.replace(/(\| Blind pack v2 \| )(?:BLIND_V2_SCORE|\d+\/\d+)( \|)/, `$1${v2}$2`);

  if (existsSync("docs/diagrams/bench-results.svg")) {
    text = text.replace(
      /<!-- (<img src="docs\/diagrams\/bench-results\.svg"[^>]*>) -->/,
      "$1"
    );
  }
  return { text, changed: text !== before };
}

function svgAfter() {
  const width = 640;
  const rowHeight = 44;
  const barMax = 380;
  const rows = [...families, { key: "_total", label: "Total" }];
  const height = 92 + rows.length * rowHeight;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Drill Pack results">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);
  parts.push(`<text x="24" y="36" font-family="Segoe UI, sans-serif" font-size="20" font-weight="600" fill="#24292f">Drill Pack results</text>`);
  parts.push(`<text x="24" y="58" font-family="Segoe UI, sans-serif" font-size="13" fill="#57606a">simulation on synthetic data, bench on the reference simulator (not a NAS)</text>`);
  let y = 88;
  for (const family of rows) {
    const stat = family.key === "_total"
      ? { total: summary.total, matched: summary.score }
      : summary.byFamily[family.key];
    if (!stat) throw new Error(`results.json missing family ${family.key}`);
    const barWidth = stat.total > 0 ? Math.round((stat.matched / stat.total) * barMax) : 0;
    const restWidth = barMax - barWidth;
    parts.push(`<text x="24" y="${y + 18}" font-family="Segoe UI, sans-serif" font-size="14" fill="#24292f">${family.label}</text>`);
    parts.push(`<rect x="24" y="${y + 26}" width="${barWidth}" height="14" rx="3" fill="#1a7f37"/>`);
    if (restWidth > 0) parts.push(`<rect x="${24 + barWidth}" y="${y + 26}" width="${restWidth}" height="14" rx="3" fill="#d0d7de"/>`);
    parts.push(`<text x="${24 + barMax + 12}" y="${y + 38}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="600" fill="#24292f">${stat.matched}/${stat.total}</text>`);
    y += rowHeight;
  }
  parts.push(`</svg>`);
  return parts.join("\n") + "\n";
}

function resultsMdAfter() {
  const lines = [];
  lines.push("# Results");
  lines.push("");
  lines.push(`The bench applies the written rules from the skill references to 20 synthetic Drill Pack folders on the reference simulator (\`sim/\`, TypeScript, Node >= 20). It runs on a laptop, not a NAS; finalist day reports the measured score on a device. The simulator models the UGOS expert outputs: a fixture file's declared state determines its open-test verdict, its kind determines its tier, and hashes are computed over the synthetic content.`);
  lines.push("");
  lines.push(`Score: **${summary.score}/${summary.total}** cases matched, **${summary.healthyFlagged}** healthy folders flagged, two-drill sequence **${summary.twoDrillMatched ? "matched" : "FAILED"}**. Target: at least ${results.target.minScore}/20 with zero healthy folders flagged.`);
  lines.push("");
  lines.push("## By family");
  lines.push("");
  lines.push("| Family | Matched | Total |");
  lines.push("|---|---|---|");
  for (const family of families) {
    const stat = summary.byFamily[family.key];
    lines.push(`| ${family.label} | ${stat?.matched ?? 0} | ${stat?.total ?? 0} |`);
  }
  lines.push("");
  lines.push("## Per case");
  lines.push("");
  lines.push("| Case | Family | Expected | Actual | Matched |");
  lines.push("|---|---|---|---|---|");
  for (const item of results.cases) {
    const expected = `${item.expected.grade ?? item.expected.verdict ?? "-"}${item.expected.flags.length > 0 ? `, ${item.expected.flags.join(", ")}` : ""}`;
    const actual = `${item.actual.grade ?? item.actual.verdict ?? "-"}${item.actual.flags.length > 0 ? `, ${item.actual.flags.join(", ")}` : ""}`;
    lines.push(`| ${item.id} | ${item.family} | ${expected} | ${actual} | ${item.matched ? "yes" : "NO"} |`);
  }
  lines.push("");
  lines.push("## Two-drill vanish sequence");
  lines.push("");
  lines.push(`Drill 1 on the 1000-photo folder saved a manifest of ${results.twoDrill.manifestFiles} irreplaceable files. Drill 2 ran twice against it:`);
  lines.push("");
  lines.push(`- Large drop, 387 files missing: ${results.twoDrill.largeDrop.matched ? "reported with last-seen folder and the mass-change warning" : "FAILED"}.`);
  lines.push(`- Small drop, 5 files missing: ${results.twoDrill.smallDrop.matched ? "reported without the mass-change warning" : "FAILED"}.`);
  lines.push("");
  const blindSection = (pack, title) => {
    if (!pack) return;
    lines.push(`## ${title}: ${pack.matched}/${pack.total}`);
    lines.push("");
    lines.push("| Case | Matched | Expected | Actual |");
    lines.push("|---|---|---|---|");
    for (const item of pack.cases) {
      const exp = `${item.expected.grade ?? item.expected.verdict ?? "-"}${item.expected.flags.length > 0 ? `, ${item.expected.flags.join(", ")}` : ""}`;
      const act = `${item.actual.grade ?? item.actual.verdict ?? "-"}${item.actual.flags.length > 0 ? `, ${item.actual.flags.join(", ")}` : ""}`;
      lines.push(`| ${item.id} | ${item.matched ? "yes" : "NO"} | ${exp} | ${act} |`);
    }
    lines.push("");
  };
  blindSection(results.blindPack, "Blind pack v1 (adversarial holdout), after fixes");
  blindSection(results.blindPackV2, "Blind pack v2 (post-fix holdout)");

  lines.push("## Reproduce");
  lines.push("");
  lines.push("```");
  lines.push("npm ci");
  lines.push("npm run bench");
  lines.push("node bench/validate-expected.mjs bench/drill-pack/expected.json");
  lines.push("```");
  lines.push("");
  lines.push("Raw machine output: [bench/results.json](../bench/results.json). Generated by `node bench/render.mjs`; do not edit the numbers by hand.");
  lines.push("");
  return lines.join("\n");
}

const outputs = [
  { path: "docs/diagrams/bench-results.svg", render: svgAfter },
  { path: "README.md", render: () => readmeAfter().text },
  { path: "docs/results.md", render: resultsMdAfter }
];

let drifted = false;
mkdirSync("docs/diagrams", { recursive: true });
for (const output of outputs) {
  const content = output.render();
  const onDisk = existsSync(output.path) ? readFileSync(output.path, "utf8") : "";
  if (checkOnly) {
    if (onDisk !== content) {
      console.error(`drift: ${output.path} does not match bench/results.json (run node bench/render.mjs)`);
      drifted = true;
    }
  } else if (onDisk !== content) {
    writeFileSync(output.path, content);
    console.log(`rendered ${output.path}`);
  }
}
if (checkOnly) {
  if (drifted) process.exit(1);
  console.log("render check ok: README, results.md and bench-results.svg match results.json");
} else {
  console.log(`score ${summary.score}/${summary.total}, ${summary.healthyFlagged} healthy flagged`);
}
