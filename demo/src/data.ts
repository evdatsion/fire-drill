// The demo replays bench/results.json, produced by the reference simulator.
// It computes nothing: every grade, flag and Report Card below is the
// simulator's output. The bench ran on a laptop, not a NAS.
import results from "../../bench/results.json";

export interface CaseResult {
  id: string;
  family: string;
  name: string;
  expected: { flags: string[]; grade: string | null; verdict: string | null };
  actual: { flags: string[]; grade: string | null; verdict: string | null };
  matched: boolean;
  report: string;
}

export interface FamilyStat {
  key: string;
  label: string;
  total: number;
  matched: number;
}

export const familyLabels: Record<string, string> = {
  "stopped-backup": "Silently stopped backups",
  "broken-file": "Broken or partial files",
  "single-copy": "Only one copy",
  "ransomware-burst": "Ransomware-style bursts",
  healthy: "Healthy controls"
};

export const cases: CaseResult[] = results.cases as CaseResult[];

export const summary = results.summary as {
  score: number;
  total: number;
  healthyFlagged: number;
  twoDrillMatched: boolean;
  byFamily: Record<string, { total: number; matched: number }>;
};

export const familyStats: FamilyStat[] = Object.entries(summary.byFamily).map(([key, stat]) => ({
  key,
  label: familyLabels[key] ?? key,
  total: stat.total,
  matched: stat.matched
}));

export function gradeColor(grade: string | null): string {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800";
    case "B":
      return "bg-lime-100 text-lime-800";
    case "C":
      return "bg-amber-100 text-amber-800";
    case "D":
      return "bg-orange-100 text-orange-800";
    case "F":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
