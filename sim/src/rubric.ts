// Rubric, exactly as written in
// skill/backup-fire-drill/references/report-card.md: the highest-severity
// finding wins, and a folder that could not be read or holds no files is
// never graded.
import type { Grade } from "./types.js";

export interface RubricInput {
  couldNotCheck: boolean;
  ransomwareTell: boolean;
  singleCopyCount: number;
  silentStop: boolean;
  brokenCount: number;
}

export function gradeFor(input: RubricInput): Grade | null {
  if (input.couldNotCheck) return null;
  if (input.ransomwareTell) return "F";
  if (input.singleCopyCount >= 100) return "D";
  if (input.silentStop) return "C";
  if (input.brokenCount > 3) return "C"; // more than three dead files is a broken backup, not a small fix
  if (input.brokenCount > 0 || (input.singleCopyCount > 0 && input.singleCopyCount < 100)) return "B";
  return "A";
}
