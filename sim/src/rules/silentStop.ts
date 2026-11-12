// Silent-stop rule, exactly as written in
// skill/backup-fire-drill/references/signals.md.
import type { FolderTree, SynthFile } from "../types.js";
import { tierOf } from "../experts.js";

export type StopReason = "flag" | "healthy" | "insufficient-history" | "not-applicable-archive" | "seasonal";

export interface SilentStopResult {
  folder: string;
  reason: StopReason;
  flag: boolean;
  gapDays: number;
  rhythmDays: number | null;
  cadencePerWeek: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  const lower = sorted[middle - 1];
  if (upper === undefined) return 0;
  if (sorted.length % 2 === 1 || lower === undefined) return upper;
  return (upper + lower) / 2;
}

// Turns one set of arrivals into a stop verdict: gap since the newest file,
// rhythm = median of the gaps between the 12 arrivals before it, flag when the
// gap is at least max(3 x rhythm, 14 days). Fewer than 3 gaps = unknown rhythm.
function evaluateArrivals(name: string, files: SynthFile[]): SilentStopResult {
  const base: SilentStopResult = { folder: name, reason: "healthy", flag: false, gapDays: 0, rhythmDays: null, cadencePerWeek: 0 };
  if (files.length === 0) return { ...base, reason: "insufficient-history" };

  // Newest first: ascending mtimeDays, smallest = most recent.
  const sorted = [...files].sort((a, b) => a.mtimeDays - b.mtimeDays);
  const newest = sorted[0];
  if (!newest) return { ...base, reason: "insufficient-history" };

  const gapDays = newest.mtimeDays;
  const gaps: number[] = [];
  let previous = gapDays;
  for (const file of sorted.slice(1)) {
    if (gaps.length >= 12) break;
    gaps.push(file.mtimeDays - previous);
    previous = file.mtimeDays;
  }

  const oldest = sorted[sorted.length - 1]?.mtimeDays ?? gapDays;
  const spanDays = Math.max(oldest - gapDays, 0);
  const cadencePerWeek = spanDays > 0 ? (files.length / spanDays) * 7 : files.length * 7;

  if (gaps.length < 3) {
    return { folder: name, reason: "insufficient-history", flag: false, gapDays, rhythmDays: null, cadencePerWeek };
  }
  const rhythmDays = median(gaps);
  const flag = gapDays >= Math.max(3 * rhythmDays, 14);
  return { folder: name, reason: flag ? "flag" : "healthy", flag, gapDays, rhythmDays, cadencePerWeek };
}

export function silentStop(folder: FolderTree): SilentStopResult {
  const base: SilentStopResult = { folder: folder.name, reason: "healthy", flag: false, gapDays: 0, rhythmDays: null, cadencePerWeek: 0 };
  if (folder.scope.role === "archive") return { ...base, reason: "not-applicable-archive" };
  if (folder.scope.seasonal) return { ...base, reason: "seasonal" };
  if (folder.files.length === 0) return { ...base, reason: "insufficient-history" };

  const all = evaluateArrivals(folder.name, folder.files);
  if (all.flag) return all;

  // The stop check also runs on the irreplaceable (tier-1) set, so a stream of
  // low-value files (screenshots, downloads) cannot hide that the photos
  // themselves stopped arriving. A pure tier-1 folder is already covered above.
  const tier1 = folder.files.filter((file) => tierOf(file.kind) === 1);
  if (tier1.length >= 4 && tier1.length < folder.files.length) {
    const tier1Stop = evaluateArrivals(folder.name, tier1);
    if (tier1Stop.flag) return tier1Stop;
  }
  return all;
}
