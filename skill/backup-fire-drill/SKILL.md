---
name: backup-fire-drill
description: Fire Drill checks whether your backups could really bring back what matters. It finds backups that silently stopped, opens a sample of photos and documents on the device to confirm they still load, counts irreplaceable photos that have only one copy, and grades each source folder A to F in one report card. After you confirm, it copies just that set to a folder you pick. Use when the user asks is my backup okay, says run a fire drill, or wants a pre-flight check before letting another skill reorganize photos.
---

# Goal

Fire Drill answers one question: if the worst happened today, could this NAS bring back what matters? It checks the folders people actually use as backups, not backup jobs it cannot see. The drill reports, in this order:

1. Files that vanished since the last drill.
2. Irreplaceable photos that exist in only one copy.
3. Backups that silently stopped.
4. Files that no longer open.
5. A Report Card per source folder with a grade from A to F and at most three fixes in plain words.

A folder it could not read gets the verdict "could not check" and never a grade. The pass rate is reported for the sampled files only; the drill never claims the whole library is fine.

# Required input

- Which folders to drill and whose they are, for example "Mom's iPhone". For each folder, whether it is a device backup or an archive, and whether the originals still live on the device. If the user is not sure, list the top-level shared folders and let the user pick, then remember the mapping for the next drill.
- Where the previous Report Card and manifest are, if a previous drill ran.
- For the optional copy step: the destination folder, chosen by the user.

Collect nothing else. The child experts own their own action parameters.

# Orchestration

Run the steps in order. Pass each downstream step only the real result of the step before it. Steps 1 to 6 are read-only. Every write waits for the user to confirm it first.

1. Scope and silent-stop check.

   `delegate --target file-agent --instruction 'For each backup folder the user named, use read-only listing and stat actions only: record the newest file time, count files added per week over the last 12 weeks, and compute the days since the newest file. Return one line per folder with those three numbers and the owner name the user gave. Do not modify, move or delete anything.'`

2. Rank what matters.

   `delegate --target photo-agent --instruction 'For each scoped photo folder, count photos found in person and pet albums through the figure and pet search parameters, count screenshots through the screen category search, and treat the rest as other. Return per-folder counts for people, screenshots and other, plus ten example file names per bucket spread across old and new files.'`

3. Restore drill for images.

   `delegate --target photo-agent --instruction 'Open the sampled image files with the vision and OCR actions, weighted toward older files per the sample plan, and return one verdict per file: opens with real content, fails to open, or opens but looks wrong such as blank or garbled. Include the file path and the action used for every verdict.'`

4. Restore drill for documents.

   `delegate --target document-agent --instruction 'Open the sampled document files with the document read and metadata actions and return one verdict per file: opens with real content, fails to open, or opens but looks wrong such as empty pages. Include the file path and the action used for every verdict.'`

5. Single-copy risk.

   `delegate --target file-agent --instruction 'Take the tier one file list from the previous real result, hash those files across every scoped folder with the filesystem hash actions, and run the dedupe scan per folder. Return the count of irreplaceable files that exist in only one scoped folder, their total size, and their paths.'`

6. Vanish check, second drill onward.

   `delegate --target file-agent --instruction 'Compare the saved manifest of the last drill with the current listing of each tier one folder and return the files that were present then and are missing now, the folder each was last seen in, and the count and total size of the missing set. Read-only actions only.'`

7. Save the Report Card, only at a location the user confirmed.

   `delegate --target knowledge-agent --instruction 'Save the finished report card text at the location the user confirmed with the save text action, then return the verified output file path and its size.'`

8. Optional triage copy, only if the user confirmed the set and the destination.

   `delegate --target file-agent --instruction 'Copy the confirmed irreplaceable set to the destination folder the user confirmed with the copy action and overwrite off, then return the copied file count and total size. Copy only; never move or delete.'`

Use the thresholds in references/signals.md to turn the returned numbers into flags, and the rubric in references/report-card.md to grade. The rules decide; the experts only gather evidence.

# Generation-time capability evidence

Confirmed against the kit capability catalog, version 2.0.0, dated 2026-09-01. No capability outside this list is assumed.

- `ug-filesystem` → `file-agent`
- `ug-filemgr` → `file-agent`
- `ug-photo` → `photo-agent`
- `ug-document` → `document-agent`
- `ug-knowledge` → `knowledge-agent`

# Completion and failure

- completed: assemble the Report Card from the returned real results only. Every finding lists the file path, which expert opened it, and the outcome.
- failed: name the step that failed and what could not be checked. The affected folder keeps the verdict "could not check"; it is never graded.
- cancelled: stop and report how far the drill got. Save nothing.
- waiting_user: the drill is blocked until the user answers. State the exact question, such as the scope of folders or the confirmed save location.
- waiting_approval: a write is waiting at the gateway. Tell the user which write it is and wait.
- If a search returns no results, say so plainly and stop that branch. Do not widen the scope and do not switch to a similar data source.

# References

Read each reference before the step that needs it.

- [references/signals.md](references/signals.md): the silent-stop rule, open-test verdicts, single-copy rule, ransomware tells, vanish rule, and every threshold.
- [references/tiers-and-sampling.md](references/tiers-and-sampling.md): tier rules, sample sizes, and how to state confidence honestly.
- [references/report-card.md](references/report-card.md): the grading rubric and the exact Report Card layout.
- [references/vanish-check.md](references/vanish-check.md): the manifest format and the two-drill comparison.
- [references/safety.md](references/safety.md): the read-only guarantee and the confirmation gates.
- [references/validation-plan.md](references/validation-plan.md): the 20-case Drill Pack the written rules must pass.
