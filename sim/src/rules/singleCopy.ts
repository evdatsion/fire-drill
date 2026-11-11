// Single-copy rule, exactly as written in
// skill/backup-fire-drill/references/signals.md: a tier-1 file's copy count
// is its equal-content matches in the other scoped folders plus the
// originals on its source device, as recorded in the scope mapping.
import type { FolderTree } from "../types.js";
import { contentHash, tierOf } from "../experts.js";

export interface SingleCopyResult {
  count: number;
  totalBytes: number;
  paths: string[];
}

export function singleCopy(folders: FolderTree[]): SingleCopyResult {
  const occurrences = new Map<string, number>();
  for (const folder of folders) {
    for (const file of folder.files) {
      if (tierOf(file.kind) !== 1) continue;
      const hash = contentHash(file);
      occurrences.set(hash, (occurrences.get(hash) ?? 0) + 1);
    }
  }

  const single: SingleCopyResult = { count: 0, totalBytes: 0, paths: [] };
  for (const folder of folders) {
    for (const file of folder.files) {
      if (tierOf(file.kind) !== 1) continue;
      const hash = contentHash(file);
      const copies = (occurrences.get(hash) ?? 0) + (folder.scope.originalsOnDevice ? 1 : 0);
      if (copies === 1) {
        single.count += 1;
        single.totalBytes += file.sizeBytes;
        if (single.paths.length < 20) single.paths.push(file.path);
      }
    }
  }
  return single;
}
