# Fire Drill diagrams

How Fire Drill runs on a UGREEN AI NAS, drawn from the skill package (`skill/backup-fire-drill/`) and the capability findings in `docs/design.md`. GitHub renders every diagram below.

1. [What Fire Drill can touch](#1-what-fire-drill-can-touch)
2. [Drill pipeline](#2-drill-pipeline)
3. [How evidence becomes a finding](#3-how-evidence-becomes-a-finding)
4. [Silent-stop rule](#4-silent-stop-rule)
5. [Sequence: a drill from the chat](#5-sequence-a-drill-from-the-chat)
6. [Sequence: the triage copy](#6-sequence-the-triage-copy)
7. [Vanish check across two drills](#7-vanish-check-across-two-drills)
8. [UGOS capability map](#8-ugos-capability-map)

## 1. What Fire Drill can touch

Everything stays on the NAS. Fire Drill reads through UGOS experts, and writes only two things, each after the user confirms: the triage copy and the saved report with its manifest.

```mermaid
flowchart LR
  user([User]) <--> uliya[Uliya chat]
  uliya <--> skill[Fire Drill skill<br/>Markdown rules]

  subgraph NAS[UGREEN AI NAS: nothing leaves the device]
    direction TB
    subgraph read[Read only, no approval]
      fs[ug-filesystem<br/>find, stat, sha256sum]
      fm[ug-filemgr<br/>scan-dedupe]
      ph[ug-photo<br/>search-picture, search-screen,<br/>vision-ocr, vision-vlm, meta]
      doc[ug-document<br/>qa, extract, page-count]
    end
    subgraph write[Writes, only after the user confirms]
      cp[ug-filesystem cpmv<br/>type copy, overwrite off]
      kn[ug-knowledge save-text<br/>report + manifest]
    end
    lib[(Photo and file<br/>library)]
    dest[(Destination folder<br/>the user picks)]
  end

  skill --> read
  skill -. confirm gate .-> write
  read --> lib
  cp --> dest
```

## 2. Drill pipeline

```mermaid
flowchart TD
  A[Trigger: run a fire drill] --> B[Scope: which folders are backups, and whose]
  B --> C[Gather evidence<br/>dates, hashes, people, screenshots, open tests]
  C --> D{Folder readable?}
  D -- no --> X[Could not check<br/>never graded]
  D -- yes --> E[Written rules decide<br/>no judgement call]
  E --> R1[1 Vanished since last drill]
  E --> R2[2 Only one copy]
  E --> R3[3 Silently stopped]
  E --> R4[4 Broken or partial uploads<br/>mass-change warning]
  R1 & R2 & R3 & R4 --> G[5 Grade A to F per person<br/>max 3 fixes, receipts]
  G --> H{User confirms?}
  H -- copy --> I[Triage copy of the only-copy set]
  H -- save --> J[Save report + manifest]
  H -- no --> K[Nothing written]
```

## 3. How evidence becomes a finding

The on-device AI only opens and classifies files. Every flag and grade comes from the written rules in `references/`, and every finding carries a receipt.

```mermaid
flowchart LR
  subgraph AI[AI assists: gathers evidence]
    v[vision-ocr / vision-vlm<br/>opens a file]
    p[search-picture<br/>people and events]
    s[search-screen<br/>screenshots]
  end
  subgraph Rules[Rules decide: references/*.md]
    t[Tier: people = 1, documents = 2, rest = 3]
    o[Open test: opens / fails / opens but wrong]
    c[Copy count across scoped folders]
    g[Rubric: grade A to F]
  end
  v --> o
  p --> t
  s --> t
  t --> c
  o --> g
  c --> g
  g --> r[Finding + receipt<br/>path, expert, outcome]
```

## 4. Silent-stop rule

A folder that only gets occasional files must not be flagged, so the rule compares the gap against the folder's own rhythm.

```mermaid
flowchart TD
  a[Per source folder: newest file date<br/>and median gap between arrivals] --> b{Enough history<br/>to know a rhythm?}
  b -- no --> n[Insufficient evidence<br/>no flag, said plainly]
  b -- yes --> c{Gap since newest file<br/>at least max of 3 x rhythm, 14 days?}
  c -- no --> ok[Healthy]
  c -- yes --> f[Flag: silently stopped<br/>last arrival date + usual rhythm as receipt]
```

## 5. Sequence: a drill from the chat

```mermaid
sequenceDiagram
  actor U as User
  participant L as Uliya
  participant S as Fire Drill skill
  participant E as UGOS experts
  U->>L: Run a fire drill
  L->>S: Load skill
  S->>U: Which folders are backups, and whose?
  U->>S: Mom-iPhone, Dad-Laptop, Shared
  S->>E: find, stat, sha256sum, scan-dedupe
  S->>E: search-picture, search-screen
  S->>E: vision-ocr / qa on a bounded sample
  E-->>S: Evidence with paths
  S->>S: Apply written rules
  S-->>U: Report Card: urgent items first, grade, 3 fixes
  S->>U: Save report and manifest here?
  U->>S: Yes
  S->>E: save-text (workflow approval)
```

## 6. Sequence: the triage copy

```mermaid
sequenceDiagram
  actor U as User
  participant S as Fire Drill skill
  participant E as ug-filesystem cpmv
  S-->>U: 412 family photos (41 GB) exist only once
  S->>U: Copy just this set? Pick a destination folder
  U->>S: Yes, /USB-Backup/Fire-Drill
  Note over S: No USB enumeration in UGOS:<br/>the skill cannot verify the folder is an external drive and says so
  S->>E: cpmv type copy, overwrite off (gateway approval)
  E-->>S: Copied files with paths
  S-->>U: Done. Next drill copies only new files
```

## 7. Vanish check across two drills

```mermaid
sequenceDiagram
  participant D1 as Drill 1 (Oct 12)
  participant M as Manifest (save-text)
  participant D2 as Drill 2 (Nov 12)
  actor U as User
  D1->>M: Save file count, size, hashes of irreplaceable files
  D2->>M: Read last manifest
  D2->>D2: Compare with the library now
  alt Files missing
    D2-->>U: 387 photos gone. Last seen in /Photos/Mom-iPhone/2026-08
    D2-->>U: Recovery routes that exist: recycle-bin restore by path, the triage copy
  else Large drop in a short window
    D2-->>U: Mass change: check before anything else runs
  else Nothing missing
    D2-->>U: Nothing vanished since Oct 12
  end
```

## 8. UGOS capability map

From the kit capability catalog (version 2.0.0). Line numbers point at `data/capability-catalog.json` in the kit.

| Fire Drill step | UGOS capability | Catalog line | Approval |
|---|---|---|---|
| Find files, dates | ug-filesystem find, stat | 1603, 1871 | none (read) |
| Hashes | ug-filesystem sha256sum | 1840 | none (read) |
| Duplicates | ug-filemgr scan-dedupe | 2396 | none (read) |
| People and events | ug-photo search-picture | 4235 | none (read) |
| Screenshots | ug-photo search-screen | 4494 | none (read) |
| Open test, photos | ug-photo vision-ocr, vision-vlm | 4917, 4948 | none (read) |
| Capture date | ug-photo meta | 4879 | none (read) |
| Open test, documents | ug-document qa, extract | 3202, 3331 | none (read) |
| Triage copy | ug-filesystem cpmv (type copy) | 1949 | gateway |
| Save report + manifest | ug-knowledge save-text | 3836 | workflow |
| Restore a vanished file | ug-filesystem restore | 2191 | gateway |
| Not available | USB listing, snapshots, recycle-bin listing, scheduler | not found | worked around, see `docs/design.md` |
