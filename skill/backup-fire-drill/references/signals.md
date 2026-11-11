# Signals

Every flag in the report comes from a written rule here. The experts gather numbers; these rules turn numbers into verdicts. If a rule needs data the experts could not collect, the verdict is "could not check", never a guess.

## Silent-stop rule

Purpose: catch a backup that quietly stopped, without punishing folders that only get occasional files.

For each scoped folder:

- gap = days since the newest file inside the folder, by modification time.
- arrivals = the gaps in days between consecutive new files over the last 12 weeks, by modification time.
- rhythm = the median of arrivals when there are at least 3 arrivals in the window; otherwise rhythm = 90 days (occasional folder).
- Flag "silent-stop" when gap >= max(3 x rhythm, 14 days).

The report states both numbers, for example: "used to add about 40 photos a week; the newest file is 74 days old." A folder with a 40-day gap and a 90-day rhythm is not flagged; a folder with a 74-day gap and a 7-day rhythm is.

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

1. Hash the tier 1 files across every scoped folder.
2. A file with no equal-content match in any other scoped folder has one copy.
3. Report the count of single-copy files, their total size, and a bounded path list (at most 20 paths, then "and N more").

Identical content under a different name or folder still counts as a copy. The rule ignores tier 2 and tier 3 on purpose: a screenshots folder must never be graded as "irreplaceable at risk".

## Ransomware tells

Any one of these triggers the urgent warning at the top of the report: "stop syncing, do not delete anything, check before the next backup overwrites good copies."

| Tell | Rule |
|---|---|
| Rename burst | An extension that appears on 0 files in the folder's 12-week history now appears on at least 20 files within one 48-hour window. |
| Mass change | At least 100 files modified inside one 60-minute window. |
| Open-fail spike | At least 25% of the newest 100 files fail the open test while the older sample mostly passes. |

The tell is a warning, not a detection guarantee. The report says what was observed, with counts and window, and tells the user what to do first.

## Vanish rule

A file listed in the saved manifest of the last drill and absent now is "vanished since last drill". Report the missing list, the folder each file was last seen in, and the count and total size. This section sits above every other finding: recovery windows are time-limited.

A large drop is itself a tell: at least 100 files, or at least 20% of a tier 1 folder, disappearing within one day is reported as "mass change, check before anything else runs".

Recovery routes are named only when they exist on this NAS: the recycle bin, if the folder's recycle feature is on, and the triage copy, if the user made one. If neither exists, the report says so plainly.

## Threshold summary

| Signal | Threshold |
|---|---|
| Silent stop | gap >= max(3 x rhythm, 14 days) |
| Sample sizes | 30 tier 1, 20 tier 2, 10 tier 3 per source |
| Rename burst | 0 in history, then >= 20 files in 48 h |
| Mass change | >= 100 files in 60 min |
| Open-fail spike | >= 25% of newest 100 fail |
| Vanish mass drop | >= 100 files or >= 20% of a tier 1 folder in 1 day |
