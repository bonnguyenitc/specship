'use strict';
// Reads the tasks/ pipeline state that the workflow skills write
// (see skills/WORKFLOW.md - the shared-state contract this validates).
const fs = require('fs');
const path = require('path');

const STAGES = ['spec', 'plan', 'coding', 'review', 'done'];
const STATUSES = ['active', 'blocked', 'paused', 'done'];
// `YYYY-MM-DD HH:MM +TZ` - offset as +07, +0700 or +07:00.
const TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} [+-]\d{2}(:?\d{2})?$/;

// Minimal frontmatter reader: top-level `key: value` lines between --- fences.
// Indented lines (the artifacts: map) are skipped; `# comments` are stripped.
function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return data;
    const m = lines[i].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/\s+#.*$/, '').trim();
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

module.exports = { check, taskRows };
