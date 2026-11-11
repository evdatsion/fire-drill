// Tests for the vanish check across two drills, including the large-drop warning.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildManifest, vanishCompare } from "../sim/src/rules/vanish.js";
import type { FolderTree, SynthFile } from "../sim/src/types.js";

function thousand(): FolderTree {
  const files: SynthFile[] = Array.from({ length: 1000 }, (_, i) => ({
    path: `Mom-iPhone/photo-${String(i).padStart(4, "0")}.jpg`,
    kind: "photo-people",
    sizeBytes: 1000 + i,
    mtimeDays: 1 + i / 1000
  }));
  return { name: "Mom-iPhone", scope: { role: "device-backup", device: "phone", originalsOnDevice: true }, files };
}

function without(tree: FolderTree, count: number): FolderTree {
  const step = Math.floor(tree.files.length / count);
  const drop = new Set<number>();
  for (let i = 0; i < count; i += 1) drop.add(i * step);
  return { ...tree, files: tree.files.filter((_, index) => !drop.has(index)) };
}

test("the manifest covers tier-1 files with count, bytes and hashes", () => {
  const manifest = buildManifest(thousand());
  assert.equal(manifest.fileCount, 1000);
  assert.equal(manifest.entries[0]?.path, "Mom-iPhone/photo-0000.jpg");
  assert.ok(manifest.entries[0]?.hash.length === 64);
});

test("a 387-file drop is listed, attributed to its folder, and warned about", () => {
  const manifest = buildManifest(thousand());
  const result = vanishCompare(manifest, without(thousand(), 387));
  assert.equal(result.missingCount, 387);
  assert.equal(result.largeDrop, true);
  assert.ok(result.missingPaths[0]?.startsWith("Mom-iPhone/"));
});

test("a 5-file drop is listed but not warned about", () => {
  const manifest = buildManifest(thousand());
  const result = vanishCompare(manifest, without(thousand(), 5));
  assert.equal(result.missingCount, 5);
  assert.equal(result.largeDrop, false);
});

test("nothing missing means nothing vanished", () => {
  const tree = thousand();
  const result = vanishCompare(buildManifest(tree), tree);
  assert.equal(result.missingCount, 0);
  assert.equal(result.largeDrop, false);
});
