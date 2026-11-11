// The bench: runs the same written rules over the 20 synthetic Drill Pack
// cases plus the two-drill vanish sequence, and writes bench/results.json.
// Everything here is deterministic; no wall-clock time is used.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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

// Blind pack: an adversarial holdout scored against the shipped rules. It
// checks the same fields as the design pack AND the single-copy count and the
// silent-stop gap, because some holdout misses are count-level and flags+grade
// alone would hide them. The rules are untouched; this only measures them.
interface BlindCaseResult {
  id: string;
  family: string;
  name: string;
  expected: { flags: string[]; grade: string | null; verdict: string | null; singleCopyFiles: number | null; silentStopGapDays: number | null };
  actual: { flags: string[]; grade: string | null; verdict: string | null; singleCopyFiles: number; silentStopGapDays: number; silentStopFlag: boolean };
  checks: Record<string, boolean>;
  matched: boolean;
  report: string;
}

function scoreBlindCase(spec: CaseSpec): BlindCaseResult {
  const tree: FolderTree = generateFolder(spec.id, spec.fixture);
  const drill = runDrill([tree], { owner: spec.owner });
  const finding = drill.folders[0];
  const e = spec.expected;
  const expectedVerdict = e.verdict ?? null;

  const checks: Record<string, boolean> = {};
  checks.flagSet =
    drill.verdict === expectedVerdict &&
    drill.flags.length === e.flags.length &&
    e.flags.every((flag) => drill.flags.includes(flag)) &&
    (drill.flags.length > 0) === e.flagged;
  checks.grade = drill.grade === e.grade;
  const haystack = drill.report.toLowerCase();
  checks.reportLines = e.reportMustContain.every((line) => haystack.includes(line.toLowerCase()));
  checks.mustNotFlag = !e.mustNotFlag.some((flag) => drill.flags.includes(flag));

  const actualSingle = finding?.singleCopy.count ?? 0;
  const actualGap = finding ? Math.round(finding.silentStop.gapDays) : 0;
  const expectedSingle = e.singleCopy?.files ?? null;
  const expectedGap = e.silentStop?.newestFileGapDays ?? null;
  if (expectedSingle !== null) checks.singleCopyCount = actualSingle === expectedSingle;
  if (expectedGap !== null) checks.silentStopGap = actualGap === expectedGap;

  return {
    id: spec.id,
    family: spec.family,
    name: spec.name,
    expected: { flags: e.flags, grade: e.grade, verdict: expectedVerdict, singleCopyFiles: expectedSingle, silentStopGapDays: expectedGap },
    actual: { flags: drill.flags, grade: drill.grade, verdict: drill.verdict, singleCopyFiles: actualSingle, silentStopGapDays: actualGap, silentStopFlag: finding?.silentStop.flag ?? false },
    checks,
    matched: Object.values(checks).every((value) => value === true),
    report: drill.report
  };
}

function runBlindPack(dirName: string, label: string): { pack: string; version: string; matched: number; total: number; cases: BlindCaseResult[] } | null {
  const packPath = path.join(repoRoot, "bench", dirName, "expected.json");
  if (!existsSync(packPath)) return null;
  const pack = JSON.parse(readFileSync(packPath, "utf8")) as { version: string; cases: CaseSpec[] };
  const cases = pack.cases.map(scoreBlindCase);
  return { pack: label, version: pack.version, matched: cases.filter((item) => item.matched).length, total: cases.length, cases };
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
  const blindPack = runBlindPack("blind-pack", "blind-v1");
  const blindPackV2 = runBlindPack("blind-pack-v2", "blind-v2");

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
    blindPack,
    blindPackV2,
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
  const typed = results as { blindPack: PackResult; blindPackV2: PackResult };
  for (const [label, pack] of [["blind v1", typed.blindPack], ["blind v2", typed.blindPackV2]] as const) {
    if (!pack) continue;
    const misses = pack.cases.filter((item) => !item.matched).map((item) => item.id);
    console.log(`${label} (adversarial holdout): ${pack.matched}/${pack.total} matched${misses.length > 0 ? `; misses: ${misses.join(", ")}` : ""}`);
  }
}

type PackResult = { matched: number; total: number; cases: { id: string; matched: boolean }[] } | null;

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
