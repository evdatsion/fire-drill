// Tests for the silent-stop rule: flag, healthy, archive exemption,
// insufficient history, and the threshold boundaries.
import { test } from "node:test";
import assert from "node:assert/strict";
import { silentStop } from "../sim/src/rules/silentStop.js";
import type { FolderTree, SynthFile } from "../sim/src/types.js";

function folder(files: SynthFile[], role: "device-backup" | "archive" = "device-backup"): FolderTree {
  return { name: "Test", scope: { role, device: "Test device", originalsOnDevice: true }, files };
}

function photo(daysAgo: number): SynthFile {
  return { path: `Test/photo-${daysAgo}.jpg`, kind: "photo-people", sizeBytes: 1000, mtimeDays: daysAgo };
}

test("flags a device-backup folder whose weekly flow stopped long ago", () => {
  // About 40 files a week for six weeks ending 74 days ago.
  const files: SynthFile[] = [];
  for (let i = 0; i < 249; i += 1) files.push(photo(116 - (i * 42) / 249));
  const result = silentStop(folder(files));
  assert.equal(result.flag, true);
  assert.equal(Math.round(result.gapDays), 74);
  assert.ok(result.cadencePerWeek > 35 && result.cadencePerWeek < 50);
});

test("does not flag an active folder", () => {
  const result = silentStop(folder([photo(2), photo(3), photo(9), photo(10), photo(16)]));
  assert.equal(result.flag, false);
});

test("does not flag an archive folder, whatever the gap", () => {
  const result = silentStop(folder([photo(4000), photo(4001)], "archive"));
  assert.equal(result.reason, "not-applicable-archive");
  assert.equal(result.flag, false);
});

test("reports insufficient history instead of guessing on a 3-file folder", () => {
  const result = silentStop(folder([photo(250), photo(160), photo(40)]));
  assert.equal(result.reason, "insufficient-history");
  assert.equal(result.flag, false);
  assert.equal(result.rhythmDays, null);
});

test("respects the folder's own rhythm: gap 89 on a monthly rhythm is healthy, 90 is a flag", () => {
  const monthly = (newest: number): SynthFile[] =>
    [0, 1, 2, 3, 4, 5, 6].map((i) => photo(newest + i * 30));
  assert.equal(silentStop(folder(monthly(89))).flag, false);
  assert.equal(silentStop(folder(monthly(90))).flag, true);
});

test("the 14-day floor flags a daily folder after two silent weeks", () => {
  const files: SynthFile[] = [];
  for (let i = 0; i < 60; i += 1) files.push(photo(21 + i / 3));
  const result = silentStop(folder(files));
  assert.equal(result.flag, true);
  assert.ok(result.rhythmDays !== null && result.rhythmDays < 1);
});

test("an empty folder has no rhythm to know", () => {
  assert.equal(silentStop(folder([])).reason, "insufficient-history");
});
