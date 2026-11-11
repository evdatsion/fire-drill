// Vanish check, exactly as written in
// skill/backup-fire-drill/references/vanish-check.md: the manifest covers
// the tier-1 files of each folder; the next drill reports what is missing,
// where it was last seen, and whether the drop is large enough to warn.
import type { FolderTree } from "../types.js";
import { contentHash, tierOf } from "../experts.js";

export interface ManifestEntry {
  path: string;
  sizeBytes: number;
  hash: string;
}

export interface Manifest {
  folder: string;
  fileCount: number;
  totalBytes: number;
  entries: ManifestEntry[];
}

export function buildManifest(folder: FolderTree): Manifest {
  const entries: ManifestEntry[] = folder.files
    .filter((file) => tierOf(file.kind) === 1)
    .map((file) => ({ path: file.path, sizeBytes: file.sizeBytes, hash: contentHash(file) }));
  return {
    folder: folder.name,
    fileCount: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    entries
  };
}

export interface VanishResult {
  missingCount: number;
  missingPaths: string[];
  largeDrop: boolean;
  previousCount: number;
}

export function vanishCompare(manifest: Manifest, current: FolderTree): VanishResult {
  const present = new Set(current.files.map((file) => file.path));
  const missing = manifest.entries.filter((entry) => !present.has(entry.path));
  const largeDrop = missing.length >= 100 || (manifest.fileCount > 0 && missing.length >= 0.2 * manifest.fileCount);
  return {
    missingCount: missing.length,
    missingPaths: missing.slice(0, 20).map((entry) => entry.path),
    largeDrop,
    previousCount: manifest.fileCount
  };
}
