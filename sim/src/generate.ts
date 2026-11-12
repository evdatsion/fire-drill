// Expands a fixture into the synthetic folder tree the drill runs on.
// Deterministic: the same case id always yields the same tree.
import type { Fixture, FolderTree, Kind, SynthFile } from "./types.js";

/** Default size per bulk file, by kind. Synthetic stand-ins, not measurements. */
const BULK_SIZE: Record<Kind, number> = {
  "photo-people": 3_800_000,
  "photo-other": 3_600_000,
  screenshot: 900_000,
  download: 12_000_000,
  document: 90_000,
  video: 52_000_000
};

const EXTENSION: Record<Kind, string> = {
  "photo-people": ".jpg",
  "photo-other": ".jpg",
  screenshot: ".png",
  download: ".zip",
  document: ".pdf",
  video: ".mp4"
};

function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFolder(caseId: string, fixture: Fixture): FolderTree {
  const rng = mulberry32(hashSeed(caseId));
  const folder = fixture.folders[0];
  if (!folder) throw new Error(`case ${caseId} has no folder`);

  const files: SynthFile[] = fixture.files.map((spec) => ({
    path: spec.path,
    kind: spec.kind,
    sizeBytes: spec.sizeBytes,
    mtimeDays: spec.mtimeDaysAgo,
    ...(spec.problem !== undefined ? { problem: spec.problem } : {}),
    ...(spec.contentId !== undefined ? { contentId: spec.contentId } : {})
  }));
  // Identical content is declared with an explicit contentId; otherwise each
  // file's content is unique, modelled as its path.
  for (const file of files) if (file.contentId === undefined) file.contentId = file.path;

  const burstCount = fixture.burst?.count ?? 0;
  const bulkCount = fixture.history.totalFiles - fixture.files.length - burstCount;
  if (bulkCount < 0) throw new Error(`case ${caseId}: history.totalFiles smaller than named plus burst files`);

  const bulkKind: Kind = fixture.files[0]?.kind ?? "document";
  const bulkExt = EXTENSION[bulkKind];
  const declaredBulkBytes = fixture.history.bulkSizeBytes;
  const defaultBulkSize = BULK_SIZE[bulkKind];
  const avgBulkSize = bulkCount > 0
    ? (declaredBulkBytes ?? defaultBulkSize * bulkCount) / bulkCount
    : defaultBulkSize;
  const oldest = fixture.history.oldestDaysAgo;
  const end = fixture.history.endDaysAgo;
  const span = Math.max(oldest - end, 0);
  for (let i = 0; i < bulkCount; i += 1) {
    const fraction = bulkCount === 1 ? 0.5 : i / (bulkCount - 1);
    const day = oldest - span * fraction + (rng() - 0.5) * (span > 0 ? Math.min(span / bulkCount, 1) : 0);
    files.push({
      path: `${folder}/bulk-${String(i).padStart(5, "0")}${bulkExt}`,
      kind: bulkKind,
      sizeBytes: Math.round(avgBulkSize * (0.9 + rng() * 0.2)),
      mtimeDays: Math.min(Math.max(day, end), oldest)
    });
  }

  if (fixture.burst) {
    const burst = fixture.burst;
    for (let i = 0; i < burst.count; i += 1) {
      const hoursBack = rng() * burst.windowHours;
      files.push({
        path: `${folder}/burst-${String(i).padStart(5, "0")}${burst.extension}`,
        kind: bulkKind,
        sizeBytes: Math.round(BULK_SIZE[bulkKind] * (0.75 + rng() * 0.5)),
        mtimeDays: burst.endDaysAgo + hoursBack / 24,
        problem: "rename-burst"
      });
    }
  }

  return { name: folder, scope: fixture.scope, files };
}
