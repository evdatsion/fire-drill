#!/usr/bin/env node
// Builds the submission ZIP from skill/backup-fire-drill/ and nothing else.
// Pure Node (store method, fixed timestamp): no zip CLI or dependency
// needed, and the output is byte-deterministic. The result is a build
// artifact (build/ is not committed); CI rebuilds it and runs the official
// kit checker against the unzipped copy.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "skill", "backup-fire-drill");
const buildDir = path.join(root, "build");
const zipPath = path.join(buildDir, "backup-fire-drill.zip");

if (!existsSync(path.join(source, "SKILL.md"))) {
  console.error("skill/backup-fire-drill/SKILL.md not found; run from the repository root");
  process.exit(1);
}

// Guard: the package must hold only SKILL.md and references/*.md.
const allowed = new Set(["SKILL.md", "references"]);
for (const entry of readdirSync(source)) {
  if (!allowed.has(entry)) {
    console.error(`unexpected entry in the skill package: ${entry}`);
    process.exit(1);
  }
}
for (const entry of readdirSync(path.join(source, "references"))) {
  if (!entry.endsWith(".md") || statSync(path.join(source, "references", entry)).isDirectory()) {
    console.error(`unexpected entry in references/: ${entry}`);
    process.exit(1);
  }
}

function collect(dir, prefix) {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...collect(full, `${prefix}${entry}/`));
    else files.push({ name: `${prefix}${entry}`, data: readFileSync(full) });
  }
  return files;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  // Fixed timestamp 2026-11-12 00:00:00 (DOS format): deterministic output.
  const dosTime = 0;
  const dosDate = (2026 - 1980) << 9 | 11 << 5 | 12;
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, file.data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(dosTime, 12);
    entry.writeUInt16LE(dosDate, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(file.data.length, 20);
    entry.writeUInt32LE(file.data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);
    offset += 30 + nameBuf.length + file.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuf, end]);
}

const files = collect(source, "backup-fire-drill/");
rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });
writeFileSync(zipPath, zipStore(files));
const size = statSync(zipPath).size;
console.log(`built ${path.relative(root, zipPath)} (${size} bytes, ${files.length} files)`);
if (!existsSync(zipPath) || size < 500) {
  console.error("zip looks wrong");
  process.exit(1);
}
