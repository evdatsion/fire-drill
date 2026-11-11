// Tests for the rubric (highest severity wins, could-not-check never graded)
// and for deterministic generation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeFor } from "../sim/src/rubric.js";
import { generateFolder } from "../sim/src/generate.js";
import { readFileSync } from "node:fs";
import type { CaseSpec } from "../sim/src/types.js";

const quiet = { couldNotCheck: false, ransomwareTell: false, singleCopyCount: 0, silentStop: false, brokenCount: 0 };

test("rubric: the highest-severity finding wins", () => {
  assert.equal(gradeFor({ ...quiet, ransomwareTell: true, singleCopyCount: 500 }), "F");
  assert.equal(gradeFor({ ...quiet, singleCopyCount: 500, silentStop: true }), "D");
  assert.equal(gradeFor({ ...quiet, silentStop: true, brokenCount: 2 }), "C");
  assert.equal(gradeFor({ ...quiet, brokenCount: 3 }), "B");
  assert.equal(gradeFor({ ...quiet, singleCopyCount: 42 }), "B");
  assert.equal(gradeFor(quiet), "A");
});

test("rubric: more than three dead files is a C, not a B", () => {
  assert.equal(gradeFor({ ...quiet, brokenCount: 4 }), "C");
});

test("rubric: could not check is never graded", () => {
  assert.equal(gradeFor({ ...quiet, couldNotCheck: true }), null);
  assert.equal(gradeFor({ ...quiet, couldNotCheck: true, brokenCount: 9 }), null);
});

test("generation is deterministic for the same case id", () => {
  const pack = JSON.parse(readFileSync("bench/drill-pack/expected.json", "utf8"));
  const spec = (pack as { cases: CaseSpec[] }).cases.find((item) => item.id === "stopped-01");
  if (!spec) throw new Error("stopped-01 missing");
  const first = generateFolder(spec.id, spec.fixture);
  const second = generateFolder(spec.id, spec.fixture);
  assert.deepEqual(JSON.stringify(first), JSON.stringify(second));
});

test("generation honours the declared totals and age window", () => {
  const pack = JSON.parse(readFileSync("bench/drill-pack/expected.json", "utf8"));
  const spec = (pack as { cases: CaseSpec[] }).cases.find((item) => item.id === "ransom-01");
  if (!spec) throw new Error("ransom-01 missing");
  const tree = generateFolder(spec.id, spec.fixture);
  const burst = spec.fixture.burst;
  if (!burst) throw new Error("burst missing");
  assert.equal(tree.files.length, spec.fixture.history.totalFiles);
  const newest = Math.min(...tree.files.map((file) => file.mtimeDays));
  const oldest = Math.max(...tree.files.map((file) => file.mtimeDays));
  assert.ok(newest >= burst.endDaysAgo && newest <= burst.endDaysAgo + burst.windowHours / 24);
  assert.ok(oldest <= spec.fixture.history.oldestDaysAgo);
  const locked = tree.files.filter((file) => file.path.endsWith(burst.extension));
  assert.equal(locked.length, burst.count + 2); // burst plus the two named renamed files
});
