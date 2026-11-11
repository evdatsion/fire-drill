// Renders the Report Card, exactly per the layout in
// skill/backup-fire-drill/references/report-card.md: urgent items first,
// at most three fixes, receipts on every finding, next drill date.
import type { Flag, Grade } from "./types.js";
import type { SilentStopResult } from "./rules/silentStop.js";
import type { OpenTestResult } from "./rules/openTest.js";
import type { SingleCopyResult } from "./rules/singleCopy.js";
import type { TellsResult } from "./rules/ransomware.js";
import type { VanishResult } from "./rules/vanish.js";

/** The pack's reference date. The simulator is date-free otherwise. */
export const DRILL_DATE = "2026-11-12";

function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - Math.round(days));
  return d.toISOString().slice(0, 10);
}

function formatCadence(perWeek: number): string {
  if (perWeek >= 10) return `about ${Math.round(perWeek)} files a week`;
  if (perWeek >= 1) return `about ${perWeek.toFixed(1)} files a week`;
  return `about ${(perWeek * 4.3).toFixed(1)} files a month`;
}

function fixForStop(device: string, gapDays: number): string {
  if (/iphone|phone|tablet/i.test(device)) {
    return "Open the UGREEN app on the device weekly, or enable Background App Refresh, so uploads resume.";
  }
  return `The copy job has not run since ${daysBefore(DRILL_DATE, gapDays)}. Start the copy job and confirm the newest file moves.`;
}

export interface CardInput {
  folder: string;
  owner: string;
  device: string;
  grade: Grade | null;
  empty?: boolean;
  flags: Flag[];
  silentStop: SilentStopResult;
  openTest: OpenTestResult;
  singleCopy: SingleCopyResult;
  tells: TellsResult;
  vanish?: VanishResult;
  manifestDate?: string;
}

export function renderCard(input: CardInput): string {
  if (input.empty) {
    return [
      `## ${input.folder}, empty backup, owner: ${input.owner}`,
      "",
      "This backup folder is empty. The drill could read it, but it holds no files. An empty backup may mean the job never ran or the folder was moved; this is a finding, not a pass and not a could-not-check.",
      `Next drill due: ${addMonths(DRILL_DATE, 1)}.`,
      "Receipts: file-agent listed this folder and it returned no files.",
      ""
    ].join("\n");
  }
  const lines: string[] = [];
  const title = input.grade === null ? "could not check" : `grade ${input.grade}`;
  lines.push(`## ${input.folder}, ${title}, owner: ${input.owner}`);
  lines.push("");

  const fixes: string[] = [];
  if (input.tells.fired) fixes.push("Stop syncing, do not delete anything, and check before the next backup overwrites good copies.");
  const stop = input.silentStop;
  if (stop.flag) fixes.push(fixForStop(input.device, stop.gapDays));
  if (input.singleCopy.count > 0) fixes.push("This set exists only here: copy it to a second location you pick.");
  if (input.openTest.failed > 0 && !input.tells.fired) fixes.push("Re-upload the broken files from the device; delete them only after a good copy exists.");
  for (const fix of fixes.slice(0, 3)) {
    lines.push(`- ${fix}`);
  }
  if (fixes.length > 0) lines.push("");

  lines.push("Findings:");
  if (input.vanish) {
    if (input.vanish.missingCount > 0) {
      lines.push(`- Vanished since last drill: ${input.vanish.missingCount} of ${input.vanish.previousCount} irreplaceable files are missing, last seen in ${input.folder}.`);
      if (input.vanish.largeDrop) lines.push(`- Mass change: ${input.vanish.missingCount} files gone in one step. Check before anything else runs.`);
      lines.push(`- Example: ${input.vanish.missingPaths[0] ?? "n/a"}`);
    } else {
      lines.push(`- Vanished since last drill: none of ${input.vanish.previousCount} files missing.`);
    }
  } else {
    lines.push("- Vanished since last drill: first drill; nothing to compare yet.");
  }

  if (input.tells.fired) {
    if (input.tells.renameBurst) {
      const burst = input.tells.renameBurst;
      lines.push(`- Ransomware tell: rename burst, ${burst.count} files now end in ${burst.extension} within about ${Math.max(1, Math.round(burst.windowHours))} hours; that extension had no history in this folder.`);
    }
    if (input.tells.massChange) {
      lines.push(`- Ransomware tell: mass change, ${input.tells.massChange.count} files modified within ${input.tells.massChange.windowMinutes} minutes.`);
    }
    if (input.tells.openFailSpike) {
      const spike = input.tells.openFailSpike;
      lines.push(`- Ransomware tell: open-fail spike, ${spike.failedNewest} of the newest ${spike.newestTotal} files fail the open test.`);
    }
  }

  const copy = input.singleCopy;
  if (copy.count > 0) {
    const gb = (copy.totalBytes / 1_000_000_000).toFixed(0);
    lines.push(`- Single copy: ${copy.count} irreplaceable photos (about ${gb} GB) exist in only one copy, starting with ${copy.paths[0] ?? "n/a"}.`);
  } else {
    lines.push("- Single copy: none found.");
  }

  const stopLine = stopLines(input);
  lines.push(stopLine);

  const open = input.openTest;
  lines.push(`- Open test: opened ${open.opened + open.wrong} of ${open.attempted} sampled files; ${open.opened} opened, ${open.failed} failed, ${open.wrong} looked wrong.`);
  for (const verdict of open.verdicts) {
    if (verdict.verdict !== "opens-with-real-content") {
      lines.push(`  - ${verdict.path} (${verdict.sizeBytes} bytes): ${verdict.verdict}`);
    }
  }

  if (input.manifestDate) {
    lines.push(`Since last drill (${input.manifestDate}): see the vanish line above.`);
  }
  lines.push(`Next drill due: ${addMonths(DRILL_DATE, 1)}.`);
  lines.push("Receipts: every finding above lists its file path, the expert action that produced it, and the outcome.");
  lines.push("");
  return lines.join("\n");
}

function daysLabel(days: number): string {
  const rounded = Math.round(days);
  return rounded === 1 ? "1 day" : `${rounded} days`;
}

function stopLines(input: CardInput): string {
  const stop = input.silentStop;
  if (stop.reason === "not-applicable-archive") return "- Silent stop: archive folder, stop check not applicable.";
  if (stop.reason === "seasonal") return "- Silent stop: seasonal folder, stop check deferred until its next active period.";
  if (stop.reason === "insufficient-history") return "- Silent stop: insufficient history to know this folder's rhythm; no stop flag.";
  if (stop.flag) {
    return `- Silent stop: ${formatCadence(stop.cadencePerWeek)} before; the newest file is ${daysLabel(stop.gapDays)} old.`;
  }
  return `- Silent stop: none; the newest file is ${daysLabel(stop.gapDays)} old.`;
}
