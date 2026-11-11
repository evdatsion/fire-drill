# Validation plan

The written rules are only trustworthy if they are tested against cases with known answers. The Drill Pack is that test: 20 synthetic cases with an expected result each, defined in the repository at bench/drill-pack/expected.json.

## What the pack contains

| Family | Cases | What each proves |
|---|---|---|
| Stopped backup | 4 | The silent-stop rule fires on four different rhythms (weekly photos, weekly docs, monthly projects, daily camera) with the right newest-file date. |
| Broken file | 5 | Truncated JPG, zero-byte PDF, renamed non-image, corrupted HEIC, half-written video each fail the open test while healthy neighbours pass. |
| Single-copy set | 4 | Tier 1 sets with one copy are counted and sized, large sets grade D and small sets grade B. |
| Ransomware burst | 3 | Three rename-burst variants each trigger the urgent warning and grade F. The mass-change and open-fail tells from references/signals.md are covered by simulator unit tests. |
| Healthy control | 4 | Steady sync, occasional arrivals, screenshots-only, and an empty folder must never be flagged. |

Target for the benchmark: at least 18 of 20 cases scored as expected, with zero healthy folders flagged. Finalist day reports the real score; until then the target is stated as the target, not as a result.

## How it runs

The bench runs on a reference simulator in the repository that executes the same written rules from references/signals.md and references/report-card.md on synthetic folder trees. If the simulator and these references disagree, the references win and the simulator is fixed. The simulator runs on a laptop; it is not a NAS. NAS execution is finalist-day work, and the proposal says exactly that.

## Core checks

1. A stopped backup is detected with the right newest-file date and the rhythm comparison stated in the report.
2. A truncated JPG and a zero-byte PDF fail the open test; healthy files in the same folder pass.
3. The pass rate is reported for the sample only, with the sample size next to it.

## Edge checks

1. A folder with only screenshots is not graded as "irreplaceable at risk", whatever its size.
2. An empty or unreadable folder reports "could not check", not grade A.
3. A folder with occasional arrivals (a few documents per quarter) is not flagged as stopped.
4. A folder with steady weekly sync and mixed content is not flagged by any signal.

## Scoring

A case passes when the simulated report contains the expected grade, the expected flags, and the required report lines, and fires none of the must-not-flag signals. The score is written to bench/results.json on every run, so the trend is visible between nights.
