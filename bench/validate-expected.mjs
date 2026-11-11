#!/usr/bin/env node
// Validates bench/drill-pack/expected.json against the Drill Pack contract:
// 20 cases (4 stopped backups, 5 broken files, 4 single-copy sets,
// 3 ransomware-style rename bursts, 4 healthy controls), each with a
// generator-grade fixture and an expected result consistent with the rubric
// in the skill references.
import { readFile } from "node:fs/promises";

const file = process.argv[2] ?? "bench/drill-pack/expected.json";
const pack = JSON.parse(await readFile(file, "utf8"));
const problems = [];
const cases = pack.cases;

const familyTargets = { "stopped-backup": 4, "broken-file": 5, "single-copy": 4, "ransomware-burst": 3, healthy: 4 };
const knownFlags = new Set(["silent-stop", "broken-file", "single-copy", "ransomware-tell", "vanished"]);
const grades = new Set(["A", "B", "C", "D", "F"]);

function check(condition, id, message) {
  if (!condition) problems.push(`${id}: ${message}`);
}

check(Array.isArray(cases), "pack", "cases must be an array");
if (Array.isArray(cases)) {
  check(cases.length === 20, "pack", `expected 20 cases, found ${cases.length}`);

  const counts = {};
  const ids = new Set();
  for (const item of cases) {
    const id = item.id;
    check(typeof id === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id), id ?? "(no id)", "id missing or not lowercase-hyphenated");
    check(!ids.has(id), id, "duplicate id");
    ids.add(id);

    counts[item.family] = (counts[item.family] ?? 0) + 1;
    for (const field of ["family", "name", "owner", "summary"]) {
      check(typeof item[field] === "string" && item[field].length > 0, id, `missing ${field}`);
    }

    const fixture = item.fixture;
    check(fixture && typeof fixture === "object", id, "missing fixture");
    check(Array.isArray(fixture?.folders) && fixture.folders.length > 0, id, "fixture.folders must be a non-empty array");
    const scope = fixture?.scope;
    check(scope && (scope.role === "device-backup" || scope.role === "archive"), id, "scope.role must be device-backup or archive");
    check(scope && typeof scope.originalsOnDevice === "boolean", id, "scope.originalsOnDevice must be boolean");
    check(scope && typeof scope.device === "string" && scope.device.length > 0, id, "scope.device missing");
    const history = fixture?.history;
    check(history && Number.isInteger(history.totalFiles) && history.totalFiles >= 0, id, "history.totalFiles must be a non-negative integer");
    check(history && Number.isInteger(history.endDaysAgo) && history.endDaysAgo >= 0, id, "history.endDaysAgo must be a non-negative integer");
    check(history && Number.isInteger(history.oldestDaysAgo) && history.oldestDaysAgo >= history.endDaysAgo, id, "history.oldestDaysAgo must be >= endDaysAgo");
    check(Array.isArray(fixture?.files), id, "fixture.files must be an array");

    const named = fixture?.files ?? [];
    let namedBytes = 0;
    let newestNamed = Infinity;
    for (const f of named) {
      check(typeof f.path === "string" && /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/.test(f.path), id, `fixture path not relative and plain: ${f.path}`);
      check(typeof f.sizeBytes === "number" && f.sizeBytes >= 0, id, `sizeBytes missing for ${f.path}`);
      check(typeof f.mtimeDaysAgo === "number" && f.mtimeDaysAgo >= 0, id, `mtimeDaysAgo missing for ${f.path}`);
      check(history && f.mtimeDaysAgo <= history.oldestDaysAgo && f.mtimeDaysAgo >= history.endDaysAgo, id, `mtime of ${f.path} outside the history window`);
      namedBytes += f.sizeBytes ?? 0;
      newestNamed = Math.min(newestNamed, f.mtimeDaysAgo ?? Infinity);
    }

    const burst = fixture?.burst;
    if (burst !== undefined) {
      check(typeof burst.extension === "string" && /^\.[A-Za-z0-9.]+$/.test(burst.extension), id, "burst.extension must look like an extension");
      check(Number.isInteger(burst.count) && burst.count >= 20, id, "burst.count must be at least 20");
      check(typeof burst.windowHours === "number" && burst.windowHours > 0 && burst.windowHours <= 48, id, "burst.windowHours must be within 48 hours");
      check(Number.isInteger(burst.endDaysAgo) && burst.endDaysAgo >= 0, id, "burst.endDaysAgo must be a non-negative integer");
    }

    check(history && history.totalFiles >= named.length + (burst?.count ?? 0), id, "history.totalFiles must cover named files plus the burst");

    const expected = item.expected;
    check(expected && typeof expected === "object", id, "missing expected");
    if (!expected) continue;
    check(typeof expected.flagged === "boolean", id, "expected.flagged must be boolean");
    check(Array.isArray(expected.flags), id, "expected.flags must be an array");
    for (const flag of expected.flags) check(knownFlags.has(flag), id, `unknown flag ${flag}`);
    check(Array.isArray(expected.reportMustContain) && expected.reportMustContain.length > 0, id, "reportMustContain must be a non-empty array");
    check(Array.isArray(expected.mustNotFlag), id, "mustNotFlag must be an array");
    for (const flag of expected.mustNotFlag) check(knownFlags.has(flag), id, `unknown mustNotFlag entry ${flag}`);
    check(expected.grade === null || grades.has(expected.grade), id, "grade must be A, B, C, D, F or null");
    check(expected.flagged === (expected.flags.length > 0), id, "flagged must agree with flags");
    check(!expected.flags.some((flag) => (expected.mustNotFlag ?? []).includes(flag)), id, "a flag must not also be in mustNotFlag");

    if (item.family === "healthy") {
      check(expected.flagged === false, id, "healthy control must not be flagged");
      check(expected.grade === "A" || (expected.grade === null && expected.verdict === "could-not-check"), id, "healthy control grades A, or null with verdict could-not-check");
    } else {
      check(expected.flagged === true, id, "non-healthy case must be flagged");
      check(grades.has(expected.grade), id, "non-healthy case needs a grade A-F");
    }

    if (item.family === "stopped-backup") {
      check(expected.flags.includes("silent-stop"), id, "stopped case must flag silent-stop");
      check(scope?.role === "device-backup", id, "silent-stop applies to device-backup folders");
      check(history.totalFiles >= 4, id, "a stopped folder needs enough arrivals to know a rhythm (at least 4 files)");
      const silent = expected.silentStop;
      check(silent && silent.newestFileGapDays === history.endDaysAgo, id, "silentStop.newestFileGapDays must equal history.endDaysAgo");
      check(silent && typeof silent.weeklyCadence === "number" && silent.weeklyCadence > 0, id, "silentStop.weeklyCadence must be positive");
      check(silent && history.endDaysAgo >= 14, id, "the written rule floor is 14 days: the gap must reach it");
      check(expected.grade === "C", id, "rubric: silent stop grades C");
    }

    if (item.family === "broken-file") {
      check(expected.flags.includes("broken-file"), id, "broken case must flag broken-file");
      const broken = expected.broken;
      check(broken && Array.isArray(broken.paths) && broken.paths.length > 0, id, "broken.paths must list at least one file");
      check(broken && ["fails-to-open", "opens-but-wrong"].includes(broken.verdict), id, "broken.verdict must be fails-to-open or opens-but-wrong");
      const fixturePaths = new Set(named.map((f) => f.path));
      for (const brokenPath of broken?.paths ?? []) {
        check(fixturePaths.has(brokenPath), id, `broken path not in fixture: ${brokenPath}`);
        const entry = named.find((f) => f.path === brokenPath);
        check(entry && typeof entry.problem === "string" && entry.problem.length > 0, id, `broken fixture file needs a problem note: ${brokenPath}`);
      }
      check(broken && broken.paths.length <= 3, id, "rubric: grade B covers at most 3 broken files");
      check(expected.grade === "B", id, "rubric: at most 3 broken sampled files grades B");
    }

    if (item.family === "single-copy") {
      check(expected.flags.includes("single-copy"), id, "single-copy case must flag single-copy");
      check(scope?.originalsOnDevice === false, id, "a single-copy set means the originals exist nowhere else");
      const single = expected.singleCopy;
      check(single && single.files === history.totalFiles, id, "singleCopy.files must equal history.totalFiles");
      check(single && typeof single.approxBytes === "number" && single.approxBytes > 0, id, "singleCopy.approxBytes must be positive");
      check(expected.grade === (single?.files >= 100 ? "D" : "B"), id, "rubric: single-copy set of 100 or more grades D, under 100 grades B");
    }

    if (item.family === "ransomware-burst") {
      check(expected.flags.includes("ransomware-tell"), id, "ransomware case must flag ransomware-tell");
      check(expected.grade === "F", id, "rubric: ransomware tell grades F");
      const text = (expected.reportMustContain ?? []).join(" ").toLowerCase();
      check(text.includes("stop syncing") && text.includes("do not delete anything"), id, "ransomware report must carry the stop-syncing warning");
      check(burst !== undefined, id, "ransomware case needs a burst block for the generator");
    }

    if (item.family !== "single-copy" && item.family !== "healthy") {
      check(scope?.originalsOnDevice === true, id, "device-backup cases keep their originals on the device");
    }

    if (expected.verdict === "could-not-check") {
      check(expected.grade === null, id, "could-not-check must not carry a grade");
      check(history.totalFiles === 0, id, "could-not-check fixture holds no files");
    }
  }

  for (const [family, target] of Object.entries(familyTargets)) {
    check(counts[family] === target, "pack", `family ${family} must hold ${target} cases, found ${counts[family] ?? 0}`);
  }
}

if (problems.length > 0) {
  console.error(`drill-pack INVALID (${problems.length} problem(s)):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const byFamily = {};
for (const item of cases) byFamily[item.family] = (byFamily[item.family] ?? 0) + 1;
console.log(`drill-pack OK: 20 cases, ${Object.entries(byFamily).map(([family, count]) => `${family}=${count}`).join(", ")}`);
