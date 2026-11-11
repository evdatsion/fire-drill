// Core types shared by the simulator. The fixture shape mirrors
// bench/drill-pack/expected.json (schema v2, generator-grade).

export type Kind = "photo-people" | "photo-other" | "screenshot" | "download" | "document" | "video";
export type Tier = 1 | 2 | 3;
export type Verdict = "opens-with-real-content" | "fails-to-open" | "opens-but-wrong";
export type Flag = "silent-stop" | "broken-file" | "single-copy" | "ransomware-tell" | "vanished";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface Scope {
  role: "device-backup" | "archive";
  device: string;
  originalsOnDevice: boolean;
}

export interface FileSpec {
  path: string;
  kind: Kind;
  sizeBytes: number;
  mtimeDaysAgo: number;
  problem?: string;
}

export interface History {
  totalFiles: number;
  endDaysAgo: number;
  oldestDaysAgo: number;
  /** Total bytes for the bulk files; lets a fixture pin its size narrative. */
  bulkSizeBytes?: number;
}

export interface Burst {
  extension: string;
  count: number;
  windowHours: number;
  endDaysAgo: number;
}

export interface Fixture {
  folders: string[];
  scope: Scope;
  files: FileSpec[];
  history: History;
  burst?: Burst;
}

/** One synthetic file. mtimeDays = days before the drill date (larger is older). */
export interface SynthFile {
  path: string;
  kind: Kind;
  sizeBytes: number;
  mtimeDays: number;
  problem?: string;
  /** Declares identical content across files; defaults to the path (unique). */
  contentId?: string;
}

export interface FolderTree {
  name: string;
  scope: Scope;
  files: SynthFile[];
}

export interface CaseSpec {
  id: string;
  family: string;
  name: string;
  owner: string;
  summary: string;
  fixture: Fixture;
  expected: Expected;
}

export interface Expected {
  verdict?: string;
  flagged: boolean;
  flags: Flag[];
  grade: Grade | null;
  silentStop?: { newestFileGapDays: number; weeklyCadence: number };
  singleCopy?: { files: number; approxBytes: number };
  broken?: { paths: string[]; verdict: string };
  reportMustContain: string[];
  mustNotFlag: Flag[];
}
