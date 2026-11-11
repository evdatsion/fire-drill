# Security

## What Fire Drill touches

- Reads: the folders the user scopes as backups. Listing, sizes, modification times, hashes, and open tests on a bounded sample.
- Writes, each behind a user-confirmed location: the Report Card text, the drill manifest next to it, and (only on request) a copy of the irreplaceable set to a folder the user picked.
- Never does: delete, move, rename, tag or edit user files; send anything off the NAS; run without approval for writes.

## Reporting a problem

Open a GitHub issue in this repository. For anything sensitive, use a private security advisory instead of a public issue.

## Repository hygiene

- No secrets, tokens or keys are committed. CI runs a secret scan on every pull request.
- The pre-commit guard blocks private files and obvious secret patterns before a commit is made.
- The kit used for checks is not redistributed here; CI fetches the official pinned download at build time.
