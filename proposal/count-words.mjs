#!/usr/bin/env node
// Counts the proposal's ten numbered Devpost answers for the word gate.
//
// Excluded from the limit (and so from the count): the H1 title, the track
// subtitle line, the "Third-party components and data flows" appendix below
// the horizontal rule, and the "Submitted by" line. Hyphenated compounds
// (e.g. "on-device", "ug-filesystem") count as one word; arrow glyphs used as
// flow separators are not words. Reports the answer-body count and the count
// including the ten numbered headings, and fails (exit 1) above the 500 cap.
import { readFileSync } from "node:fs";

const LIMIT = 500;
const file = process.argv[2] ?? "proposal/proposal.md";
const raw = readFileSync(file, "utf8");

// Everything from the first horizontal rule onward is the excluded appendix
// (third-party components) and the "Submitted by" line.
const main = raw.split(/\n-{3,}\s*\n/)[0];

// Answers start at the first numbered heading; slicing there also drops the
// title and subtitle that precede it.
const start = main.search(/^\*\*1\.\s/m);
const answers = start === -1 ? "" : main.slice(start);

const HEADING = /^\*\*\d+\.\s+.*\*\*\s*$/gm;

function countWords(s) {
  const text = s
    .replace(/```[\s\S]*?```/g, " ") // fenced code (none expected)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images are figures, not words
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep anchor text
    .replace(/[#>*_`|]/g, " ") // markdown emphasis/structure (keep hyphens)
    .replace(/[←-⇿•·]/g, " "); // arrows, bullets, middots
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

const withHeadings = countWords(answers);
const bodiesOnly = countWords(answers.replace(HEADING, " "));

console.log(
  `${file}: ${bodiesOnly} answer words, ${withHeadings} with headings (limit ${LIMIT})`,
);
if (withHeadings > LIMIT) {
  console.error(`over the ${LIMIT}-word limit`);
  process.exit(1);
}
