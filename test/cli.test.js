'use strict';
// Zero-dep test runner for the specship CLI. Run: npm test
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
const VERSION = require('../package.json').version;
let passed = 0;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'specship-'));
}
function af(args, dir) {
  return execFileSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
}
function read(p) {
  return fs.readFileSync(p, 'utf8');
}
// Run the CLI expecting a non-zero exit; returns { status, out } (stdout+stderr).
function afFail(args, dir) {
  try {
    execFileSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return { status: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
  throw new Error(`expected non-zero exit: ${args.join(' ')}`);
}
function writeTask(dir, id, taskFm, files = {}, taskBody = '# Task\n') {
  const td = path.join(dir, 'tasks', id);
  fs.mkdirSync(td, { recursive: true });
  fs.writeFileSync(path.join(td, 'task.md'), `---\n${taskFm}\n---\n\n${taskBody}`);
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(td, name), body);
  return td;
}
function count(hay, needle) {
  return hay.split(needle).length - 1;
}
function test(name, fn) {
  fn();
  console.log(`  ok  ${name}`);
  passed++;
}

test('init --claude scaffolds skills + creates CLAUDE.md', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  assert.ok(fs.existsSync(path.join(d, '.claude/skills/WORKFLOW.md')), 'WORKFLOW.md');
  assert.ok(fs.existsSync(path.join(d, '.claude/skills/spec/SKILL.md')), 'spec SKILL.md');
  assert.match(read(path.join(d, 'CLAUDE.md')), /specship:start/);
});

test('merge preserves existing CLAUDE.md content', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '# Mine\nkeep me\n');
  af(['init', '--claude'], d);
  const c = read(path.join(d, 'CLAUDE.md'));
  assert.match(c, /keep me/);
  assert.match(c, /specship:start/);
});

test('re-running init is idempotent (one marker block)', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  af(['init', '--claude'], d);
  assert.strictEqual(count(read(path.join(d, 'CLAUDE.md')), 'specship:start'), 1);
});

test('default keeps user-modified skills; --force overwrites', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  const skill = path.join(d, '.claude/skills/spec/SKILL.md');
  fs.writeFileSync(skill, 'CUSTOM');
  af(['init', '--claude'], d); // no --force
  assert.strictEqual(read(skill), 'CUSTOM', 'should be kept');
  af(['init', '--claude', '--force'], d);
  assert.notStrictEqual(read(skill), 'CUSTOM', 'should be overwritten');
});

test('--all installs each agent at its native paths', () => {
  const d = tmp();
  af(['init', '--all'], d);
  assert.ok(fs.existsSync(path.join(d, '.claude/skills/WORKFLOW.md')));
  assert.ok(fs.existsSync(path.join(d, '.codex/skills/WORKFLOW.md')));
  assert.ok(fs.existsSync(path.join(d, '.agents/skills/WORKFLOW.md')), 'agents → .agents/skills');
  assert.ok(fs.existsSync(path.join(d, '.gemini/skills/WORKFLOW.md')), 'gemini → .gemini/skills');
  assert.ok(fs.existsSync(path.join(d, '.cursor/skills/WORKFLOW.md')));
  assert.ok(fs.existsSync(path.join(d, '.agent/skills/WORKFLOW.md')), 'antigravity → .agent/skills');
  assert.ok(fs.existsSync(path.join(d, '.specship/skills/WORKFLOW.md')), 'adapter agents → .specship/skills');
  assert.match(read(path.join(d, 'GEMINI.md')), /specship:start/);
  assert.ok(fs.existsSync(path.join(d, '.cursor/rules/specship.mdc')));
  assert.ok(fs.existsSync(path.join(d, '.agent/rules/specship.md')));
  assert.ok(fs.existsSync(path.join(d, '.github/copilot-instructions.md')));
  assert.ok(fs.existsSync(path.join(d, '.windsurf/rules/specship.md')));
  assert.ok(fs.existsSync(path.join(d, '.clinerules/specship.md')));
  assert.ok(fs.existsSync(path.join(d, '.roo/rules/specship.md')));
});

test('openai.yaml manifest installs for codex only', () => {
  const d = tmp();
  af(['init', '--all'], d);
  assert.ok(fs.existsSync(path.join(d, '.codex/skills/spec/agents/openai.yaml')), 'codex gets manifest');
  assert.ok(!fs.existsSync(path.join(d, '.claude/skills/spec/agents/openai.yaml')), 'claude skips it');
  assert.ok(!fs.existsSync(path.join(d, '.agents/skills/spec/agents')), 'agents skips it');
  assert.ok(!fs.existsSync(path.join(d, '.gemini/skills/spec/agents')), 'gemini skips it');
  assert.ok(!fs.existsSync(path.join(d, '.cursor/skills/spec/agents')), 'cursor skips it');
  assert.ok(!fs.existsSync(path.join(d, '.agent/skills/spec/agents')), 'antigravity skips it');
  assert.ok(!fs.existsSync(path.join(d, '.specship/skills/spec/agents')), 'shared adapters skip it');
});

test('stage skills ship the per-stage model mapping', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  for (const s of ['spec', 'plan', 'review', 'debug']) {
    assert.match(read(path.join(d, `.claude/skills/${s}/SKILL.md`)), /^model: opus$/m, `${s} → opus`);
  }
  assert.match(read(path.join(d, '.claude/skills/coding/SKILL.md')), /^model: sonnet$/m, 'coding → sonnet');
  for (const s of ['ship', 'explore-source', 'research', 'pause-task', 'resume-task', 'archive-task']) {
    assert.doesNotMatch(read(path.join(d, `.claude/skills/${s}/SKILL.md`)), /^model:/m, `${s} inherits`);
  }
});

test('installed skills reference resolves (../WORKFLOW.md)', () => {
  const d = tmp();
  af(['init', '--codex'], d);
  const skill = read(path.join(d, '.codex/skills/coding/SKILL.md'));
  assert.match(skill, /\.\.\/WORKFLOW\.md/);
  assert.ok(fs.existsSync(path.join(d, '.codex/skills/coding/../WORKFLOW.md')));
});

test('list reports installed agents', () => {
  const d = tmp();
  af(['init', '--gemini'], d);
  const out = af(['list'], d);
  assert.match(out, /✓ Gemini CLI/);
  assert.match(out, /· Claude Code/);
});

test('shared-skill adapters are detected by their own config', () => {
  const d = tmp();
  af(['init', '--windsurf'], d);
  const out = af(['list'], d);
  assert.match(out, /✓ Windsurf/);
  assert.match(out, /· GitHub Copilot/);
  assert.match(out, /· Cline/);
  assert.match(out, /· Roo Code/);
});

test('update refreshes only installed agents', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  const skill = path.join(d, '.claude/skills/spec/SKILL.md');
  fs.writeFileSync(skill, 'STALE');
  af(['update'], d); // implies --force on installed targets
  assert.notStrictEqual(read(skill), 'STALE', 'update should refresh skills');
});

test('merge block carries the package version stamp', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  assert.match(read(path.join(d, 'CLAUDE.md')), new RegExp(`specship:v${VERSION.replace(/\./g, '\\.')}`));
});

test('pre-existing copilot-instructions.md is not claimed by other adapters', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.github'));
  fs.writeFileSync(path.join(d, '.github/copilot-instructions.md'), '# team rules\n');
  af(['init', '--windsurf'], d);
  const out = af(['list'], d);
  assert.match(out, /✓ Windsurf/);
  assert.match(out, /· GitHub Copilot/);
  af(['update'], d);
  assert.strictEqual(read(path.join(d, '.github/copilot-instructions.md')), '# team rules\n', 'update must not touch it');
});

test('codex and agents converge on one AGENTS.md block regardless of order', () => {
  const a = tmp();
  af(['init', '--codex'], a);
  af(['init', '--agents'], a);
  const b = tmp();
  af(['init', '--agents'], b);
  af(['init', '--codex'], b);
  const doc = read(path.join(a, 'AGENTS.md'));
  assert.strictEqual(doc, read(path.join(b, 'AGENTS.md')), 'order must not change the result');
  assert.strictEqual(count(doc, 'specship:start'), 1);
  assert.match(doc, /\.codex\/skills\/WORKFLOW\.md/);
  assert.match(doc, /\.agents\/skills\/WORKFLOW\.md/);
});

test('--dry-run writes nothing', () => {
  const d = tmp();
  const out = af(['init', '--claude', '--dry-run'], d);
  assert.match(out, /dry-run/);
  assert.strictEqual(fs.readdirSync(d).length, 0, 'dir must stay empty');
  af(['init', '--claude'], d);
  const before = read(path.join(d, 'CLAUDE.md'));
  const out2 = af(['uninstall', '--claude', '--dry-run'], d);
  assert.match(out2, /would be removed/);
  assert.ok(fs.existsSync(path.join(d, '.claude/skills/WORKFLOW.md')), 'skills must survive dry-run');
  assert.strictEqual(read(path.join(d, 'CLAUDE.md')), before, 'config must survive dry-run');
});

test('uninstall strips the block but keeps user content', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '# Mine\nkeep me\n');
  af(['init', '--claude'], d);
  af(['uninstall', '--claude'], d);
  assert.ok(!fs.existsSync(path.join(d, '.claude')), 'skills dir removed');
  const doc = read(path.join(d, 'CLAUDE.md'));
  assert.match(doc, /keep me/);
  assert.doesNotMatch(doc, /specship:start/);
});

test('uninstall removes a config file that held only the specship block', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  af(['uninstall', '--claude'], d);
  assert.ok(!fs.existsSync(path.join(d, 'CLAUDE.md')));
});

test('uninstall removes only specship-installed skill files', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  const mine = path.join(d, '.claude/skills/my-own-skill/SKILL.md');
  fs.mkdirSync(path.dirname(mine), { recursive: true });
  fs.writeFileSync(mine, 'mine');
  af(['uninstall', '--claude'], d);
  assert.ok(fs.existsSync(mine), 'user-authored skill must survive');
  assert.ok(!fs.existsSync(path.join(d, '.claude/skills/WORKFLOW.md')), 'specship files removed');
  assert.ok(!fs.existsSync(path.join(d, '.claude/skills/spec')), 'specship skill dirs pruned');
});

test('uninstall keeps shared skills until the last adapter leaves', () => {
  const d = tmp();
  af(['init', '--windsurf', '--cline'], d);
  af(['uninstall', '--windsurf'], d);
  assert.ok(fs.existsSync(path.join(d, '.specship/skills/WORKFLOW.md')), 'cline still uses it');
  assert.ok(!fs.existsSync(path.join(d, '.windsurf')), 'windsurf rule removed');
  af(['uninstall', '--cline'], d);
  assert.ok(!fs.existsSync(path.join(d, '.specship')), 'last adapter removes shared skills');
  assert.ok(!fs.existsSync(path.join(d, '.clinerules')));
});

test('doctor passes on a clean install, flags drift and stale stamps', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  assert.match(af(['doctor'], d), /✓ Claude Code/);
  fs.writeFileSync(path.join(d, '.claude/skills/spec/SKILL.md'), 'DRIFTED');
  const r = afFail(['doctor'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /spec\/SKILL\.md/);
  af(['update'], d);
  assert.match(af(['doctor'], d), /✓ Claude Code/, 'update heals the drift');
});

test('check passes with no tasks/ and with a conforming task', () => {
  const d = tmp();
  assert.match(af(['check'], d), /OK/);
  writeTask(d, 'TASK-001',
    'task: TASK-001\ntitle: demo\nstage: coding\nstatus: active\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700',
    {
      'spec.md': '---\nstatus: confirmed\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700\n---\n\n- R1: do the thing\n\n- [ ] AC1 (covers R1): works\n\n- [x] Q1 (blocker): resolved before confirm\n- [ ] Q2: acknowledged, may stay open\n',
      'plan.md': '---\nstatus: approved\ncreated: 2026-07-07 10:30 +0700\nupdated: 2026-07-07 10:30 +0700\n---\n\n- [ ] S1 — build it (covers: R1, AC1) → verify: npm test\n',
    },
    // Pipeline Log mixing agent-labeled and unlabeled lines — both are valid (R4, Agent handoff).
    '# Task\n\n## Pipeline Log\n- 2026-07-07 10:00 +0700 spec (claude-code): confirmed\n- 2026-07-07 10:30 +0700 plan: approved\n- 2026-07-07 11:00 +0700 coding (codex): started S1\n');
  assert.match(af(['check'], d), /OK/);
});

test('check fails on contract violations with named findings', () => {
  const d = tmp();
  writeTask(d, 'TASK-002',
    'task: TASK-002\ntitle: broken\nstage: coding\nstatus: active\ncreated: 2026-07-07\nupdated: 2026-07-07 11:00 +0700',
    {
      'spec.md': '---\nstatus: draft\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700\n---\n\n- R1: thing\n\n- [ ] AC1 (covers R1): works\n',
      'plan.md': '---\nstatus: approved\ncreated: 2026-07-07 10:30 +0700\nupdated: 2026-07-07 10:30 +0700\n---\n\n- [ ] S1 — build (covers: R9) → verify: npm test\n',
    });
  const r = afFail(['check'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /spec\.md status is `draft`/);
  assert.match(r.out, /created `2026-07-07` not/);
  assert.match(r.out, /covers `R9` which spec\.md does not define/);
});

test('check flags a confirmed spec that still has open blocker questions', () => {
  const d = tmp();
  writeTask(d, 'TASK-003',
    'task: TASK-003\ntitle: leaky\nstage: spec\nstatus: active\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700',
    {
      'spec.md': '---\nstatus: confirmed\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700\n---\n\n- R1: thing\n\n- [ ] AC1 (covers R1): works\n\n- [ ] Q1 (blocker): still unanswered — proposed: default\n- [ ] Q2: non-blocker, fine to stay open\n',
    });
  const r = afFail(['check'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /confirmed but blocker questions are unticked: Q1/);
  assert.doesNotMatch(r.out, /Q2/);
});

test('tasks lists active tasks and hides the archive', () => {
  const d = tmp();
  writeTask(d, 'TASK-001', 'task: TASK-001\ntitle: live one\nstage: plan\nstatus: active\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700');
  const archived = writeTask(d, 'TASK-000', 'task: TASK-000\ntitle: old one\nstage: done\nstatus: done\ncreated: 2026-07-01 10:00 +0700\nupdated: 2026-07-01 10:00 +0700');
  fs.mkdirSync(path.join(d, 'tasks/archive'), { recursive: true });
  fs.renameSync(archived, path.join(d, 'tasks/archive/TASK-000'));
  const out = af(['tasks'], d);
  assert.match(out, /TASK-001.*plan.*active.*live one/);
  assert.doesNotMatch(out, /TASK-000/);
});

test('bare init without a TTY still fails with the agent list', () => {
  const d = tmp();
  const r = afFail(['init'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /Pick at least one agent/);
});

console.log(`\n${passed} passed`);
