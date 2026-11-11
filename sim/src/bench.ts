// The bench: runs the same written rules over the 20 synthetic Drill Pack
// cases plus the two-drill vanish sequence, and writes bench/results.json.
// Everything here is deterministic; no wall-clock time is used.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CaseSpec, FolderTree } from "./types.js";
import { generateFolder } from "./generate.js";
import { runDrill } from "./drill.js";
import { buildManifest } from "./rules/vanish.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// here = dist/sim/src when compiled; three levels up is the repo root.
const repoRoot = path.resolve(here, "..", "..", "..");

interface CheckResult {
  flagSet: boolean;
  grade: boolean;
  reportLines: boolean;
  mustNotFlag: boolean;
}

interface CaseResult {
  id: string;
  family: string;
  name: string;
  expected: { flags: string[]; grade: string | null; verdict: string | null };
  actual: { flags: string[]; grade: string | null; verdict: string | null };
  matched: boolean;
  checks: CheckResult;
  /** The simulator's rendered Report Card for this case. */
  report: string;
}

function scoreCase(spec: CaseSpec): CaseResult {
  const tree: FolderTree = generateFolder(spec.id, spec.fixture);
  const drill = runDrill([tree], { owner: spec.owner });

  const expected = spec.expected;
  const expectedVerdict = expected.verdict ?? null;
  const actualVerdict = drill.verdict;

  const flagSet =
    drill.verdict === (expectedVerdict === "could-not-check" ? "could-not-check" : null) &&
    actualVerdict === expectedVerdict &&
    drill.flags.length === expected.flags.length &&
    expected.flags.every((flag) => drill.flags.includes(flag)) &&
    (drill.flags.length > 0) === expected.flagged;
  const grade = drill.grade === expected.grade;
  const haystack = drill.report.toLowerCase();
  const reportLines = expected.reportMustContain.every((line) => haystack.includes(line.toLowerCase()));
  const mustNotFlag = !expected.mustNotFlag.some((flag) => drill.flags.includes(flag));

  const checks: CheckResult = { flagSet, grade, reportLines, mustNotFlag };
  return {
    id: spec.id,
    family: spec.family,
    name: spec.name,
    expected: { flags: expected.flags, grade: expected.grade, verdict: expectedVerdict },
    actual: { flags: drill.flags, grade: drill.grade, verdict: actualVerdict },
    matched: Object.values(checks).every((value) => value === true),
    checks,
    report: drill.report
  };
}

function removeSpread(files: FolderTree["files"], removeCount: number, total: number): FolderTree["files"] {
  const removed = new Set<number>();
  let acc = 0;
  for (let i = 0; i < total; i += 1) {
    acc += removeCount;
    if (acc >= total) {
      acc -= total;
      removed.add(i);
    }
  }
  return files.filter((_, index) => !removed.has(index));
}

function runTwoDrill(): {
  folder: string;
  manifestFiles: number;
  largeDrop: { missing: number; warned: boolean; lastSeenReported: boolean; matched: boolean };
  smallDrop: { missing: number; warned: boolean; lastSeenReported: boolean; matched: boolean };
} {
  const folder: FolderTree = {
    name: "Mom-iPhone",
    scope: { role: "device-backup", device: "Mom's iPhone", originalsOnDevice: true },
    files: []
  };
  for (let i = 0; i < 1000; i += 1) {
    const fraction = i / 999;
    folder.files.push({
      path: `Mom-iPhone/2026-${String(1 + Math.floor(fraction * 11)).padStart(2, "0")}/photo-${String(i).padStart(5, "0")}.jpg`,
      kind: "photo-people",
      sizeBytes: 3_000_000 + i * 100,
      mtimeDays: 86 - fraction * 85
    });
  }

  const drill1 = runDrill([folder], { owner: "Mom" });
  const manifest = buildManifest(folder);

  const largeTree: FolderTree = { ...folder, files: removeSpread(folder.files, 387, 1000) };
  const drill2Large = runDrill([largeTree], { owner: "Mom", manifest, manifestDate: "2026-10-12" });
  const largeVanish = drill2Large.folders[0]?.vanish;
  const largeReport = drill2Large.report;
  const largeDrop = {
    missing: largeVanish?.missingCount ?? 0,
    warned: largeVanish?.largeDrop === true && largeReport.includes("Mass change"),
    lastSeenReported: largeReport.includes("last seen in Mom-iPhone"),
    matched:
      (largeVanish?.missingCount ?? 0) === 387 &&
      largeVanish?.largeDrop === true &&
      largeReport.includes("Mass change") &&
      largeReport.includes("last seen in Mom-iPhone") &&
      drill2Large.flags.includes("vanished")
  };

  const smallTree: FolderTree = { ...folder, files: removeSpread(folder.files, 5, 1000) };
  const drill2Small = runDrill([smallTree], { owner: "Mom", manifest, manifestDate: "2026-10-12" });
  const smallVanish = drill2Small.folders[0]?.vanish;
  const smallReport = drill2Small.report;
  const smallDrop = {
    missing: smallVanish?.missingCount ?? 0,
    warned: smallReport.includes("Mass change"),
    lastSeenReported: smallReport.includes("last seen in Mom-iPhone"),
    matched:
      (smallVanish?.missingCount ?? 0) === 5 &&
      smallVanish?.largeDrop === false &&
      !smallReport.includes("Mass change") &&
      smallReport.includes("last seen in Mom-iPhone") &&
      drill2Small.flags.includes("vanished")
  };

  if (manifest.fileCount !== 1000 || !drill1.report.includes("first drill")) {
    throw new Error("two-drill: drill 1 did not save a full manifest or missed the first-drill line");
  }

  return { folder: "Mom-iPhone", manifestFiles: manifest.fileCount, largeDrop, smallDrop };
}

export function runBench(): object {
  const packPath = path.join(repoRoot, "bench", "drill-pack", "expected.json");
  const pack = JSON.parse(readFileSync(packPath, "utf8")) as { cases: CaseSpec[] };

  const cases = pack.cases.map(scoreCase);
  const twoDrill = runTwoDrill();

  const score = cases.filter((item) => item.matched).length;
  const healthyFlagged = cases.filter((item) => item.family === "healthy").filter((item) => item.actual.flags.length > 0).length;
  const families = [...new Set(cases.map((item) => item.family))];
  const byFamily: Record<string, { total: number; matched: number }> = {};
  for (const family of families) {
    const inFamily = cases.filter((item) => item.family === family);
    byFamily[family] = { total: inFamily.length, matched: inFamily.filter((item) => item.matched).length };
  }

  const failures = cases.filter((item) => !item.matched);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${failure.id}: FAILED (checks: ${JSON.stringify(failure.checks)})`);
      console.error(`  expected ${JSON.stringify(failure.expected)}`);
      console.error(`  actual   ${JSON.stringify(failure.actual)}`);
    }
  }
  if (!twoDrill.largeDrop.matched || !twoDrill.smallDrop.matched) {
    console.error(`two-drill: FAILED (large: ${JSON.stringify(twoDrill.largeDrop)}, small: ${JSON.stringify(twoDrill.smallDrop)})`);
  }

  return {
    pack: "drill-pack",
    benchVersion: "1.0.0",
    simulator: "sim/ (TypeScript, Node >= 20); runs on a laptop, not a NAS",
    target: { minScore: 18, maxHealthyFlagged: 0 },
    cases,
    twoDrill,
    summary: {
      score,
      total: cases.length,
      healthyFlagged,
      twoDrillMatched: twoDrill.largeDrop.matched && twoDrill.smallDrop.matched,
      byFamily
    }
  };
}

function main(): void {
  const results = runBench();
  const outPath = path.join(repoRoot, "bench", "results.json");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
  const summary = (results as { summary: { score: number; total: number; healthyFlagged: number; twoDrillMatched: boolean } }).summary;
  console.log(`bench: ${summary.score}/${summary.total} cases matched, ${summary.healthyFlagged} healthy flagged, two-drill ${summary.twoDrillMatched ? "matched" : "FAILED"}`);
  console.log(`results written to ${path.relative(process.cwd(), outPath)}`);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
