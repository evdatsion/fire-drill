# Vanish check

The vanish check answers: "something is gone since the last drill, and here is where it was last seen." It exists because files disappear for many reasons: a sync propagating a phone deletion, ransomware, a misbehaving skill, a person. The drill does not guess which one it was; it reports the fact and the recovery routes that exist.

## The manifest

On every drill that ends with a saved Report Card, the drill also saves a small manifest next to it, at the same confirmed location:

```text
# fire-drill manifest, 2026-11-11
folder: Mom-iPhone
files: 380
bytes: 41000000000
Mom-iPhone/2026-08/IMG_0312.jpg 410000 IMG_HASH_1
Mom-iPhone/2026-08/IMG_0313.jpg 398000 IMG_HASH_2
```

One manifest per drill. Per tier 1 folder: folder name, file count, total bytes, and one line per file with its relative path, size and hash. The manifest is plain text, saved with the save text action after the user confirms the location, like the Report Card itself.

## The comparison

On the next drill, before any other finding is written:

1. Read the saved manifest of the previous drill, if one exists.
2. List the current files of each tier 1 folder.
3. A file in the manifest that is absent now is "vanished since last drill".
4. Report: the missing list (at most 20 paths, then "and N more"), the folder each was last seen in, the count, and the total size.

A drop of at least 100 files, or at least 20% of a tier 1 folder within one day, is also reported as "mass change, check before anything else runs", whatever the cause looks like.

## First drill

No manifest exists yet. The report says "first drill; nothing to compare yet" and skips the vanish section. It does not grade the folder differently for it.

## Recovery routes

Name a route only if it exists on this NAS:

- The recycle bin: files deleted through the system may still be restorable while the bin holds them. Restore is a write: it needs the user's approval like every other write.
- The triage copy: if the user confirmed a copy to a second location in an earlier drill, point at that location and list which vanished files are in it.

Recovery windows are time-limited. That is why the vanish section sits above every other finding in the Report Card.
