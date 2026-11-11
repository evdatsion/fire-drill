// Tests for the three ransomware tells and their failure paths.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ransomwareTells } from "../sim/src/rules/ransomware.js";
import type { FolderTree, SynthFile } from "../sim/src/types.js";

function tree(files: SynthFile[]): FolderTree {
  return { name: "Test", scope: { role: "device-backup", device: "d", originalsOnDevice: true }, files };
}

function locked(name: string, daysAgo: number, problem?: string): SynthFile {
  return { path: `Test/${name}.jpg.locked`, kind: "photo-people", sizeBytes: 10, mtimeDays: daysAgo, ...(problem ? { problem } : {}) };
}

function healthy(name: string, daysAgo: number): SynthFile {
  return { path: `Test/${name}.jpg`, kind: "photo-people", sizeBytes: 10, mtimeDays: daysAgo };
}

test("rename burst: an unfamiliar extension on 20+ files inside 48 hours fires", () => {
  const files = Array.from({ length: 25 }, (_, i) => locked(`f${i}`, 1));
  const result = ransomwareTells(tree(files));
  assert.ok(result.renameBurst);
  assert.equal(result.renameBurst.extension, ".locked");
  assert.equal(result.fired, true);
});

test("rename burst failure path: 19 files is below the threshold", () => {
  const files = [...Array.from({ length: 19 }, (_, i) => locked(`f${i}`, 1)), healthy("keep", 100)];
  assert.equal(ransomwareTells(tree(files)).renameBurst, undefined);
});

test("rename burst failure path: an extension with history is not unfamiliar", () => {
  const files = [
    ...Array.from({ length: 214 }, (_, i) => healthy(`new${i}`, 1)),
    ...Array.from({ length: 20 }, (_, i) => healthy(`old${i}`, 100))
  ];
  assert.equal(ransomwareTells(tree(files)).renameBurst, undefined);
});

test("mass change: 100 or more files inside one hour fires, 99 does not", () => {
  const many = Array.from({ length: 120 }, (_, i) => healthy(`m${i}`, 400));
  assert.ok(ransomwareTells(tree(many)).massChange);
  const few = Array.from({ length: 99 }, (_, i) => healthy(`n${i}`, 400));
  assert.equal(ransomwareTells(tree(few)).massChange, undefined);
});

test("open-fail spike: a quarter of the newest 100 failing fires, on large folders only", () => {
  const files: SynthFile[] = [
    ...Array.from({ length: 30 }, (_, i) => ({ ...healthy(`dead${i}`, 1), problem: "truncated-jpg: cut" })),
    ...Array.from({ length: 70 }, (_, i) => healthy(`fine${i}`, 1.5)),
    ...Array.from({ length: 60 }, (_, i) => healthy(`older${i}`, 100))
  ];
  const result = ransomwareTells(tree(files));
  assert.ok(result.openFailSpike);
  assert.equal(result.openFailSpike.newestTotal, 100);

  const small = files.slice(0, 40);
  assert.equal(ransomwareTells(tree(small)).openFailSpike, undefined);
});

test("open-fail spike failure path: under a quarter failing does not fire", () => {
  const files: SynthFile[] = [
    ...Array.from({ length: 20 }, (_, i) => ({ ...healthy(`dead${i}`, 1), problem: "truncated-jpg: cut" })),
    ...Array.from({ length: 80 }, (_, i) => healthy(`fine${i}`, 1.5)),
    ...Array.from({ length: 60 }, (_, i) => healthy(`older${i}`, 100))
  ];
  assert.equal(ransomwareTells(tree(files)).openFailSpike, undefined);
});
