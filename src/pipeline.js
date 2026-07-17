'use strict';
// Reads the tasks/ pipeline state that the workflow skills write
// (see skills/WORKFLOW.md - the shared-state contract this validates).
const fs = require('fs');
const path = require('path');
const TARGETS = require('./targets');

// The canonical actor ids certified for external orchestration, derived from the
// target registry so the CLI, the installer and the contract can never disagree.
const EXTERNAL_ACTORS = Object.values(TARGETS).filter((t) => t.actor).map((t) => t.actor);

const STAGES = ['spec', 'plan', 'coding', 'review', 'done'];
const STATUSES = ['active', 'blocked', 'paused', 'done'];
// The phases an external orchestrator may run (WORKFLOW.md → External phase execution).
const PHASES = ['spec', 'plan', 'coding', 'review', 'debug'];
// Schema version this parser writes/understands; v1 = pre-schema tasks (no `schema:`).
const SCHEMA_VERSION = 2;
// Legal values per artifact, in order (WORKFLOW.md → the shared state file).
const ARTIFACT_STATES = {
  spec: ['missing', 'draft', 'confirmed'],
  plan: ['missing', 'draft', 'approved'],
  coding: ['missing', 'in-progress', 'done'],
  review: ['missing', 'changes-requested', 'approved'],
  debug: ['missing', 'open-bugs', 'clear'],
};
// `YYYY-MM-DD HH:MM +TZ` - offset as +07, +0700 or +07:00.
const TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} [+-]\d{2}(:?\d{2})?$/;
// A task id is a path segment we join onto tasks/ - keep it ASCII and separator-free
// so traversal (`TASK-../x`) and Unicode confusables can never reach the filesystem.
const TASK_ID_RE = /^TASK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

function isSafeTaskId(id) {
  return typeof id === 'string' && id.length <= 64 && TASK_ID_RE.test(id);
}

// Minimal frontmatter reader: top-level `key: value` lines between --- fences.
// A key whose value is empty and whose next line is indented opens a one-level
// nested map (the `artifacts:` block); `# comments` are stripped.
function parseFrontmatter(text) {
  // A BOM would make the opening fence unrecognisable and read as "no frontmatter".
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const clean = (s) => s.replace(/\s+#.*$/, '').trim();
  // Blank and comment lines carry no data and must not end a nested map: they are
  // legal YAML the docblock above promises, and treating one as a terminator
  // silently dropped every following `artifacts:` entry (BUG2).
  // Past the end of the file is *not* noise — it is the end. Saying otherwise
  // makes the lookahead below walk off the array forever (BUG7).
  const noise = (s) => s !== undefined && (s.trim() === '' || /^\s*#/.test(s));
  const data = {};
  let nest = null; // key of the map currently being filled, if any
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return data;
    if (noise(lines[i])) continue;
    const child = lines[i].match(/^\s+([A-Za-z][\w-]*):\s*(.*)$/);
    if (child && nest) { data[nest][child[1]] = clean(child[2]); continue; }
    const m = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    // Only an indented follower turns an empty value into a map, so a bare
    // `stage:` still reads as '' (and still fails the required-key check).
    let next = i + 1;
    while (noise(lines[next])) next++;
    if (clean(m[2]) === '' && /^\s+[A-Za-z][\w-]*:/.test(lines[next] || '')) {
      data[m[1]] = {};
      nest = m[1];
      continue;
    }
    data[m[1]] = clean(m[2]);
    nest = null;
  }
  return null; // unterminated fence
}

function readArtifact(dir, file) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return null;
  const text = fs.readFileSync(p, 'utf8');
  return { text, fm: parseFrontmatter(text) };
}

// Active task folders (tasks/TASK-*), skipping tasks/archive/ and loose files.
function taskDirs(projectDir) {
  const root = path.join(projectDir, 'tasks');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('TASK-'))
    .map((e) => path.join(root, e.name))
    .sort();
}

// IDs spec.md defines: `- R1: …` / `- ~~R2 (removed …)~~` and `- [ ] AC1 …`.
function specIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(/^-\s+~{0,2}(R\d+)\b/gm)) ids.add(m[1]);
  for (const m of text.matchAll(/^-\s+\[[ x]\]\s+~{0,2}(AC\d+)\b/gm)) ids.add(m[1]);
  return ids;
}

function unticked(text, idRe) {
  const open = [];
  for (const m of text.matchAll(idRe)) open.push(m[1]);
  return open;
}

// Validate every active task against the WORKFLOW.md contract.
// Returns violations as strings; empty array = pass.
function check(projectDir) {
  const violations = [];
  for (const dir of taskDirs(projectDir)) {
    const id = path.basename(dir);
    const v = (msg) => violations.push(`${id}: ${msg}`);

    const task = readArtifact(dir, 'task.md');
    if (!task) { v('task.md missing'); continue; }
    if (!task.fm) { v('task.md frontmatter missing or unterminated'); continue; }
    for (const key of ['task', 'stage', 'status', 'created', 'updated']) {
      if (!task.fm[key]) v(`task.md frontmatter lacks \`${key}\``);
    }
    if (task.fm.stage && !STAGES.includes(task.fm.stage)) v(`task.md stage \`${task.fm.stage}\` not one of ${STAGES.join('|')}`);
    if (task.fm.status && !STATUSES.includes(task.fm.status)) v(`task.md status \`${task.fm.status}\` not one of ${STATUSES.join('|')}`);

    const artifacts = { 'task.md': task };
    for (const f of ['spec.md', 'plan.md', 'review.md', 'debug.md']) {
      const a = readArtifact(dir, f);
      if (a) artifacts[f] = a;
    }
    for (const [f, a] of Object.entries(artifacts)) {
      if (!a.fm) { if (f !== 'task.md') v(`${f} frontmatter missing or unterminated`); continue; }
      for (const key of ['created', 'updated']) {
        if (a.fm[key] && !TS_RE.test(a.fm[key])) v(`${f} ${key} \`${a.fm[key]}\` not \`YYYY-MM-DD HH:MM +TZ\``);
      }
    }

    // Stage preconditions (WORKFLOW.md → Flow integrity).
    const stageIdx = STAGES.indexOf(task.fm.stage);
    const spec = artifacts['spec.md'];
    const plan = artifacts['plan.md'];
    const review = artifacts['review.md'];
    if (stageIdx >= 1) {
      if (!spec) v('stage is past spec but spec.md is missing');
      else if (spec.fm && spec.fm.status !== 'confirmed') v(`stage is past spec but spec.md status is \`${spec.fm.status}\`, not confirmed`);
    }
    if (stageIdx >= 2) {
      if (!plan) v('stage is past plan but plan.md is missing');
      else if (plan.fm && plan.fm.status !== 'approved') v(`stage is past plan but plan.md status is \`${plan.fm.status}\`, not approved`);
    }
    // A confirmed spec cannot carry open blocker questions (WORKFLOW.md → Flow integrity:
    // plan requires spec confirmed with no open blocker Q#). Non-blocker Q#s may stay open.
    if (spec && spec.fm && spec.fm.status === 'confirmed') {
      const openBlockers = unticked(spec.text, /^-\s+\[ \]\s+(Q\d+)\s*\(blocker\)/gm);
      if (openBlockers.length) v(`spec.md is confirmed but blocker questions are unticked: ${openBlockers.join(', ')}`);
    }
    if (task.fm.stage === 'done') {
      if (!review) v('stage is done but review.md is missing');
      else if (review.fm && review.fm.status !== 'approved') v(`stage is done but review.md status is \`${review.fm.status}\`, not approved`);
      if (spec) {
        const openAC = unticked(spec.text, /^-\s+\[ \]\s+(AC\d+)\b/gm);
        if (openAC.length) v(`stage is done but unticked in spec.md: ${openAC.join(', ')}`);
      }
      if (plan) {
        const openS = unticked(plan.text, /^-\s+\[ \]\s+(S\d+)\b/gm);
        if (openS.length) v(`stage is done but unticked in plan.md: ${openS.join(', ')}`);
      }
    }

    // Cross-references: every ID a plan step covers must exist in spec.md.
    if (plan && spec) {
      const known = specIds(spec.text);
      for (const m of plan.text.matchAll(/\(covers:\s*([^)]*)\)/g)) {
        for (const ref of m[1].split(/[,\s]+/)) {
          if (/^(R|AC)\d+$/.test(ref) && !known.has(ref)) v(`plan.md covers \`${ref}\` which spec.md does not define`);
        }
      }
    }
  }
  return violations;
}

// The Now block's `- Blocked by: <what>` line; `none` reads as not blocked.
function blockedReason(text) {
  const m = text.match(/^-\s+Blocked by:\s*(.+)$/m);
  if (!m) return null;
  const v = m[1].trim().replace(/\.+$/, '');
  return /^none$/i.test(v) ? null : v;
}

// The deterministic transition gates (WORKFLOW.md → External phase execution).
// Artifact states are the source of truth; `next_phase` only *classifies* the
// review loop-back, which artifact state alone cannot express: whether the
// findings are ordinary work (`coding`), a defect hunt (`debug`), or already
// addressed and waiting to be re-reviewed (`review`). The rows are ordered:
// the first match wins.
function computeNextPhase(artifacts, explicit) {
  const a = artifacts;
  if (a.debug === 'open-bugs') return { phase: 'debug' };
  if (a.spec !== 'confirmed') return { phase: 'spec' };
  if (a.plan !== 'approved') return { phase: 'plan' };
  if (a.review === 'changes-requested') {
    if (explicit === 'coding' || explicit === 'debug') return { phase: explicit };
    // Without a way back to `review`, a changes-requested verdict is terminal:
    // the gate could only ever yield coding/debug, so the task could never be
    // approved and never reach done (BUG1).
    if (explicit === 'review') {
      if (a.coding !== 'done') {
        return { phase: null, issue: 'next_phase is `review` but coding is not `done` - the loop-back work has not landed' };
      }
      return { phase: 'review' };
    }
    return { phase: null, issue: 'review is changes-requested but next_phase does not classify `coding`, `debug` or `review`' };
  }
  if (a.coding !== 'done') return { phase: 'coding' };
  if (a.review !== 'approved') return { phase: 'review' };
  return { phase: null }; // approved review → nothing left to run
}

// The artifact file each `artifacts:` entry promises, and whether that file
// carries its own `status:` the map must agree with. `coding` has no file of
// its own - its progress lives in plan.md's S# ticks.
const ARTIFACT_FILES = { spec: 'spec.md', plan: 'plan.md', review: 'review.md', debug: 'debug.md' };
const FILE_STATUS = new Set(['spec', 'plan', 'review']);

// The `artifacts:` map is the gate's only input, so it has to be backed by what
// is actually on disk. Without this a task.md could promise a `confirmed` spec
// and an `approved` plan that were never written, and the phase gate would wave
// it through while `check` rejected the same task (BUG4). This is the "Flow
// integrity" precondition WORKFLOW.md promises `check --phase` enforces.
function backingIssues(dir, artifacts) {
  const issues = [];
  for (const [name, file] of Object.entries(ARTIFACT_FILES)) {
    if (artifacts[name] === 'missing') continue;
    const a = readArtifact(dir, file);
    if (!a) { issues.push(`task.md artifacts.${name} is \`${artifacts[name]}\` but ${file} is missing`); continue; }
    if (!FILE_STATUS.has(name)) continue;
    // The file must *declare* the status the map claims. Skipping the comparison
    // when there is nothing to compare would let the likeliest malformed artifact
    // - one with no frontmatter, or none that says `status:` - satisfy any claim.
    const status = a.fm && a.fm.status;
    if (!status) {
      issues.push(`task.md artifacts.${name} is \`${artifacts[name]}\` but ${file} declares no status`);
    } else if (status !== artifacts[name]) {
      issues.push(`task.md artifacts.${name} \`${artifacts[name]}\` but ${file} status is \`${status}\``);
    }
  }
  // `coding: done` means every planned step landed (WORKFLOW.md → Flow integrity:
  // review requires all S# ticked).
  const plan = artifacts.plan === 'missing' ? null : readArtifact(dir, 'plan.md');
  if (artifacts.coding === 'done' && plan) {
    const open = unticked(plan.text, /^-\s+\[ \]\s+(S\d+)\b/gm);
    if (open.length) issues.push(`task.md artifacts.coding is \`done\` but unticked in plan.md: ${open.join(', ')}`);
  }
  return issues;
}

// Normalized, read-only view of one task for `inspect`, `check` and `tasks`.
// Returns null when the id is unsafe or the task does not exist (caller → exit 2);
// a task that exists but violates the contract comes back with valid:false.
function loadTask(projectDir, id) {
  if (!isSafeTaskId(id)) return null;
  const dir = path.join(projectDir, 'tasks', id);
  const task = readArtifact(dir, 'task.md');
  if (!task) return null;

  const issues = [];
  const fm = task.fm || {};
  // A present-but-scalar `artifacts:` is a malformed map, not an absent one -
  // reading it as `{}` would silently default every artifact to `missing`.
  if (fm.artifacts !== undefined && fm.artifacts !== '' && typeof fm.artifacts !== 'object') {
    issues.push(`task.md artifacts \`${fm.artifacts}\` is not a map`);
  }
  const nested = (fm.artifacts && typeof fm.artifacts === 'object') ? fm.artifacts : {};
  const artifacts = {};
  for (const [name, legal] of Object.entries(ARTIFACT_STATES)) {
    const raw = nested[name];
    // A v1 task carries no artifacts map; `missing` is the safe default (R9).
    if (raw === undefined || raw === '') { artifacts[name] = 'missing'; continue; }
    if (!legal.includes(raw)) {
      issues.push(`task.md artifacts.${name} \`${raw}\` not one of ${legal.join('|')}`);
      artifacts[name] = 'missing';
      continue;
    }
    artifacts[name] = raw;
  }

  const schema = fm.schema === undefined || fm.schema === '' ? 1 : Number(fm.schema);
  if (!Number.isInteger(schema) || schema < 1) issues.push(`task.md schema \`${fm.schema}\` is not a positive integer`);
  else if (schema > SCHEMA_VERSION) issues.push(`task.md schema v${schema} is newer than this specship understands (v${SCHEMA_VERSION})`);

  const revRaw = fm.revision === undefined || fm.revision === '' ? '0' : fm.revision;
  const revision = Number(revRaw);
  if (!Number.isInteger(revision) || revision < 0) issues.push(`task.md revision \`${revRaw}\` is not a non-negative integer`);

  if (!task.fm) issues.push('task.md frontmatter missing or unterminated');
  for (const key of ['task', 'stage', 'status', 'created', 'updated']) {
    if (!fm[key]) issues.push(`task.md frontmatter lacks \`${key}\``);
  }
  if (fm.stage && !STAGES.includes(fm.stage)) issues.push(`task.md stage \`${fm.stage}\` not one of ${STAGES.join('|')}`);
  if (fm.status && !STATUSES.includes(fm.status)) issues.push(`task.md status \`${fm.status}\` not one of ${STATUSES.join('|')}`);

  // Identity: the folder name is authoritative; task.md and every artifact that
  // names a task must agree, or a writer could clobber a different task (R3).
  if (fm.task && fm.task !== id) issues.push(`task.md \`task: ${fm.task}\` does not match folder \`${id}\``);
  for (const f of ['spec.md', 'plan.md', 'review.md', 'debug.md']) {
    const a = readArtifact(dir, f);
    if (a && a.fm && a.fm.task && a.fm.task !== id) {
      issues.push(`${f} \`task: ${a.fm.task}\` does not match folder \`${id}\``);
    }
  }

  const resume = fm.resume_phase || null;
  if (resume && !['coding', 'review'].includes(resume)) {
    issues.push(`task.md resume_phase \`${resume}\` not one of coding|review`);
  }
  if (artifacts.debug === 'open-bugs' && !resume) {
    issues.push('task.md debug is open-bugs but resume_phase does not name coding|review');
  }
  if (artifacts.debug === 'clear' && resume) {
    issues.push(`task.md debug is clear but resume_phase \`${resume}\` was not cleared`);
  }

  issues.push(...backingIssues(dir, artifacts));

  const gate = computeNextPhase(artifacts, fm.next_phase);
  if (gate.issue) issues.push(gate.issue);
  // The gate may legitimately run *ahead* of `stage` (a stage checkpoints its own
  // artifact before the next one starts), and a review loop-back or an open bug
  // sends it backwards on purpose. Otherwise a gate behind `stage` means the
  // artifacts map contradicts where the task says it is - which is how a legacy
  // v1 task, whose absent map defaults to all-`missing`, derived `spec` for work
  // that already shipped (BUG5). A v1 task still at `spec` stays consistent, so
  // it remains orchestrable and its first checkpoint upgrades it in place (R9).
  const looping = artifacts.review === 'changes-requested' || artifacts.debug === 'open-bugs';
  const stageIdx = STAGES.indexOf(fm.stage);
  const gateIdx = gate.phase === null ? STAGES.length : STAGES.indexOf(gate.phase);
  if (!looping && !gate.issue && stageIdx >= 0 && gateIdx >= 0 && gateIdx < stageIdx) {
    issues.push(`task.md stage \`${fm.stage}\` is past the gate \`${gate.phase || 'none'}\` - the artifacts map contradicts the task's own stage`);
  }
  // The gates are derived, so an explicit next_phase may only agree with them.
  if (fm.next_phase && fm.next_phase !== gate.phase && !gate.issue) {
    issues.push(`task.md next_phase \`${fm.next_phase}\` contradicts the gate (\`${gate.phase || 'none'}\`)`);
  }
  if (fm.next_phase && !PHASES.includes(fm.next_phase)) {
    issues.push(`task.md next_phase \`${fm.next_phase}\` not one of ${PHASES.join('|')}`);
  }

  return {
    schema,
    task: id,
    title: fm.title || '',
    stage: fm.stage || null,
    status: fm.status || null,
    artifacts,
    blocked_reason: blockedReason(task.text),
    next_phase: gate.phase,
    resume_phase: resume,
    revision,
    updated: fm.updated || null,
    valid: issues.length === 0,
    issues,
  };
}

// Validate one named task against one phase gate, for an external orchestrator.
// Exit codes (WORKFLOW.md → External phase execution): 0 = the gate is valid,
// 1 = task state or gate invalid, 2 = bad input, unsupported schema, or no such task.
function checkPhase(projectDir, id, phase, { expectRevision, actor } = {}) {
  const body = (ok, issues, extra = {}) => Object.assign({ task: id, phase, ok, issues }, extra);
  if (!PHASES.includes(phase)) {
    return { code: 2, body: body(false, [`phase \`${phase}\` not one of ${PHASES.join('|')}`]) };
  }
  if (actor !== undefined && !EXTERNAL_ACTORS.includes(actor)) {
    return { code: 2, body: body(false, [`\`${actor}\` is not a certified external actor (${EXTERNAL_ACTORS.join('|')})`]) };
  }
  const s = loadTask(projectDir, id);
  if (!s) {
    return { code: 2, body: body(false, [`task \`${id}\` not found under tasks/ (or not a safe TASK-<ID>)`]) };
  }
  if (s.schema > SCHEMA_VERSION) {
    return { code: 2, body: body(false, [`task.md schema v${s.schema} is newer than this specship understands (v${SCHEMA_VERSION})`], { revision: s.revision }) };
  }
  // State must hold before a gate means anything; then the revision the caller
  // launched from must still be current, then the gate itself must match.
  const issues = s.issues.slice();
  if (expectRevision !== undefined && s.revision !== expectRevision) {
    issues.push(`revision is ${s.revision}, expected ${expectRevision} - the task moved on since it was handed out`);
  }
  if (s.next_phase !== phase) {
    issues.push(`gate is \`${s.next_phase || 'none'}\`, not \`${phase}\``);
  }
  return {
    code: issues.length ? 1 : 0,
    body: body(issues.length === 0, issues, { next_phase: s.next_phase, revision: s.revision }),
  };
}

// One row per active task for `specship tasks`.
function taskRows(projectDir) {
  return taskDirs(projectDir).map((dir) => {
    const task = readArtifact(dir, 'task.md');
    const fm = (task && task.fm) || {};
    return {
      id: path.basename(dir),
      title: fm.title || '(no task.md)',
      stage: fm.stage || '?',
      status: fm.status || '?',
      updated: fm.updated || '?',
    };
  });
}

module.exports = { check, taskRows, loadTask, checkPhase, isSafeTaskId, PHASES, SCHEMA_VERSION, EXTERNAL_ACTORS };
