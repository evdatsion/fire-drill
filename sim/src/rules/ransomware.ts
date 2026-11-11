// Ransomware tells, exactly as written in
// skill/backup-fire-drill/references/signals.md.
import type { FolderTree, SynthFile } from "../types.js";
import { extensionOf, openVerdict } from "../experts.js";

export interface RenameBurst {
  extension: string;
  count: number;
  windowHours: number;
}

export interface MassChange {
  count: number;
  windowMinutes: number;
}

export interface OpenFailSpike {
  failedNewest: number;
  newestTotal: number;
}

export interface TellsResult {
  renameBurst?: RenameBurst;
  massChange?: MassChange;
  openFailSpike?: OpenFailSpike;
  fired: boolean;
}

const BURST_WINDOW_DAYS = 2; // 48 hours
const MASS_WINDOW_MINUTES = 60;

function findRenameBurst(files: SynthFile[]): RenameBurst | undefined {
  const byExtension = new Map<string, SynthFile[]>();
  for (const file of files) {
    const ext = extensionOf(file.path);
    const list = byExtension.get(ext) ?? [];
    list.push(file);
    byExtension.set(ext, list);
  }
  let found: RenameBurst | undefined;
  for (const [ext, group] of byExtension) {
    const recent = group.filter((file) => file.mtimeDays <= BURST_WINDOW_DAYS);
    const history = group.length - recent.length;
    if (recent.length >= 20 && history === 0) {
      const times = recent.map((file) => file.mtimeDays);
      const windowHours = (Math.max(...times) - Math.min(...times)) * 24;
      if (!found || recent.length > found.count) found = { extension: ext, count: recent.length, windowHours };
    }
  }
  return found;
}

function findMassChange(files: SynthFile[]): MassChange | undefined {
  const buckets = new Map<number, number>();
  for (const file of files) {
    const minute = Math.round(file.mtimeDays * 24 * 60);
    buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
  }
  let found: MassChange | undefined;
  for (const count of buckets.values()) {
    if (count >= 100 && (!found || count > found.count)) {
      found = { count, windowMinutes: MASS_WINDOW_MINUTES };
    }
  }
  return found;
}

function findOpenFailSpike(files: SynthFile[]): OpenFailSpike | undefined {
  // The tell compares the newest 100 files against the rest; on folders with
  // fewer files the rate is noise, so the tell needs the full window.
  if (files.length < 100) return undefined;
  const byAge = [...files].sort((a, b) => a.mtimeDays - b.mtimeDays); // newest first
  const newest = byAge.slice(0, Math.min(100, byAge.length));
  const older = byAge.slice(newest.length);
  const failedNewest = newest.filter((file) => openVerdict(file) === "fails-to-open").length;
  const failedOlder = older.filter((file) => openVerdict(file) === "fails-to-open").length;
  const newestRate = failedNewest / newest.length;
  const olderRate = older.length > 0 ? failedOlder / older.length : 0;
  if (newestRate >= 0.25 && olderRate < 0.25) {
    return { failedNewest, newestTotal: newest.length };
  }
  return undefined;
}

export function ransomwareTells(folder: FolderTree): TellsResult {
  const renameBurst = findRenameBurst(folder.files);
  const massChange = findMassChange(folder.files);
  const openFailSpike = findOpenFailSpike(folder.files);
  return {
    renameBurst,
    massChange,
    openFailSpike,
    fired: renameBurst !== undefined || massChange !== undefined || openFailSpike !== undefined
  };
}
