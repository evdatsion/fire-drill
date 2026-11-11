# Safety

## Read-only guarantee

The drill runs read-only actions for every finding step: listing, stat, hashing, dedupe scan, photo and document open tests. It never deletes, moves, renames, tags or edits user files. Nothing in the drill depends on changing anything.

The only writes are:

| Write | When it may happen | Gate |
|---|---|---|
| Report Card text | After the findings are assembled | User confirms the save location first |
| Drill manifest | Next to the Report Card | Same confirmed location, same gate |
| Triage copy of the irreplaceable set | Optional, user asks for it | User confirms the set and the destination first |

Every write is executed by the responsible expert through its own approval flow. When a write sits in waiting_approval, the drill reports that state and waits; it never attempts the same change through another route.

## No external transfer

Nothing leaves the NAS. Findings, samples and reports are produced and stored on the device. The Report Card lists file names, counts, sizes and verdicts; it does not copy file contents out of the NAS.

## What the report contains

- File paths, file names, counts, sizes, hashes.
- Verdicts with the expert and action that produced each one.
- No file content beyond what is needed to say a file opened, and no personal data beyond what the user's own folders contain.

## Failure honesty

- A folder the experts could not read is reported as "could not check", with the folder listed. It never receives a grade.
- A step that failed is reported as failed, with the step named and the dependent steps stopped.
- Empty search results are reported as "none found". The drill never widens the user's scope to produce a result.

## Running other skills first

The drill is a safe pre-flight step: "run a fire drill before I let a skill reorganize my photos." The report's grade and vanish section tell the user whether a second copy exists before anything else touches the files.
