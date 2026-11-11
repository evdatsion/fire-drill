# Report card

The Report Card is the product. It is one page per source folder, written in plain words, and it is the only place a grade appears.

## Rubric

Rules decide the grade; the highest-severity finding wins. If a folder could not be read, it gets "could not check", never a grade.

| Grade | Rule that triggers it |
|---|---|
| F | A ransomware tell fired (rename burst, mass change, or open-fail spike). |
| D | A tier 1 set with at least 100 files exists in only one copy. |
| C | A silent stop was confirmed by the rule in references/signals.md. |
| B | At most 3 sampled files failed the open test, or a tier 1 set under 100 files exists in only one copy. |
| A | None of the above fired. |
| could not check | The folder could not be read, holds no files, or the whole sample could not be attempted. |

Examples: a phone folder that stopped 74 days ago is C. A document folder with 3 dead files is B. A shared folder holding 412 one-copy family photos is D. A folder where 214 files were renamed within one afternoon is F.

## Layout

The card leads with what the user should do. Findings appear in the standing order: vanished, single-copy, silent stop, broken files, then grade and fixes.

```markdown
## Mom-iPhone, grade C, owner: Mom

Fix first:
1. Open the UGREEN app on the phone weekly, or enable Background App Refresh, so uploads resume.
2. Leave "do not delete" on the 74-day gap finding until photos from June to August are back.

Findings:
- Silent stop: used to add about 40 photos a week; the newest file is 74 days old.
- Vanished since last drill: none.
- Single copy: none found.
- Open test: opened 30 of 380 people photos; 30 opened, 0 failed, 0 could not be checked.

Since last drill (Oct 12): grade was B; 2 new findings, 1 fixed.
Next drill due: Dec 11.
Receipts: file-agent listed and stat-ed this folder; photo-agent opened the sampled files.
```

Rules for the layout:

- Grade and owner on the title line; at most 3 fixes; every fix names its real cause, not "check your settings".
- Numbers come from the drill that produced the card; every finding carries its receipt (path, expert, outcome).
- If a previous Report Card exists, add the "since last drill" line; if not, write "first drill".
- End every card with "next drill due <date>", one month out. The kit catalog has no scheduler capability, so the drill runs when the user asks; the date keeps it on the user's calendar instead of relying on memory.

## Fix library

| Finding | Fix in plain words |
|---|---|
| Phone backup stopped | "iPhone uploads stop when the app is not opened in the background. Open it weekly or enable Background App Refresh." |
| Laptop folder stopped | "The copy job has not run since <date>. Start it from the backup app and confirm the newest file moves." |
| Broken or zero-byte files | "These files never finished uploading. Re-upload them from the device; delete the broken ones only after a good copy exists." |
| Single-copy family photos | "This set exists only here. Let the drill copy it to a second location you pick." |
| Ransomware tell | "Stop syncing, do not delete anything, and check before the next backup overwrites good copies." |
| Could not check | "The drill could not read this folder. Check its permissions, then run the drill again." |
