# Fire Drill

UGREEN Hackathon 2026 on AI NAS · Explore Your Imagination (Open Innovation) track

**1. What the Skill does**

Fire Drill finds the family photos that exist only once on your NAS, copies just that set to a folder you pick, and tells you when backups silently stopped or files vanished.

**2. Target user and problem**

Families who free phone space once photos reach the NAS. The NAS becomes the only copy, and RAID does not cover theft, fire, ransomware or a failed pool. Phone uploads stop silently in the background, and 46% of backup users never tested a restore (Macrium, 2017). On Feb 7, 2026 an AI agent tidying a desktop deleted 15,000 family photos.

**3. Proposed solution**

A drill the NAS runs on itself, ranked by what you could never replace. It reports, most urgent first: files vanished since the last drill, irreplaceable photos with one copy, silently stopped backups, broken or partial uploads, then a grade A to F per person with at most three fixes. Then it copies only the one-copy set.

**4. Core user flow**

"Run a fire drill" → confirm which folders are whose backups → evidence gathered → Report Card with receipts → confirm a destination → copy → confirm where to save the report. Later drills compare with the manifest and copy only new files.

**5. Difference from existing tools**

Backup tools check job status or hashes; neither proves a photo still opens, nor tells a daughter's birthday from a screenshot. Fire Drill uses on-device people search and vision to protect what matters, and turns the report into a confirmed fix small enough for a USB drive.

**6. NAS capabilities by step**

Scope and rhythm: ug-filesystem find, stat. Copy count: sha256sum, ug-filemgr scan-dedupe. Tiering: ug-photo search-picture, search-screen. Open test: vision-ocr, vision-vlm; ug-document qa, extract. Fix: ug-filesystem cpmv. Report and manifest: ug-knowledge save-text. All confirmed in the kit catalog.

**7. Technical approach**

A Markdown-only Skill. Written rules decide every flag and grade; experts only gather evidence. Inputs: folder scope and owners. Permissions: read-only experts need no approval; cpmv (copy, overwrite off) and save-text run only after user confirmation and UGOS approval. Models: UGOS on-device vision and OCR only. Data never leaves the NAS.

**8. Development status**

Implemented: Skill package (kit checker 0 errors, 0 warnings), reference simulator, 39 tests. Design pack 20/20 with 4 healthy controls unflagged. Adversarial holdout: 1/6 before fixes, 6/6 after; a second holdout scores 2/4. Pending: NAS execution.

**9. Validation plan**

Core 1: a phone folder whose photos stopped 74 days ago while screenshots keep arriving is flagged with its last-photo date. Core 2: a one-copy family photo set is sized, copied after confirmation, and verified by hash. Edge: an empty readable folder and an unreadable one are reported differently, neither graded.

**10. Known limitations**

Sampling, not a full scan. Ransomware signs are warnings; in-place encryption of under 100 files can evade them. Seasonal folders must be marked by the user. UGOS lacks USB listing, snapshots and a scheduler, so the copy targets a folder you pick and drills run on request with a reminder.

---

**Third-party components and data flows** (excluded from the word limit)

- **Skill package (the submitted ZIP):** no third-party components. Markdown only (SKILL.md and references), written for this entry.
- **UGOS capabilities:** used through the UGREEN skill kit (uliya-skill-kit 0.7.3), which is licensed by UGREEN and not redistributed; CI downloads it from the official starter-kit page.
- **Repository tooling, not in the package:** TypeScript (Apache-2.0); ESLint, @eslint/js, typescript-eslint, @types/node (MIT).
- **Demo app, not in the package:** React, React DOM, Vite, @vitejs/plugin-react, Tailwind CSS, PostCSS, Autoprefixer, @types/react (MIT). Three stock photos from Pexels (photos 1648387, 1128318, 1683975) under the Pexels licence; no real customer data.
- **External services and data flows:** none for the Skill; all evidence and results stay on the NAS. GitHub hosts the code and the static demo, which uses synthetic data only.

Submitted by: Sarmad Khan (individual entrant)
