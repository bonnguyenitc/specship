'use strict';
const fs = require('fs');
const path = require('path');
const TARGETS = require('./targets');

const PKG_ROOT = path.join(__dirname, '..');
const MARK_START = '<!-- specship:start -->';
const MARK_END = '<!-- specship:end -->';
const IGNORE = new Set(['__pycache__', '.DS_Store']);
// Per-vendor skill manifests live in `<skill>/agents/`; only the target's own
// file is installed (see `manifest` in targets.js), so each agent gets its format.
const VENDOR_DIR = 'agents';

function copyFile(src, dest, force, acc) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest) && !force) {
    if (!fs.readFileSync(src).equals(fs.readFileSync(dest))) acc.skipped++;
    return; // identical or user-modified → leave it (use --force to overwrite)
  }
  fs.copyFileSync(src, dest);
  acc.written++;
}

function copyDir(src, dest, force, acc = { written: 0, skipped: 0 }, { skipDirs } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    if (entry.isDirectory() && skipDirs && skipDirs.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, force, acc, { skipDirs });
    else copyFile(s, d, force, acc);
  }
  return acc;
}

// Copy each skill's vendor manifest (`<skill>/agents/<manifestName>`) for one target.
function copyManifests(srcSkills, destSkills, manifestName, force, acc) {
  for (const entry of fs.readdirSync(srcSkills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = path.join(srcSkills, entry.name, VENDOR_DIR, manifestName);
    if (fs.existsSync(m)) {
      copyFile(m, path.join(destSkills, entry.name, VENDOR_DIR, manifestName), force, acc);
    }
  }
}

// Insert/replace an idempotent specship marker block in an existing file,
// or create the file with just the block. Always safe — only touches its block.
function mergeDoc(srcFile, destFile) {
  const body = fs.readFileSync(srcFile, 'utf8').trim();
  const block = `${MARK_START}\n${body}\n${MARK_END}\n`;
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  if (!fs.existsSync(destFile)) {
    fs.writeFileSync(destFile, block);
    return 'created';
  }
  const cur = fs.readFileSync(destFile, 'utf8');
  const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`);
  if (re.test(cur)) {
    fs.writeFileSync(destFile, cur.replace(re, block));
    return 'updated';
  }
  const sep = cur.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(destFile, cur + sep + block);
  return 'merged';
}

// Standalone config file (e.g. a Cursor rule): write it, respecting --force.
function writeDoc(srcFile, destFile, force) {
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  const exists = fs.existsSync(destFile);
  if (exists && !force && !fs.readFileSync(srcFile).equals(fs.readFileSync(destFile))) {
    return 'skipped (use --force)';
  }
  fs.copyFileSync(srcFile, destFile);
  return exists ? 'updated' : 'written';
}

function initTarget(name, projectDir, { force = false } = {}) {
  const t = TARGETS[name];
  const lines = [];

  const srcSkills = path.join(PKG_ROOT, 'skills');
  const destSkills = path.join(projectDir, t.skillsDest);
  // The shared skill tree goes to every agent; the per-vendor `agents/` manifests
  // are skipped here and only the target's own one is copied (if any).
  const r = copyDir(srcSkills, destSkills, force, undefined, { skipDirs: new Set([VENDOR_DIR]) });
  if (t.manifest) copyManifests(srcSkills, destSkills, t.manifest, force, r);
  let s = `skills  → ${t.skillsDest}/ (${r.written} written`;
  if (r.skipped) s += `, ${r.skipped} kept — use --force to overwrite`;
  lines.push(s + ')');

  const action = t.doc.merge
    ? mergeDoc(path.join(PKG_ROOT, t.doc.src), path.join(projectDir, t.doc.dest))
    : writeDoc(path.join(PKG_ROOT, t.doc.src), path.join(projectDir, t.doc.dest), force);
  lines.push(`config  → ${t.doc.dest} (${action})`);

  return lines;
}

// Agents already present in a project = those whose skills folder exists.
function detectInstalled(projectDir) {
  return Object.keys(TARGETS).filter((n) =>
    fs.existsSync(path.join(projectDir, TARGETS[n].skillsDest))
  );
}

module.exports = { initTarget, detectInstalled, TARGETS };
