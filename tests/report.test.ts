// Tests for the Report Card layout and its required lines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runDrill } from "../sim/src/drill.js";
import { generateFolder } from "../sim/src/generate.js";
import { readFileSync } from "node:fs";
import type { CaseSpec } from "../sim/src/types.js";

const pack = JSON.parse(readFileSync("bench/drill-pack/expected.json", "utf8")) as { cases: CaseSpec[] };

function drillCase(id: string) {
  const spec = pack.cases.find((item) => item.id === id);
  if (!spec) throw new Error(`${id} missing`);
  return runDrill([generateFolder(spec.id, spec.fixture)], { owner: spec.owner });
}

test("a stopped phone folder names the gap, the cadence, and the real fix", () => {
  const report = drillCase("stopped-01").report;
  assert.ok(report.includes("74 days"));
  assert.ok(report.includes("Background App Refresh"));
  assert.ok(report.includes("grade C"));
  assert.ok(report.includes("Next drill due:"));
});

test("a stopped laptop folder names the copy job", () => {
  assert.ok(drillCase("stopped-02").report.includes("copy job has not run"));
});

test("the single-copy card offers the copy and bounds the path list", () => {
  const report = drillCase("single-01").report;
  assert.ok(report.includes("412"));
  assert.ok(report.includes("copy it to a second location"));
});

test("the ransomware card leads with the stop-syncing warning", () => {
  const report = drillCase("ransom-01").report;
  const lower = report.toLowerCase();
  assert.ok(lower.includes("stop syncing"));
  assert.ok(lower.includes("do not delete anything"));
  assert.ok(report.includes("214 files"));
});

test("an empty folder reports could not check and never a grade", () => {
  const drill = drillCase("healthy-04");
  assert.ok(drill.report.includes("could not check"));
  assert.ok(!drill.report.toLowerCase().includes("grade a"));
});

test("at most three fixes appear on a card", () => {
  const report = drillCase("ransom-01").report;
  const fixLines = report.split("\n").filter((line) => /^- [A-Z]/.test(line) && !line.startsWith("- Vanished") && !line.startsWith("- Single") && !line.startsWith("- Silent") && !line.startsWith("- Open") && !line.startsWith("- Ransomware"));
  assert.ok(fixLines.length <= 3, `expected at most 3 fixes, found ${fixLines.length}: ${JSON.stringify(fixLines)}`);
});

test("findings appear in the standing order: vanished, single copy, silent stop, open test", () => {
  const report = drillCase("stopped-01").report;
  const vanished = report.indexOf("Vanished since last drill");
  const single = report.indexOf("Single copy:");
  const stop = report.indexOf("Silent stop:");
  const open = report.indexOf("Open test:");
  assert.ok(vanished !== -1 && single !== -1 && stop !== -1 && open !== -1);
  assert.ok(vanished < single && single < stop && stop < open);
});
