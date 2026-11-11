# Fire Drill

Fire Drill tests whether your NAS could really bring back what matters. It opens a sample of your files with the NAS's own vision and OCR, finds backups that silently stopped, spots files that no longer open, counts the irreplaceable family photos that exist in only one copy, and grades every source folder A to F in one Report Card.

## Status

Night 1 of the build plan (spec: repo skeleton, capability check, skill draft, Drill Pack design).

| Exists today | Comes next |
|---|---|
| Skill package first draft: `skill/backup-fire-drill/` (Markdown only) | Night 2: reference simulator and bench that generate the 20 synthetic folders and score them |
| Drill Pack design with expected results: `bench/drill-pack/expected.json` (20 cases, 4 healthy controls) | Night 3: proposal PDF, demo page, final ZIP |
| CI: Drill Pack validation, kit checker, secret scan, attribution guard | |

Nothing has run on a NAS yet. The static checker passes; device execution is finalist-day work.

## How it works

1. Scope: which folders are backups, and whose they are.
2. Silent-stop check: newest file date plus weekly arrival rhythm per folder.
3. What matters: people photos are tier 1, documents tier 2, screenshots and the rest tier 3.
4. Restore drill: open a bounded sample per tier (30/20/10, weighted toward older files) and record opens, fails, and opens-but-wrong.
5. Single-copy risk: hash tier 1 files across all scoped folders.
6. Vanish check: compare against the manifest saved at the last drill.
7. Report Card: grade A to F from a written rubric, at most 3 fixes, receipts for every finding.

The rules decide; the experts only gather evidence. A folder that cannot be read reports "could not check" and is never graded.

## Layout

```
skill/backup-fire-drill/   the Skill package (SKILL.md + references), zipped for submission
bench/drill-pack/          Drill Pack design: expected.json (20 cases)
bench/validate-expected.mjs
docs/                      design notes, decisions, known gaps
.github/workflows/ci.yml   Drill Pack validation, kit checker, secret scan, attribution guard
.githooks/                 pre-commit and commit-msg guards
```

## Check it

Run the official kit checker on the package (the kit lives outside this repository and is not redistributed):

```
node <path-to-uliya-skill-kit>/scripts/check-skill.mjs skill/backup-fire-drill
```

Validate the Drill Pack design:

```
node bench/validate-expected.mjs bench/drill-pack/expected.json
```

CI runs both on every pull request, with the kit fetched from the official starter-kit download at a pinned version.

## Known gaps

- Sample-based: the pass rate describes the opened sample, never the whole library.
- No NAS runtime results yet; the bench (Night 2) runs on a laptop simulator.
- The kit catalog shows no recycle-bin listing, no snapshot access, no scheduler, and no USB volume enumeration; the design works around each of these and says where. See docs/design.md.
- Ransomware tells are warnings, not detection guarantees.

## Licence

MIT. The UGREEN skill kit is licensed separately and is not included in this repository.
