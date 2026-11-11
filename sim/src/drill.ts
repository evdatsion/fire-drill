// One drill over the scoped folders: runs every written rule, grades each
// folder, and renders one Report Card per folder.
import type { Flag, Grade } from "./types.js";
import type { Manifest } from "./rules/vanish.js";
import { silentStop } from "./rules/silentStop.js";
import { openTest } from "./rules/openTest.js";
import { singleCopy } from "./rules/singleCopy.js";
import { ransomwareTells } from "./rules/ransomware.js";
import { vanishCompare } from "./rules/vanish.js";
import { gradeFor } from "./rubric.js";
import { renderCard } from "./report.js";
import type { FolderTree } from "./types.js";

export interface FolderFindings {
  folder: string;
  device: string;
  grade: Grade | null;
  couldNotCheck: boolean;
  flags: Flag[];
  silentStop: ReturnType<typeof silentStop>;
  openTest: ReturnType<typeof openTest>;
  singleCopy: ReturnType<typeof singleCopy>;
  tells: ReturnType<typeof ransomwareTells>;
  vanish?: ReturnType<typeof vanishCompare>;
}

export interface DrillResult {
  folders: FolderFindings[];
  flags: Flag[];
  grade: Grade | null;
  verdict: "could-not-check" | null;
  report: string;
}

export interface DrillOptions {
  owner: string;
  manifest?: Manifest;
  manifestDate?: string;
}

export function runDrill(folders: FolderTree[], options: DrillOptions): DrillResult {
  const findings: FolderFindings[] = folders.map((folder) => {
    const stop = silentStop(folder);
    const open = openTest(folder);
    const copy = singleCopy([folder]);
    const tells = ransomwareTells(folder);
    const vanish = options.manifest && options.manifest.folder === folder.name
      ? vanishCompare(options.manifest, folder)
      : undefined;

    const flags: Flag[] = [];
    let couldNotCheck = false;
    if (folder.files.length === 0) {
      couldNotCheck = true;
    } else {
      if (tells.fired) flags.push("ransomware-tell");
      else if (open.failed > 0) flags.push("broken-file");
      if (stop.flag) flags.push("silent-stop");
      if (copy.count > 0) flags.push("single-copy");
      if (vanish && vanish.missingCount > 0) flags.push("vanished");
    }

    const grade = gradeFor({
      couldNotCheck,
      ransomwareTell: tells.fired,
      singleCopyCount: copy.count,
      silentStop: stop.flag,
      brokenCount: open.failed
    });

    return {
      folder: folder.name,
      device: folder.scope.device,
      grade,
      couldNotCheck,
      flags,
      silentStop: stop,
      openTest: open,
      singleCopy: copy,
      tells,
      ...(vanish ? { vanish } : {})
    };
  });

  const flags = [...new Set(findings.flatMap((finding) => finding.flags))];
  const allEmpty = findings.every((finding) => finding.couldNotCheck);
  const grades = findings.map((finding) => finding.grade).filter((grade): grade is Grade => grade !== null);
  const order: Grade[] = ["F", "D", "C", "B", "A"];
  const grade = grades.length > 0 ? order.find((candidate) => grades.includes(candidate)) ?? null : null;

  const report = findings
    .map((finding) =>
      renderCard({
        folder: finding.folder,
        owner: options.owner,
        device: finding.device,
        grade: finding.grade,
        flags: finding.flags,
        silentStop: finding.silentStop,
        openTest: finding.openTest,
        singleCopy: finding.singleCopy,
        tells: finding.tells,
        ...(finding.vanish ? { vanish: finding.vanish } : {}),
        ...(options.manifestDate ? { manifestDate: options.manifestDate } : {})
      })
    )
    .join("\n");

  return {
    folders: findings,
    flags,
    grade,
    verdict: allEmpty ? "could-not-check" : null,
    report
  };
}
