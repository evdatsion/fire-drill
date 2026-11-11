#!/usr/bin/env node
// Counts the words of the proposal the way the CI gate does: markdown
// image and link syntax is stripped, then whitespace-separated tokens are
// counted. Fails (exit 1) above the 500-word limit from the spec.
import { readFileSync } from "node:fs";

const LIMIT = 500;
const file = process.argv[2] ?? "proposal/proposal.md";
const raw = readFileSync(file, "utf8");

const text = raw
  .replace(/```[\s\S]*?```/g, " ") // fenced blocks (none expected, but be strict)
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images count as figures, not words
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their anchor text
  .replace(/[#>*_`|-]/g, " ");

const words = text.split(/\s+/).filter((word) => word.length > 0);
console.log(`${file}: ${words.length} words (limit ${LIMIT})`);
if (words.length > LIMIT) {
  console.error("over the limit");
  process.exit(1);
}
