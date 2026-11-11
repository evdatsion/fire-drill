// Tests for tiering, sampling caps, the oldest-quarter weighting, and the
// open-test verdict mapping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openTest, sampleForTier, tierFiles } from "../sim/src/rules/openTest.js";
import type { FolderTree, SynthFile } from "../sim/src/types.js";

function folder(files: SynthFile[]): FolderTree {
  return { name: "Test", scope: { role: "device-backup", device: "d", originalsOnDevice: true }, files };
}

function photo(daysAgo: number, problem?: string): SynthFile {
  return { path: `Test/p${daysAgo}-${Math.random().toString(36).slice(2, 8)}.jpg`, kind: "photo-people", sizeBytes: 10, mtimeDays: daysAgo, ...(problem ? { problem } : {}) };
}

test("caps samples at 30, 20 and 10 per tier", () => {
  const files: SynthFile[] = [];
  for (let i = 0; i < 50; i += 1) files.push({ ...photo(100 - i), path: `Test/t1-${i}.jpg`, kind: "photo-people" });
  for (let i = 0; i < 30; i += 1) files.push({ ...photo(100 - i), path: `Test/t2-${i}.pdf`, kind: "document" });
  for (let i = 0; i < 15; i += 1) files.push({ ...photo(100 - i), path: `Test/t3-${i}.png`, kind: "screenshot" });
  const tree = folder(files);
  assert.equal(sampleForTier(tree, 1).length, 30);
  assert.equal(sampleForTier(tree, 2).length, 20);
  assert.equal(sampleForTier(tree, 3).length, 10);
});

test("samples everything when a tier is smaller than its cap", () => {
  const tree = folder([photo(10), photo(20), photo(30)]);
  assert.equal(sampleForTier(tree, 1).length, 3);
});

test("a folder with fewer than five files gets every file opened", () => {
  const tree = folder([photo(10), photo(20, "truncated-jpg"), photo(30), photo(40)]);
  const result = openTest(tree);
  assert.equal(result.attempted, 4);
});

test("at least one quarter of the sample comes from the oldest quarter", () => {
  const files: SynthFile[] = [];
  for (let i = 0; i < 249; i += 1) files.push({ ...photo(116 - (i * 42) / 249), path: `Test/p-${i}.jpg` });
  const tree = folder(files);
  const sample = sampleForTier(tree, 1);
  const oldest = sample.filter((file) => file.mtimeDays >= 105); // oldest quarter of 116..74
  assert.ok(oldest.length >= Math.ceil(30 / 4));
});

test("verdict mapping follows the declared problem", () => {
  const files = [
    photo(10),
    photo(11, "truncated-jpg: cut"),
    photo(12, "zero-byte-pdf: empty"),
    photo(13, "renamed-non-image: text"),
    photo(14, "corrupted-heic: garbage body"),
    photo(15, "half-written-video: no index"),
    photo(16, "blank-image: renders blank")
  ];
  const result = openTest(folder(files));
  const byPath = new Map(result.verdicts.map((entry) => [entry.path, entry.verdict]));
  assert.equal(result.attempted, 7);
  assert.ok(byPath.get(files[0]?.path ?? "") === "opens-with-real-content");
  assert.ok(byPath.get(files[1]?.path ?? "") === "fails-to-open");
  assert.ok(byPath.get(files[2]?.path ?? "") === "fails-to-open");
  assert.ok(byPath.get(files[3]?.path ?? "") === "fails-to-open");
  assert.ok(byPath.get(files[4]?.path ?? "") === "fails-to-open");
  assert.ok(byPath.get(files[5]?.path ?? "") === "fails-to-open");
  assert.ok(byPath.get(files[6]?.path ?? "") === "opens-but-wrong");
  assert.equal(result.failed, 5);
  assert.equal(result.wrong, 1);
});

test("tier assignment follows the expert model", () => {
  const tree = folder([
    { path: "a.jpg", kind: "photo-people", sizeBytes: 1, mtimeDays: 5 },
    { path: "b.pdf", kind: "document", sizeBytes: 1, mtimeDays: 6 },
    { path: "c.png", kind: "screenshot", sizeBytes: 1, mtimeDays: 7 }
  ]);
  assert.equal(tierFiles(tree, 1).length, 1);
  assert.equal(tierFiles(tree, 2).length, 1);
  assert.equal(tierFiles(tree, 3).length, 1);
});
