// Models what the UGOS experts report for a synthetic file. On a NAS these
// values come from the photo, document and file experts; here they follow
// from the fixture's declared state. This is the simulation model, stated
// in docs/results.md: the simulator stands in for the experts on a laptop.
import { createHash } from "node:crypto";
import type { SynthFile, Tier, Verdict } from "./types.js";

export function tierOf(kind: SynthFile["kind"]): Tier {
  if (kind === "photo-people") return 1;
  if (kind === "document") return 2;
  return 3;
}

export function openVerdict(file: SynthFile): Verdict {
  if (file.problem === undefined) return "opens-with-real-content";
  if (file.problem.startsWith("blank")) return "opens-but-wrong";
  return "fails-to-open";
}

export function contentHash(file: SynthFile): string {
  return createHash("sha256").update(file.contentId ?? file.path).digest("hex");
}

export function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}
