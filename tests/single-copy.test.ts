// Tests for the single-copy rule: device originals count as copies,
// cross-folder content matches count as copies, and the rest do not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { singleCopy } from "../sim/src/rules/singleCopy.js";
import type { FolderTree, SynthFile } from "../sim/src/types.js";

function tree(name: string, files: SynthFile[], originalsOnDevice: boolean): FolderTree {
  return { name, scope: { role: "archive", device: "d", originalsOnDevice }, files };
}

function photo(path: string, contentId?: string): SynthFile {
  return { path, kind: "photo-people", sizeBytes: 100, mtimeDays: 4000, ...(contentId ? { contentId } : {}) };
}

test("a set with no copies anywhere is single-copy", () => {
  const result = singleCopy([tree("Shared", [photo("Shared/a.jpg"), photo("Shared/b.jpg")], false)]);
  assert.equal(result.count, 2);
  assert.equal(result.totalBytes, 200);
  assert.deepEqual(result.paths, ["Shared/a.jpg", "Shared/b.jpg"]);
});

test("originals on the device mean no single-copy finding", () => {
  const result = singleCopy([tree("Mom-iPhone", [photo("Mom-iPhone/a.jpg")], true)]);
  assert.equal(result.count, 0);
});

test("an identical copy in another scoped folder is not a single copy", () => {
  const folders = [
    tree("A", [photo("A/a.jpg", "content-1"), photo("A/b.jpg", "content-2")], false),
    tree("B", [photo("B/a.jpg", "content-1")], false)
  ];
  const result = singleCopy(folders);
  assert.equal(result.count, 1);
  assert.deepEqual(result.paths, ["A/b.jpg"]);
});

test("tiers 2 and 3 are never single-copy findings", () => {
  const folders = [tree("Screens", [{ path: "Screens/s.png", kind: "screenshot", sizeBytes: 10, mtimeDays: 5 }], false)];
  assert.equal(singleCopy(folders).count, 0);
});
