'use strict';
const fs = require('fs');
const path = require('path');
const TARGETS = require('./targets');
const { DEFAULT_PROFILE, readProfile } = require('./install-profile');

const PKG_ROOT = path.join(__dirname, '..');
const VERSION = require('../package.json').version;
const MARK_START = '<!-- specship:start -->';
const MARK_END = '<!-- specship:end -->';
// Version stamp inside the merge block; the block regex predates it, so
// stamped and unstamped (pre-stamp) installs both keep matching on update.
const STAMP_RE = /<!-- specship:v(\S+) -->/;
const IGNORE = new Set(['__pycache__', '.DS_Store']);
// Per-vendor skill manifests live in `<skill>/agents/`; only the target's own
// file is installed (see `manifest` in targets.js), so each agent gets its format.
const VENDOR_DIR = 'agents';

function blockRe() {
  return new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`);
}

// `render(src)` returns the bytes a source file should have *in the project*.
// Every read of a packaged skill goes through it, so the profile transform is
// applied in exactly one place and install/doctor can never disagree.
const passthrough = (src) => fs.readFileSync(src);

function copyFile(src, dest, force, acc, dry, render = passthrough) {
  const want = render(src);
  if (fs.existsSync(dest) && !force) {
    if (!want.equals(fs.readFileSync(dest))) acc.skipped++;
    return; // identical or user-modified → leave it (use --force to overwrite)
  }
  if (!dry) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, want);
  }
  acc.written++;
}

function copyDir(src, dest, force, acc = { written: 0, skipped: 0 }, { skipDirs, dry, render } = {}) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    if (entry.isDirectory() && skipDirs && skipDirs.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, force, acc, { skipDirs, dry, render });
    else copyFile(s, d, force, acc, dry, render);
  }
  return acc;
}

// Copy each skill's vendor manifest (`<skill>/agents/<manifestName>`) for one target.
function copyManifests(srcSkills, destSkills, manifestName, force, acc, dry, render) {
  for (const entry of fs.readdirSync(srcSkills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = path.join(srcSkills, entry.name, VENDOR_DIR, manifestName);
    if (fs.existsSync(m)) {
      copyFile(m, path.join(destSkills, entry.name, VENDOR_DIR, manifestName), force, acc, dry, render);
    }
  }
}

// The five pipeline stages are the only skills that pin a Claude model.
const STAGE_SKILLS = new Set(['spec', 'plan', 'coding', 'review', 'debug']);

// Under the orchestrated profile the launcher passes an explicit model on the
// CLI, so an installed Claude stage skill must not pin one of its own - it
// rewrites `model: opus|sonnet` to `model: inherit`. This touches *generated*
// output only; the packaged skills keep their interactive defaults, and every
// other target (Codex included) is byte-for-byte unaffected.
function skillRenderer(name, profile) {
  if (profile !== 'orchestrated' || !TARGETS[name].modelFrontmatter) return passthrough;
  const srcRoot = path.join(PKG_ROOT, 'skills');
  return (src) => {
    const buf = fs.readFileSync(src);
    const parts = path.relative(srcRoot, src).split(path.sep);
    if (parts.length !== 2 || parts[1] !== 'SKILL.md' || !STAGE_SKILLS.has(parts[0])) return buf;
    return Buffer.from(buf.toString('utf8').replace(/^model: .*$/m, 'model: inherit'));
  };
}

// Insert/replace an idempotent specship marker block in an existing file,
// or create the file with just the block. Always safe - only touches its block.
function mergeDoc(srcFile, destFile, dry) {
  const body = fs.readFileSync(srcFile, 'utf8').trim();
  const block = `${MARK_START}\n<!-- specship:v${VERSION} -->\n${body}\n${MARK_END}\n`;
  if (!fs.existsSync(destFile)) {
    if (!dry) {
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      fs.writeFileSync(destFile, block);
    }
    return 'created';
  }
  const cur = fs.readFileSync(destFile, 'utf8');
  if (blockRe().test(cur)) {
    if (!dry) fs.writeFileSync(destFile, cur.replace(blockRe(), block));
    return 'updated';
  }
  const sep = cur.endsWith('\n') ? '\n' : '\n\n';
  if (!dry) fs.writeFileSync(destFile, cur + sep + block);
  return 'merged';
}

// Standalone config file (e.g. a Cursor rule): write it, respecting --force.
function writeDoc(srcFile, destFile, force, dry) {
  const exists = fs.existsSync(destFile);
  if (exists && !force && !fs.readFileSync(srcFile).equals(fs.readFileSync(destFile))) {
    return 'skipped (use --force)';
  }
  if (!dry) {
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(srcFile, destFile);
  }
  return exists ? 'updated' : 'written';
}

function initTarget(name, projectDir, { force = false, dry = false, profile = DEFAULT_PROFILE } = {}) {
  const t = TARGETS[name];
  const lines = [];

  const srcSkills = path.join(PKG_ROOT, 'skills');
  const destSkills = path.join(projectDir, t.skillsDest);
  const render = skillRenderer(name, profile);
  // The shared skill tree goes to every agent; the per-vendor `agents/` manifests
  // are skipped here and only the target's own one is copied (if any).
  const r = copyDir(srcSkills, destSkills, force, undefined, { skipDirs: new Set([VENDOR_DIR]), dry, render });
  if (t.manifest) copyManifests(srcSkills, destSkills, t.manifest, force, r, dry, render);
  let s = `skills  → ${t.skillsDest}/ (${r.written} ${dry ? 'would be written' : 'written'}`;
  if (r.skipped) s += `, ${r.skipped} kept - use --force to overwrite`;
  lines.push(s + ')');

  // Project-level subagent definitions, only for targets that declare a home
  // for them (see `subagents` in targets.js). Never profile-rendered: they
  // carry no model frontmatter, so every profile installs identical bytes.
  if (t.subagents) {
    const ra = copyDir(path.join(PKG_ROOT, 'agents'), path.join(projectDir, t.subagents), force, undefined, { dry });
    let sa = `agents  → ${t.subagents}/ (${ra.written} ${dry ? 'would be written' : 'written'}`;
    if (ra.skipped) sa += `, ${ra.skipped} kept - use --force to overwrite`;
    lines.push(sa + ')');
  }

  const action = t.doc.merge
    ? mergeDoc(path.join(PKG_ROOT, t.doc.src), path.join(projectDir, t.doc.dest), dry)
    : writeDoc(path.join(PKG_ROOT, t.doc.src), path.join(projectDir, t.doc.dest), force, dry);
  lines.push(`config  → ${t.doc.dest} (${action}${dry && !action.startsWith('skipped') ? ', dry-run' : ''})`);

  return lines;
}

// A target counts as installed only on specship's own fingerprint, not mere
// file existence: merge targets need the marker block in their dest (CLAUDE.md,
// AGENTS.md etc. commonly pre-exist without us); write targets' dest filename
// is specship-owned, so existence is the fingerprint. The skills folder alone
// can't disambiguate adapters sharing `.specship/skills`.
function detectInstalled(projectDir) {
  return Object.keys(TARGETS).filter((n) => {
    const t = TARGETS[n];
    if (!fs.existsSync(path.join(projectDir, t.skillsDest))) return false;
    const dest = path.join(projectDir, t.doc.dest);
    if (!fs.existsSync(dest)) return false;
    return t.doc.merge ? fs.readFileSync(dest, 'utf8').includes(MARK_START) : true;
  });
}

// Remove now-empty parent directories up to (not including) stopAt.
function pruneEmptyDirs(dir, stopAt) {
  while (dir !== stopAt && dir.startsWith(stopAt)) {
    try {
      if (fs.readdirSync(dir).length > 0) break;
      fs.rmdirSync(dir);
    } catch {
      break;
    }
    dir = path.dirname(dir);
  }
}

// Uninstall one target. `otherInstalled` = targets that stay installed after
// this run - shared resources (skills dir, a shared merge dest like AGENTS.md)
// are kept while any of them still uses the same path.
function uninstallTarget(name, projectDir, otherInstalled, { dry = false } = {}) {
  const t = TARGETS[name];
  const lines = [];

  const skillsSharer = otherInstalled.find((n) => TARGETS[n].skillsDest === t.skillsDest);
  if (skillsSharer) {
    lines.push(`skills  → ${t.skillsDest}/ kept (still used by ${TARGETS[skillsSharer].label})`);
  } else {
    // Remove only the files specship installed: agents' skills folders can
    // hold user-authored skills alongside ours. Prune dirs that became empty.
    const destSkills = path.join(projectDir, t.skillsDest);
    if (!dry) {
      for (const rel of expectedSkillFiles(t)) {
        const f = path.join(destSkills, rel);
        if (fs.existsSync(f)) fs.unlinkSync(f);
        pruneEmptyDirs(path.dirname(f), projectDir);
      }
      pruneEmptyDirs(destSkills, projectDir);
    }
    lines.push(`skills  → ${t.skillsDest}/ specship files ${dry ? 'would be removed' : 'removed'} (anything you added is kept)`);
  }

  if (t.subagents) {
    const agentsSharer = otherInstalled.find((n) => TARGETS[n].subagents === t.subagents);
    if (agentsSharer) {
      lines.push(`agents  → ${t.subagents}/ kept (still used by ${TARGETS[agentsSharer].label})`);
    } else {
      // Same rule as skills: the dir can hold user-authored agents - remove
      // only the files specship installed, then prune dirs that became empty.
      const destAgents = path.join(projectDir, t.subagents);
      if (!dry) {
        for (const rel of expectedAgentFiles(t)) {
          const f = path.join(destAgents, rel);
          if (fs.existsSync(f)) fs.unlinkSync(f);
          pruneEmptyDirs(path.dirname(f), projectDir);
        }
        pruneEmptyDirs(destAgents, projectDir);
      }
      lines.push(`agents  → ${t.subagents}/ specship files ${dry ? 'would be removed' : 'removed'} (anything you added is kept)`);
    }
  }

  const docSharer = otherInstalled.find((n) => TARGETS[n].doc.dest === t.doc.dest);
  const dest = path.join(projectDir, t.doc.dest);
  if (docSharer) {
    lines.push(`config  → ${t.doc.dest} kept (still used by ${TARGETS[docSharer].label})`);
  } else if (t.doc.merge) {
    const rest = fs.readFileSync(dest, 'utf8').replace(blockRe(), '').trim();
    if (rest === '') {
      if (!dry) fs.unlinkSync(dest);
      lines.push(`config  → ${t.doc.dest} ${dry ? 'would be removed' : 'removed'} (held only the specship block)`);
    } else {
      if (!dry) fs.writeFileSync(dest, rest + '\n');
      lines.push(`config  → ${t.doc.dest} specship block ${dry ? 'would be removed' : 'removed'}, your content kept`);
    }
  } else {
    if (!dry) {
      fs.unlinkSync(dest);
      pruneEmptyDirs(path.dirname(dest), projectDir);
    }
    lines.push(`config  → ${t.doc.dest} ${dry ? 'would be removed' : 'removed'}`);
  }

  return lines;
}

// All skill files the package would install for a target (paths relative to
// the skills root): the shared tree minus vendor dirs, plus the target's own
// per-skill manifests.
function expectedSkillFiles(t) {
  const src = path.join(PKG_ROOT, 'skills');
  const out = [];
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE.has(entry.name)) continue;
      if (entry.isDirectory() && entry.name === VENDOR_DIR) continue;
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), r);
      else out.push(r);
    }
  })(src, '');
  if (t.manifest) {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const rel = `${entry.name}/${VENDOR_DIR}/${t.manifest}`;
      if (fs.existsSync(path.join(src, rel))) out.push(rel);
    }
  }
  return out;
}

// All subagent files the package would install for a target (paths relative
// to the package-root `agents/` dir); empty for targets without `subagents`.
function expectedAgentFiles(t) {
  if (!t.subagents) return [];
  const out = [];
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE.has(entry.name)) continue;
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), r);
      else out.push(r);
    }
  })(path.join(PKG_ROOT, 'agents'), '');
  return out;
}

// Audit one installed target: skills drift vs the packaged tree, config
// marker/template integrity, version stamp vs the running package version.
// `profile` is resolved by the caller (cmdDoctor), which owns refusing an
// unreadable manifest - auditing must never guess it.
function doctorTarget(name, projectDir, profile = DEFAULT_PROFILE) {
  const t = TARGETS[name];
  const problems = [];
  const srcSkills = path.join(PKG_ROOT, 'skills');
  const destSkills = path.join(projectDir, t.skillsDest);
  // Audit against what *this profile* should have generated, not the default -
  // otherwise every orchestrated Claude stage skill would read as drifted.
  const render = skillRenderer(name, profile);

  const missing = [];
  const drifted = [];
  for (const rel of expectedSkillFiles(t)) {
    const d = path.join(destSkills, rel);
    if (!fs.existsSync(d)) missing.push(rel);
    else if (!render(path.join(srcSkills, rel)).equals(fs.readFileSync(d))) drifted.push(rel);
  }
  const nameSome = (list) => list.slice(0, 5).join(', ') + (list.length > 5 ? ` (+${list.length - 5} more)` : '');
  if (missing.length) problems.push(`missing skill file(s): ${nameSome(missing)} - run \`specship update\``);
  if (drifted.length) problems.push(`skill file(s) differ from specship v${VERSION}: ${nameSome(drifted)} - stale or user-modified; \`specship update\` overwrites`);

  // Subagent files audit byte-for-byte against the packaged sources: they are
  // never profile-rendered, so no `render` indirection here.
  if (t.subagents) {
    const aMissing = [];
    const aDrifted = [];
    for (const rel of expectedAgentFiles(t)) {
      const d = path.join(projectDir, t.subagents, rel);
      if (!fs.existsSync(d)) aMissing.push(rel);
      else if (!fs.readFileSync(path.join(PKG_ROOT, 'agents', rel)).equals(fs.readFileSync(d))) aDrifted.push(rel);
    }
    if (aMissing.length) problems.push(`missing agent file(s): ${nameSome(aMissing)} - run \`specship update\``);
    if (aDrifted.length) problems.push(`agent file(s) differ from specship v${VERSION}: ${nameSome(aDrifted)} - stale or user-modified; \`specship update\` overwrites`);
  }

  const dest = path.join(projectDir, t.doc.dest);
  if (t.doc.merge) {
    // detectInstalled guarantees the file and start marker exist, but the
    // block may still be corrupted (end marker edited away).
    const block = fs.readFileSync(dest, 'utf8').match(blockRe());
    const stamp = block && block[0].match(STAMP_RE);
    if (!block) problems.push(`${t.doc.dest} specship block is corrupted (end marker missing) - repair it before running \`specship update\``);
    else if (!stamp) problems.push(`${t.doc.dest} block carries no version stamp (older install) - run \`specship update\``);
    else if (stamp[1] !== VERSION) problems.push(`${t.doc.dest} block is v${stamp[1]}, package is v${VERSION} - run \`specship update\``);
  } else if (!fs.readFileSync(path.join(PKG_ROOT, t.doc.src)).equals(fs.readFileSync(dest))) {
    problems.push(`${t.doc.dest} differs from the packaged template - stale or user-modified; \`specship update\` overwrites`);
  }

  return problems;
}

module.exports = { initTarget, uninstallTarget, doctorTarget, detectInstalled, TARGETS, VERSION };
