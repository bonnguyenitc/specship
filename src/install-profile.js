'use strict';
// The install profile decides how the skill tree is generated for a project.
// It is *persisted* (.specship/install.json) rather than inferred from the
// generated files, so `update`/`doctor` can't silently fall back to the default
// after a user edits a skill (skills/WORKFLOW.md → External phase execution).
const fs = require('fs');
const path = require('path');
const TARGETS = require('./targets');

const VERSION = require('../package.json').version;
const PROFILES = ['interactive', 'orchestrated'];
const DEFAULT_PROFILE = 'interactive';
const MANIFEST_REL = path.join('.specship', 'install.json');

function manifestPath(projectDir) {
  return path.join(projectDir, MANIFEST_REL);
}

// The persisted profile as `{ profile }`, or `{ error }` when the manifest is
// there but cannot be trusted. Never throws.
//
// Absent is fine - that is a plain install, and the default is the truth. But an
// unreadable or unrecognised manifest must *stop* the run rather than degrade to
// `interactive`: install() feeds the result straight back to writeProfile(),
// which unlinks the manifest for the default profile. Guessing therefore re-pins
// the Claude models this profile exists to unpin, and then deletes the only
// record that a profile was ever chosen (BUG6).
function readProfile(projectDir) {
  const p = manifestPath(projectDir);
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return { profile: DEFAULT_PROFILE };
    return { error: `cannot read ${MANIFEST_REL} (${e.code}) - fix or delete it; refusing to guess the install profile` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `${MANIFEST_REL} is not valid JSON - fix or delete it; refusing to guess the install profile` };
  }
  if (!PROFILES.includes(parsed && parsed.profile)) {
    return { error: `${MANIFEST_REL} names profile \`${parsed && parsed.profile}\`, which this specship (v${VERSION}) does not know (${PROFILES.join(' | ')}) - upgrade specship, or fix the file` };
  }
  return { profile: parsed.profile };
}

// Only a non-default profile needs recording; choosing `interactive` again
// removes the manifest so the project is byte-identical to a plain install.
function writeProfile(projectDir, profile, { dry = false } = {}) {
  const p = manifestPath(projectDir);
  if (profile === DEFAULT_PROFILE) {
    if (!dry && fs.existsSync(p)) fs.unlinkSync(p);
    return null;
  }
  if (!dry) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify({ profile, version: VERSION }, null, 2) + '\n');
  }
  return MANIFEST_REL;
}

// Drop the manifest once nothing is installed any more, and take the `.specship/`
// dir with it if we were the last thing in it (shared adapters keep their skills
// there, so only remove it when it is genuinely empty).
function removeProfile(projectDir, { dry = false } = {}) {
  const p = manifestPath(projectDir);
  if (dry || !fs.existsSync(p)) return;
  fs.unlinkSync(p);
  try {
    if (fs.readdirSync(path.dirname(p)).length === 0) fs.rmdirSync(path.dirname(p));
  } catch { /* someone else's files live there - leave it alone */ }
}

// Reject an unknown profile, or an orchestrated install for a target that is
// not a certified external actor - fail before writing anything (R1, R10).
function validateProfile(profile, names) {
  if (!PROFILES.includes(profile)) {
    return `Unknown profile: ${profile} (expected ${PROFILES.join(' or ')})`;
  }
  if (profile !== 'orchestrated') return null;
  const uncertified = names.filter((n) => !TARGETS[n].actor);
  if (uncertified.length) {
    const certified = Object.keys(TARGETS).filter((n) => TARGETS[n].actor).map((n) => TARGETS[n].label);
    return `The orchestrated profile is only certified for ${certified.join(' and ')}; `
      + `${uncertified.map((n) => TARGETS[n].label).join(', ')} ${uncertified.length > 1 ? 'are' : 'is'} not certified. `
      + `Install ${uncertified.map((n) => `--${n}`).join(' ')} without --profile orchestrated.`;
  }
  return null;
}

module.exports = { PROFILES, DEFAULT_PROFILE, MANIFEST_REL, readProfile, writeProfile, removeProfile, validateProfile };
