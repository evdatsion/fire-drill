# Signals

Every flag in the report comes from a written rule here. The experts gather numbers; these rules turn numbers into verdicts. If a rule needs data the experts could not collect, the verdict is "could not check", never a guess.

## Silent-stop rule

Purpose: catch a backup that quietly stopped, without punishing folders that only get occasional files or that are static archives.

The rule runs on folders recorded as device backups in the scope mapping (the drill asks which folders are backups, whose they are, and whether the originals still live on the device). Archive folders are static by nature: the card says "archive folder: stop check not applicable" instead of a flag. Folders the user marks as seasonal (a holiday camera, a yearly event folder) are deferred the same way: a single active season cannot establish a yearly cadence from one cluster of arrivals, so the card says "seasonal folder: stop check deferred" instead of a flag.

For each device-backup folder:

- gap = days since the newest file inside the folder, by modification time.
- rhythm = the median of the gaps between the 12 arrivals that precede that newest file, when at least 3 such gaps exist.
- With fewer than 3 gaps the folder's rhythm is unknown: the verdict is "insufficient evidence", the folder is not flagged, and the report says so plainly.
- Flag "silent-stop" when gap >= max(3 x rhythm, 14 days).
- The same test also runs on the irreplaceable (tier-1) arrivals on their own. A folder that keeps receiving low-value files (screenshots, downloads) while its people photos stopped is flagged on the tier-1 arrivals, so a busy folder cannot hide that the photos themselves stopped. A folder that is only tier-1 is already covered by the folder-wide test.

The report states the cadence and the gap as the receipt, for example: "used to add about 40 photos a week; the newest file is 74 days old." A folder with a 40-day gap and a 90-day rhythm is not flagged; a folder with a 74-day gap and a weekly rhythm is.

## Open-test verdicts

Every sampled file gets exactly one verdict:

| Verdict | Meaning | Evidence |
|---|---|---|
| opens with real content | The file renders and shows the content it should. | The expert action returned usable output. |
| fails to open | The file cannot be rendered at all. | The action reported the file unreadable, truncated or corrupt. |
| opens but looks wrong | The file renders but the content is not believable. | Blank image, garbled text, empty pages. |
| could not check | The expert could not reach or attempt the file. | Reported as such; never folded into a pass. |

The sample pass rate counts "opens with real content" against the attempted sample. "Could not check" files are listed separately. The rate is stated for the sample only, with the sample size, never as a claim about the whole folder.

## Single-copy rule

Applies to tier 1 files only (see references/tiers-and-sampling.md):

1. Count every copy a tier 1 file has: equal-content matches in the other scoped folders (hashes plus the dedupe scan) and the originals on its source device, as recorded in the scope mapping.
2. A file whose total copy count is one exists in a single copy.
3. Report the count of single-copy files, their total size, and a bounded path list (at most 20 paths, then "and N more").

Identical content under a different name or folder still counts as a copy. The rule ignores tier 2 and tier 3 on purpose: a screenshots folder must never be graded as "irreplaceable at risk".

## Ransomware tells

Any one of these triggers the urgent warning at the top of the report: "stop syncing, do not delete anything, check before the next backup overwrites good copies."

| Tell | Rule |
|---|---|
| Rename burst | An extension that appears on 0 files in the folder's 12-week history now appears on at least 10 files within one 48-hour window. The threshold is deliberately low so a partial or interrupted rename still raises the warning early, when acting first matters most. |
| Mass change | At least 100 files modified inside one 60-minute window. |
| Open-fail spike | At least 25% of the newest 100 files fail the open test while the older sample mostly passes. |

The tell is a warning, not a detection guarantee. The report says what was observed, with counts and window, and tells the user what to do first. When a tell fires, failed open tests belong to the warning: they are reported under it instead of as broken or partial uploads.

## Vanish rule

A file listed in the saved manifest of the last drill and absent now is "vanished since last drill". Report the missing list, the folder each file was last seen in, and the count and total size. This section sits above every other finding: recovery windows are time-limited.

A large drop is itself a tell: at least 100 files, or at least 20% of a tier 1 folder, disappearing within one day is reported as "mass change, check before anything else runs".

Recovery routes are named only when they exist on this NAS: the recycle bin, if the folder's recycle feature is on, and the triage copy, if the user made one. If neither exists, the report says so plainly.

## Threshold summary

| Signal | Threshold |
|---|---|
| Silent stop | gap >= max(3 x rhythm, 14 days), device-backup folders with a known rhythm |
| Sample sizes | 30 tier 1, 20 tier 2, 10 tier 3 per source |
| Rename burst | 0 in history, then >= 10 files in 48 h |
| Mass change | >= 100 files in 60 min |
| Open-fail spike | >= 25% of newest 100 fail |
| Vanish mass drop | >= 100 files or >= 20% of a tier 1 folder in 1 day |
