# Changelog

## 0.3.0 - 2026-11-12

- Added the demo app (demo/, Vite + React + Tailwind): it replays bench/results.json over the 20-case Drill Pack, labelled "simulation on synthetic data" on every screen. Deployed to GitHub Pages from the gh-pages branch.
- Added per-case Report Cards to bench/results.json so the demo computes nothing; the bench itself is unchanged (20/20, zero healthy flagged, two-drill matched).
- Added docs/screenshots/hero.gif and docs/screenshots/report-card.png, captured from the demo.
- Added the proposal: proposal/proposal.md (494 words, script-counted, CI gate), two figures, and proposal.pdf.
- Added scripts/build-package-zip.mjs: builds the submission ZIP from skill/backup-fire-drill/ only, deterministic, re-checked by the kit checker (0/0/0) in CI.
- EXIF capture dates for the silent-stop rule are deferred to finalist day (needs real NAS metadata); they stay on the README roadmap.

## 0.2.0 - 2026-11-12

- Added the reference simulator (sim/, TypeScript, Node >= 20): it expands the Drill Pack fixtures into synthetic folder trees and applies the written rules from the skill references.
- Added the bench: `npm run bench` scores all 20 Drill Pack cases plus the two-drill vanish sequence into bench/results.json, deterministically.
- Added tests per rule and failure path (39 tests): silent stop, sampling and open test, single copy, all three ransomware tells, vanish, rubric, report card, generation.
- Refined the written rules where the pack demanded it: silent-stop rhythm and sufficient-history gate, single-copy scope mapping, ransomware suppression of broken-file findings. Each change is recorded in docs/design.md.
- README now shows the measured score (20/20, zero healthy folders flagged); docs/results.md and docs/diagrams/bench-results.svg are generated from bench/results.json by script.
- CI adds lint, typecheck, tests, bench with a score gate, and a drift check between results.json and the rendered docs.

## 0.1.0 - 2026-11-11

- Added git hygiene: .gitignore, .gitattributes, and commit guards for private files, secrets and attribution lines.
- Added the skill package first draft: skill/backup-fire-drill with SKILL.md and six references (signals, tiers and sampling, report card, vanish check, safety, validation plan).
- Added the Drill Pack design: bench/drill-pack/expected.json with 20 cases (4 stopped backups, 5 broken files, 4 single-copy sets, 3 rename bursts, 4 healthy controls) and bench/validate-expected.mjs.
- Added CI: Drill Pack validation, kit checker on the package, secret scan, attribution guard.
- Simulator, bench scoring, proposal and demo page come with the next nights.
