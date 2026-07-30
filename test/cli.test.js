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

// Driven by the packaged `agents/` dir, not a filename list: a new subagent
// file must install (and stay claude-only) without this test being touched.
// Relative paths of every file under a dir, so the walk matches what copyDir
// and expectedAgentFiles actually do (recursive) - a shallow readdir would
// silently exempt a nested definition from every assertion below.
function filesUnder(root, rel = '', out = []) {
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) filesUnder(root, r, out);
    else out.push(r);
  }
  return out;
}

test('every packaged subagent installs for claude only', () => {
  const src = path.join(__dirname, '..', 'agents');
  const rels = filesUnder(src);
  for (const n of ['specship-explorer.md', 'specship-reviewer.md', 'specship-researcher.md']) {
    assert.ok(rels.includes(n), `${n} is shipped`);
  }
  const d = tmp();
  af(['init', '--all'], d);
  for (const r of rels) {
    const dest = path.join(d, '.claude/agents', r);
    assert.ok(fs.existsSync(dest), `claude gets ${r}`);
    assert.strictEqual(read(dest), read(path.join(src, r)), `${r} byte-identical to the packaged source`);
  }
  // No other target has a subagent home, so an --all install must not have
  // dropped these files anywhere else.
  const basenames = new Set(rels.map((r) => path.basename(r)));
  const agentsRoot = path.join(d, '.claude/agents');
  const strays = filesUnder(d)
    .filter((r) => basenames.has(path.basename(r)))
    .filter((r) => !path.join(d, r).startsWith(agentsRoot + path.sep));
  assert.deepStrictEqual(strays, [], 'subagents install only under .claude/agents');
  const d2 = tmp();
  af(['init', '--codex'], d2);
  assert.ok(!fs.existsSync(path.join(d2, '.claude')), 'codex install creates no .claude');
});

// src/init.js skips the profile renderer for agent files on the stated grounds
// that they pin no model. If one ever did, `--profile orchestrated` would
// install it verbatim and silently re-pin the model that profile exists to
// unpin (the BUG6 class), with doctor still reporting healthy.
test('no packaged subagent pins a model', () => {
  const src = path.join(__dirname, '..', 'agents');
  for (const r of filesUnder(src)) {
    assert.doesNotMatch(read(path.join(src, r)), /^model:/m,
      `${r} must not pin a model - agent files bypass the profile renderer`);
  }
});

test('user-modified subagent file is kept; --force overwrites', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  const agent = path.join(d, '.claude/agents/specship-explorer.md');
  fs.writeFileSync(agent, 'CUSTOM');
  af(['init', '--claude'], d); // no --force
  assert.strictEqual(read(agent), 'CUSTOM', 'should be kept');
  af(['init', '--claude', '--force'], d);
  assert.notStrictEqual(read(agent), 'CUSTOM', 'should be overwritten');
});

test('uninstall removes the specship subagent but keeps user agents', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  fs.writeFileSync(path.join(d, '.claude/agents/mine.md'), 'my agent\n');
  af(['uninstall', '--claude'], d);
  assert.ok(!fs.existsSync(path.join(d, '.claude/agents/specship-explorer.md')), 'specship agent removed');
  assert.strictEqual(read(path.join(d, '.claude/agents/mine.md')), 'my agent\n', 'user agent must survive');
  const d2 = tmp();
  af(['init', '--claude'], d2);
  af(['uninstall', '--claude'], d2);
  assert.ok(!fs.existsSync(path.join(d2, '.claude/agents')), 'emptied agents dir pruned');
});

test('doctor flags a missing or drifted subagent file; update restores it', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  const agent = path.join(d, '.claude/agents/specship-explorer.md');
  fs.unlinkSync(agent);
  let r = afFail(['doctor'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /missing agent file/);
  af(['update'], d);
  assert.ok(fs.existsSync(agent), 'update restores the agent file');
  fs.writeFileSync(agent, 'EDITED');
  r = afFail(['doctor'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /agent file\(s\) differ/);
  af(['update'], d);
  assert.match(af(['doctor'], d), /✓ Claude Code/, 'update heals the drift');
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

// A schema-v2 task at the coding gate, used by the inspect/check tests below.
// The artifact files a declared `artifacts:` map implies on disk - the gate reads
// the map, so a fixture that names artifacts it never writes is not a task any
// agent could produce (see test/pipeline.test.js → filesFor).
function filesFor(a) {
  const files = {};
  const head = (status) => `---\ntask: TASK-001\ntype: x\nstatus: ${status}\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700\n---\n`;
  if (a.spec !== 'missing') files['spec.md'] = head(a.spec) + '\n- R1: a requirement\n- [ ] AC1 something -> verify: x\n';
  if (a.plan !== 'missing') files['plan.md'] = head(a.plan) + `\n- [${a.coding === 'done' ? 'x' : ' '}] S1 - a step (covers: R1, AC1) -> verify: x\n`;
  if (a.review !== 'missing') files['review.md'] = head(a.review) + '\n## Findings\n';
  if (a.debug !== 'missing') files['debug.md'] = head('x') + '\n## BUG1 - a bug\n';
  return files;
}
function v2Task(d, over = {}) {
  const a = Object.assign(
    { spec: 'confirmed', plan: 'approved', coding: 'in-progress', review: 'missing', debug: 'missing' },
    over.artifacts || {});
  const head = Object.assign({
    task: 'TASK-001', title: 'demo', schema: 2, revision: 3, stage: 'coding', status: 'active',
    created: '2026-07-07 10:00 +0700', updated: '2026-07-07 11:00 +0700',
  }, over.head || {});
  const fm = Object.entries(head).map(([k, v]) => `${k}: ${v}`)
    .concat('artifacts:', Object.entries(a).map(([k, v]) => `  ${k}: ${v}`)).join('\n');
  const files = Object.assign(filesFor(a), over.files || {});
  return writeTask(d, 'TASK-001', fm, files, over.body || '# Task\n\n## Now\n- Blocked by: none\n');
}
// Hash every file under tasks/ so a command can be proven read-only.
function treeHash(dir) {
  const { createHash } = require('crypto');
  const h = createHash('sha256');
  (function walk(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) walk(f);
      else h.update(f).update(fs.readFileSync(f));
    }
  })(path.join(dir, 'tasks'));
  return h.digest('hex');
}

test('inspect returns the documented JSON shape without mutating anything', () => {
  const d = tmp();
  v2Task(d);
  const before = treeHash(d);
  const s = JSON.parse(af(['inspect', 'TASK-001', '--json'], d));
  assert.deepStrictEqual(Object.keys(s).sort(), [
    'artifacts', 'blocked_reason', 'issues', 'next_phase', 'resume_phase',
    'revision', 'schema', 'stage', 'status', 'task', 'title', 'updated', 'valid',
  ], 'stable field set');
  assert.strictEqual(s.task, 'TASK-001');
  assert.strictEqual(s.schema, 2);
  assert.strictEqual(s.revision, 3);
  assert.strictEqual(s.next_phase, 'coding');
  assert.strictEqual(s.valid, true);
  assert.deepStrictEqual(s.issues, []);
  assert.strictEqual(treeHash(d), before, 'inspect must be read-only');
});

test('inspect reports blocked, paused, done, debug, malformed and legacy v1 tasks', () => {
  const blocked = tmp();
  v2Task(blocked, { head: { status: 'blocked' }, body: '# Task\n\n## Now\n- Blocked by: payments API\n' });
  const b = JSON.parse(af(['inspect', 'TASK-001', '--json'], blocked));
  assert.strictEqual(b.status, 'blocked');
  assert.strictEqual(b.blocked_reason, 'payments API');

  const paused = tmp();
  v2Task(paused, { head: { status: 'paused' } });
  assert.strictEqual(JSON.parse(af(['inspect', 'TASK-001', '--json'], paused)).status, 'paused');

  const done = tmp();
  v2Task(done, { head: { stage: 'done', status: 'done' }, artifacts: { coding: 'done', review: 'approved' } });
  const dn = JSON.parse(af(['inspect', 'TASK-001', '--json'], done));
  assert.strictEqual(dn.next_phase, null, 'a done task has nothing left to run');

  const dbg = tmp();
  v2Task(dbg, { head: { status: 'blocked', resume_phase: 'coding' }, artifacts: { debug: 'open-bugs' } });
  const g = JSON.parse(af(['inspect', 'TASK-001', '--json'], dbg));
  assert.strictEqual(g.next_phase, 'debug');
  assert.strictEqual(g.resume_phase, 'coding');

  const bad = tmp();
  v2Task(bad, { artifacts: { spec: 'nonsense' } });
  const m = JSON.parse(af(['inspect', 'TASK-001', '--json'], bad));
  assert.strictEqual(m.valid, false, 'malformed still returns the shape');
  assert.ok(m.issues.length > 0);

  const legacy = tmp();
  writeTask(legacy, 'TASK-001', 'task: TASK-001\ntitle: old\nstage: plan\nstatus: active\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700');
  const l = JSON.parse(af(['inspect', 'TASK-001', '--json'], legacy));
  assert.strictEqual(l.schema, 1);
  assert.strictEqual(l.revision, 0);
});

test('inspect exits 2 for an unknown or unsafe task id', () => {
  const d = tmp();
  v2Task(d);
  assert.strictEqual(afFail(['inspect', 'TASK-404', '--json'], d).status, 2, 'not found');
  assert.strictEqual(afFail(['inspect', 'TASK-../etc', '--json'], d).status, 2, 'traversal');
  assert.strictEqual(afFail(['inspect'], d).status, 2, 'missing id');
});

test('phase check emits JSON-only stdout and exit 0 on a valid gate', () => {
  const d = tmp();
  v2Task(d);
  const out = af(['check', 'TASK-001', '--phase', 'coding', '--json'], d);
  const r = JSON.parse(out); // JSON-only: parses without stripping any prose
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.task, 'TASK-001');
  assert.strictEqual(r.phase, 'coding');
  assert.strictEqual(r.next_phase, 'coding');
  assert.strictEqual(r.revision, 3);
  assert.deepStrictEqual(r.issues, []);
});

test('phase check exits 1 when the requested phase is not the gate', () => {
  const d = tmp();
  v2Task(d);
  const r = afFail(['check', 'TASK-001', '--phase', 'review', '--json'], d);
  assert.strictEqual(r.status, 1);
  const j = JSON.parse(r.out);
  assert.strictEqual(j.ok, false);
  assert.match(j.issues.join('; '), /gate is `coding`, not `review`/);
});

test('phase check exits 1 on invalid task state', () => {
  const d = tmp();
  v2Task(d, { artifacts: { spec: 'nonsense' } });
  const r = afFail(['check', 'TASK-001', '--phase', 'coding', '--json'], d);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(JSON.parse(r.out).ok, false);
});

test('phase check exits 1 on a stale expected revision', () => {
  const d = tmp();
  v2Task(d);
  assert.strictEqual(JSON.parse(af(['check', 'TASK-001', '--phase', 'coding', '--expect-revision', '3', '--json'], d)).ok, true);
  const r = afFail(['check', 'TASK-001', '--phase', 'coding', '--expect-revision', '2', '--json'], d);
  assert.strictEqual(r.status, 1);
  assert.match(JSON.parse(r.out).issues.join('; '), /revision is 3, expected 2/);
});

test('phase check exits 2 on bad input, unknown task or unsupported schema', () => {
  const d = tmp();
  v2Task(d);
  assert.strictEqual(afFail(['check', 'TASK-001', '--phase', 'ship', '--json'], d).status, 2, 'not a phase');
  assert.strictEqual(afFail(['check', 'TASK-001', '--json'], d).status, 2, 'no --phase');
  assert.strictEqual(afFail(['check', 'TASK-404', '--phase', 'spec', '--json'], d).status, 2, 'unknown task');
  assert.strictEqual(afFail(['check', 'TASK-../etc', '--phase', 'spec', '--json'], d).status, 2, 'traversal');
  assert.strictEqual(afFail(['check', 'TASK-001', '--phase', 'coding', '--expect-revision', 'x', '--json'], d).status, 2, 'bad revision');

  const future = tmp();
  v2Task(future, { head: { schema: 99 } });
  assert.strictEqual(afFail(['check', 'TASK-001', '--phase', 'coding', '--json'], future).status, 2, 'unsupported schema');
});

test('phase check accepts only the certified external actors', () => {
  const d = tmp();
  v2Task(d);
  for (const actor of ['codex', 'claude-code']) {
    assert.strictEqual(JSON.parse(af(['check', 'TASK-001', '--phase', 'coding', '--actor', actor, '--json'], d)).ok,
      true, `${actor} is certified`);
  }
  // Legacy install targets are not certified orchestration actors in v1.
  for (const actor of ['gemini', 'cursor', 'antigravity', 'agents', 'copilot', 'windsurf', 'cline', 'roo', 'claude']) {
    const r = afFail(['check', 'TASK-001', '--phase', 'coding', '--actor', actor, '--json'], d);
    assert.strictEqual(r.status, 2, `${actor} → exit 2 (unsupported actor)`);
    assert.match(JSON.parse(r.out).issues.join('; '), /not a certified external actor/);
  }
});

test('installed skills define the external phase contract for both actors', () => {
  const d = tmp();
  af(['init', '--codex', '--claude'], d);
  for (const root of ['.codex/skills', '.claude/skills']) {
    const wf = read(path.join(d, root, 'WORKFLOW.md'));
    assert.match(wf, /## External phase execution/, `${root}: contract section`);
    assert.match(wf, /specship check TASK-<ID> --phase/, `${root}: gate command`);
    assert.match(wf, /--expect-revision/, `${root}: expected revision`);
    assert.match(wf, /`codex`/, `${root}: codex actor`);
    assert.match(wf, /`claude-code`/, `${root}: claude-code actor`);
    // One phase only, then stop — never chain into a neighbouring stage.
    assert.match(wf, /runs exactly one phase/i, `${root}: one-phase rule`);
    // task.md is written last so a crash can never leave a forward-dated state.
    assert.match(wf, /task\.md.{0,4}last/, `${root}: write ordering`);
  }
  // Every stage skill states its external behavior; ship/resume-task opt out.
  for (const s of ['spec', 'plan', 'coding', 'review', 'debug']) {
    assert.match(read(path.join(d, `.claude/skills/${s}/SKILL.md`)), /External phase execution/, `${s} skill`);
  }
  for (const s of ['ship', 'resume-task']) {
    assert.match(read(path.join(d, `.claude/skills/${s}/SKILL.md`)), /not an external phase/i, `${s} opts out`);
  }
});

test('the certified actor set is exactly codex and claude-code, everywhere', () => {
  // The registry is the single source: the CLI allowlist and the contract text
  // both derive from it, so they cannot drift apart.
  const TARGETS = require('../src/targets');
  const { EXTERNAL_ACTORS } = require('../src/pipeline');
  assert.deepStrictEqual(EXTERNAL_ACTORS.slice().sort(), ['claude-code', 'codex']);
  const certified = Object.entries(TARGETS).filter(([, t]) => t.actor).map(([n]) => n);
  assert.deepStrictEqual(certified.sort(), ['claude', 'codex'], 'no other target carries an actor id');
  for (const [name, t] of Object.entries(TARGETS)) {
    if (!certified.includes(name)) assert.strictEqual(t.actor, undefined, `${name} must stay legacy-only`);
  }
  // The contract must name the non-certified targets as excluded — an explicit
  // "not certified" line is what prevents an orchestrator from falling back to them.
  const wf = read(path.join(__dirname, '..', 'skills', 'WORKFLOW.md'));
  const section = wf.slice(wf.indexOf('## External phase execution'));
  const body = section.slice(0, section.indexOf('\n## ', 3));
  assert.match(body, /not.{0,20}certified/i, 'states that other targets are not certified');
  assert.match(body, /Gemini CLI, Cursor, Antigravity, Copilot, Windsurf, Cline, Roo/,
    'names every non-certified target so none is silently eligible');
});

test('a normal install keeps the Claude per-stage model defaults', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  for (const s of ['spec', 'plan', 'review', 'debug']) {
    assert.match(read(path.join(d, `.claude/skills/${s}/SKILL.md`)), /^model: opus$/m, `${s} → opus`);
  }
  assert.match(read(path.join(d, '.claude/skills/coding/SKILL.md')), /^model: sonnet$/m, 'coding → sonnet');
  assert.ok(!fs.existsSync(path.join(d, '.specship/install.json')), 'no profile file for a normal install');
});

test('an orchestrated Claude install defers the model to the caller', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  for (const s of ['spec', 'plan', 'coding', 'review', 'debug']) {
    const skill = read(path.join(d, `.claude/skills/${s}/SKILL.md`));
    assert.match(skill, /^model: inherit$/m, `${s} → inherit (the CLI-selected model wins)`);
    assert.doesNotMatch(skill, /^model: (opus|sonnet)$/m, `${s} must not pin a model`);
  }
  // Only the model line changes — the skill body is otherwise byte-identical.
  const canonical = read(path.join(__dirname, '..', 'skills', 'coding', 'SKILL.md'));
  const installed = read(path.join(d, '.claude/skills/coding/SKILL.md'));
  assert.strictEqual(installed.replace(/^model: inherit$/m, 'model: sonnet'), canonical, 'body must be untouched');
  // Non-stage skills carry no model line in either profile.
  for (const s of ['ship', 'explore-source', 'research', 'pause-task', 'resume-task', 'archive-task']) {
    assert.doesNotMatch(read(path.join(d, `.claude/skills/${s}/SKILL.md`)), /^model:/m, `${s} still inherits`);
  }
});

test('the orchestrated profile never mutates the canonical package skills', () => {
  const canonical = path.join(__dirname, '..', 'skills', 'coding', 'SKILL.md');
  const before = read(canonical);
  const d = tmp();
  af(['init', '--claude', '--codex', '--profile', 'orchestrated'], d);
  assert.strictEqual(read(canonical), before, 'package sources must stay put');
  assert.match(before, /^model: sonnet$/m, 'canonical coding keeps its default');
});

test('orchestrated Codex output is byte-identical to a normal install', () => {
  const plain = tmp();
  af(['init', '--codex'], plain);
  const orch = tmp();
  af(['init', '--codex', '--profile', 'orchestrated'], orch);
  for (const rel of ['.codex/skills/coding/SKILL.md', '.codex/skills/WORKFLOW.md', '.codex/skills/spec/agents/openai.yaml']) {
    assert.strictEqual(read(path.join(orch, rel)), read(path.join(plain, rel)), `${rel} unchanged by the profile`);
  }
});

test('the install profile is persisted, and update/doctor honour it', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  const manifest = JSON.parse(read(path.join(d, '.specship/install.json')));
  assert.strictEqual(manifest.profile, 'orchestrated');
  assert.strictEqual(manifest.version, VERSION);

  // update must not silently drop back to the interactive model mapping.
  af(['update'], d);
  assert.match(read(path.join(d, '.claude/skills/coding/SKILL.md')), /^model: inherit$/m, 'update keeps the profile');
  assert.strictEqual(JSON.parse(read(path.join(d, '.specship/install.json'))).profile, 'orchestrated');
  assert.match(af(['doctor'], d), /✓ Claude Code/, 'doctor is clean against the profile');
  assert.match(af(['doctor'], d), /orchestrated/, 'doctor reports which profile is installed');

  // doctor must flag drift against the *profile's* expected content, not the default.
  fs.writeFileSync(path.join(d, '.claude/skills/coding/SKILL.md'), 'DRIFTED');
  assert.strictEqual(afFail(['doctor'], d).status, 1);
  af(['update'], d);
  assert.match(af(['doctor'], d), /✓ Claude Code/, 'update heals drift under the profile');
});

test('adding another agent later does not silently reset the profile', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  // A plain init for a second agent must inherit the project's profile, not
  // reset it — the profile is a project setting, not a per-command one.
  af(['init', '--windsurf'], d);
  assert.strictEqual(JSON.parse(read(path.join(d, '.specship/install.json'))).profile, 'orchestrated', 'profile survives');
  assert.match(read(path.join(d, '.claude/skills/coding/SKILL.md')), /^model: inherit$/m, 'claude stays orchestrated');
  // An uncertified target is unaffected by the profile rather than rejected by it:
  // it reads no model frontmatter, so its output is the same either way.
  const plain = tmp();
  af(['init', '--windsurf'], plain);
  assert.strictEqual(read(path.join(d, '.specship/skills/coding/SKILL.md')),
    read(path.join(plain, '.specship/skills/coding/SKILL.md')), 'windsurf output identical');
  af(['update'], d);
  assert.match(read(path.join(d, '.claude/skills/coding/SKILL.md')), /^model: inherit$/m, 'update still honours it');
});

test('--profile interactive explicitly switches an orchestrated install back', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  af(['init', '--claude', '--profile', 'interactive', '--force'], d);
  assert.match(read(path.join(d, '.claude/skills/coding/SKILL.md')), /^model: sonnet$/m, 'defaults restored');
  assert.ok(!fs.existsSync(path.join(d, '.specship/install.json')), 'default profile keeps no manifest');
});

test('the orchestrated profile is refused for non-certified targets', () => {
  const d = tmp();
  const r = afFail(['init', '--gemini', '--profile', 'orchestrated'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /orchestrated profile.*Codex.*Claude Code|not certified/i);
  assert.ok(!fs.existsSync(path.join(d, '.gemini')), 'nothing installed on refusal');
  assert.strictEqual(afFail(['init', '--claude', '--profile', 'bogus'], d).status, 1, 'unknown profile');
});

test('uninstall removes the profile manifest with the last target', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  af(['uninstall', '--claude'], d);
  assert.ok(!fs.existsSync(path.join(d, '.specship/install.json')), 'manifest removed with the last install');
  assert.ok(!fs.existsSync(path.join(d, '.specship')), 'no empty .specship/ left behind');

  // But a shared-skills adapter still living in .specship/ must keep its tree.
  const shared = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], shared);
  af(['init', '--windsurf'], shared);
  af(['uninstall', '--claude'], shared);
  assert.ok(fs.existsSync(path.join(shared, '.specship/skills/WORKFLOW.md')), 'windsurf keeps its skills');
});

test('global human-readable check still works alongside the phase check', () => {
  const d = tmp();
  v2Task(d, {
    files: {
      'spec.md': '---\ntask: TASK-001\nstatus: confirmed\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700\n---\n\n- R1: do the thing\n\n- [ ] AC1 (covers R1): works\n',
      'plan.md': '---\ntask: TASK-001\nstatus: approved\ncreated: 2026-07-07 10:30 +0700\nupdated: 2026-07-07 10:30 +0700\n---\n\n- [ ] S1 — build it (covers: R1, AC1) → verify: npm test\n',
    },
  });
  const out = af(['check'], d);
  assert.match(out, /OK - tasks\/ conforms/);
  assert.throws(() => JSON.parse(out), 'global check stays human-readable, not JSON');
});

test('a fresh Codex/Claude install resolves the external contract end-to-end', () => {
  const d = tmp();
  af(['init', '--codex', '--claude', '--profile', 'orchestrated'], d);
  for (const [root, actor] of [['.codex/skills', 'codex'], ['.claude/skills', 'claude-code']]) {
    // Every stage skill points at a WORKFLOW.md that actually exists next to it,
    // and that file carries the contract the skill promises.
    for (const s of ['spec', 'plan', 'coding', 'review', 'debug']) {
      const skill = read(path.join(d, root, s, 'SKILL.md'));
      assert.match(skill, /\.\.\/WORKFLOW\.md/, `${root}/${s} references the contract`);
      assert.match(skill, new RegExp(`--phase ${s} `), `${root}/${s} names its own phase`);
      const resolved = path.join(d, root, s, '..', 'WORKFLOW.md');
      assert.ok(fs.existsSync(resolved), `${root}/${s}: ../WORKFLOW.md resolves`);
      assert.match(read(resolved), /## External phase execution/);
    }
    assert.match(read(path.join(d, root, 'WORKFLOW.md')), new RegExp(`\`${actor}\``), `${root} names ${actor}`);
  }
  // The gate command the skills tell agents to run must actually work here.
  writeTask(d, 'TASK-001',
    'task: TASK-001\ntitle: real\nschema: 2\nrevision: 1\nstage: plan\nstatus: active\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700\n' +
    'artifacts:\n  spec: confirmed\n  plan: missing\n  coding: missing\n  review: missing\n  debug: missing',
    filesFor({ spec: 'confirmed', plan: 'missing', coding: 'missing', review: 'missing', debug: 'missing' }));
  const r = JSON.parse(af(['check', 'TASK-001', '--phase', 'plan', '--actor', 'codex', '--expect-revision', '1', '--json'], d));
  assert.strictEqual(r.ok, true, 'the documented command exits 0 on a real install');
});

test('generated skills mirror the canonical package sources byte-for-byte', () => {
  const d = tmp();
  af(['init', '--all'], d);
  const srcRoot = path.join(__dirname, '..', 'skills');
  // Mirrors the installer's own exclusions: per-vendor manifests and OS cruft.
  const IGNORE = new Set(['agents', '.DS_Store', '__pycache__']);
  const walk = (dir, rel = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    IGNORE.has(e.name) ? []
      : e.isDirectory() ? walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name)
        : [rel ? `${rel}/${e.name}` : e.name]);
  const files = walk(srcRoot);
  assert.ok(files.length >= 12, `expected the full skill tree, saw ${files.length}`);
  // Under the interactive profile every target is a pure mirror — no generated
  // content exists that isn't in the package.
  for (const t of ['.claude/skills', '.codex/skills', '.gemini/skills', '.specship/skills']) {
    for (const rel of files) {
      assert.strictEqual(read(path.join(d, t, rel)), read(path.join(srcRoot, rel)), `${t}/${rel} must mirror the source`);
    }
  }
});

test('legacy targets and v1 tasks keep working unchanged', () => {
  const d = tmp();
  // Every non-certified target still installs the full interactive workflow.
  af(['init', '--gemini', '--cursor', '--antigravity', '--copilot', '--roo'], d);
  for (const root of ['.gemini/skills', '.cursor/skills', '.agent/skills', '.specship/skills']) {
    assert.ok(fs.existsSync(path.join(d, root, 'ship/SKILL.md')), `${root} keeps ship`);
    assert.ok(fs.existsSync(path.join(d, root, 'WORKFLOW.md')), `${root} keeps the contract`);
  }
  assert.match(af(['doctor'], d), /interactive/, 'legacy install reports the default profile');
  assert.doesNotMatch(af(['doctor'], d), /✗/, 'and is healthy');

  // A v1 task (no schema/revision/artifacts) still reads, and is not rewritten.
  writeTask(d, 'TASK-001', 'task: TASK-001\ntitle: legacy\nstage: coding\nstatus: active\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 10:00 +0700');
  const before = read(path.join(d, 'tasks/TASK-001/task.md'));
  const s = JSON.parse(af(['inspect', 'TASK-001', '--json'], d));
  assert.strictEqual(s.schema, 1);
  assert.strictEqual(read(path.join(d, 'tasks/TASK-001/task.md')), before, 'v1 task untouched by inspect');
});

test('ship stays the interactive autopilot and is not an external phase', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  const ship = read(path.join(d, '.claude/skills/ship/SKILL.md'));
  assert.match(ship, /## Not an external phase/, 'ship opts out explicitly');
  assert.match(ship, /spec → plan → coding → review|runs `spec`|whole pipeline/i, 'ship still describes autopilot');
  assert.doesNotMatch(ship, /^model:/m, 'ship inherits the model in every profile');
  // `ship` and `resume-task` are not launchable phases.
  for (const bad of ['ship', 'resume-task', 'explore-source', 'research']) {
    assert.strictEqual(afFail(['check', 'TASK-001', '--phase', bad, '--json'], d).status, 2, `--phase ${bad} rejected`);
  }
});

test('an option missing its value is reported as such, not silently ignored', () => {
  const d = tmp();
  v2Task(d);
  // A value-taking flag must never swallow the next flag or fall off the end:
  // both are user typos, and both have to say so rather than guess.
  for (const args of [
    ['check', 'TASK-001', '--phase', 'coding', '--actor', '--json'],
    ['check', 'TASK-001', '--phase', 'coding', '--actor'],
    ['check', 'TASK-001', '--phase'],
    ['check', 'TASK-001', '--phase', 'coding', '--expect-revision'],
  ]) {
    const r = afFail(args, d);
    assert.strictEqual(r.status, 2, `${args.join(' ')} → exit 2`);
    assert.match(r.out, /needs a value/, `${args.join(' ')} says what is missing`);
  }
  const r = afFail(['init', '--claude', '--profile'], d);
  assert.strictEqual(r.status, 1, 'init --profile with no value fails');
  assert.match(r.out, /needs a value/);
  assert.ok(!fs.existsSync(path.join(d, '.claude')), 'and installs nothing');
});

test('bare init without a TTY still fails with the agent list', () => {
  const d = tmp();
  const r = afFail(['init'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /Pick at least one agent/);
});

// BUG7 - an agent that dies between opening the fence and closing it leaves this
// on disk, and the contract calls that state "safe to retry". It must be *read*
// safely too: a hang is worse than the malformed input it chokes on, because it
// takes CI and every orchestrator polling the gate down with it. Run in a child
// with a timeout so a reintroduced loop fails the test instead of wedging it.
test('an unterminated frontmatter fence is reported, not hung on', () => {
  const d = tmp();
  writeTask(d, 'TASK-001', 'task: TASK-001\nstage: spec');
  fs.writeFileSync(path.join(d, 'tasks/TASK-001/task.md'), '---\ntask: TASK-001\nstage: spec\n');
  for (const args of [['check'], ['inspect', 'TASK-001'], ['tasks'], ['check', 'TASK-001', '--phase', 'spec', '--json']]) {
    let out, status = 0;
    try {
      out = execFileSync('node', [CLI, ...args, '--dir', d], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
    } catch (e) {
      assert.notStrictEqual(e.signal, 'SIGTERM', `\`${args[0]}\` hung on an unterminated fence`);
      out = (e.stdout || '') + (e.stderr || '');
      status = e.status;
    }
    assert.ok(status === 0 || status === 1 || status === 2, `${args[0]} → ${status}`);
    assert.ok(typeof out === 'string');
  }
  // ...and the malformed task is actually reported, not silently accepted.
  const r = afFail(['check'], d);
  assert.strictEqual(r.status, 1);
  assert.match(r.out, /frontmatter missing or unterminated/);
});

// BUG8 - the map must be backed by a file that *declares* the status claimed;
// a file that declares nothing is the likeliest malformed case, not a pass.
test('an artifact file that declares no status does not satisfy the map', () => {
  const d = tmp();
  const fm = 'task: TASK-001\ntitle: t\nschema: 2\nrevision: 1\nstage: spec\nstatus: active\n'
    + 'created: 2026-07-07 10:00 +07\nupdated: 2026-07-07 10:00 +07\n'
    + 'artifacts:\n  spec: confirmed\n  plan: missing\n  coding: missing\n  review: missing\n  debug: missing';

  writeTask(d, 'TASK-001', fm, { 'spec.md': 'just some prose, no frontmatter at all\n' });
  assert.strictEqual(afFail(['check', 'TASK-001', '--phase', 'plan', '--json'], d).status, 1,
    'a spec.md with no frontmatter cannot make the map `confirmed`');

  writeTask(d, 'TASK-001', fm, { 'spec.md': '---\ntask: TASK-001\ntype: spec\n---\n' });
  const r = afFail(['check', 'TASK-001', '--phase', 'plan', '--json'], d);
  assert.strictEqual(r.status, 1, 'nor does frontmatter that omits `status:`');
  assert.match(r.out, /declares no status/);
});

// BUG3 - exit 0 is the documented "gate is valid, run the phase" signal, so it
// must never be reachable by a phase check that never ran.
test('a phase check without a task id refuses instead of falling through to the CI gate', () => {
  const d = tmp();
  writeTask(d, 'TASK-001',
    'task: TASK-001\ntitle: t\nschema: 2\nrevision: 1\nstage: spec\nstatus: active\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700');
  // The project is contract-clean, so the repo-wide check would exit 0 here.
  af(['check'], d);

  const r = afFail(['check', '--phase', 'review', '--actor', 'codex', '--expect-revision', '99', '--json'], d);
  assert.strictEqual(r.status, 2, 'no task id → bad input, not a green gate');
  assert.match(r.out, /name a task/);
  assert.doesNotMatch(r.out, /conforms to the workflow contract/, 'must not run the repo-wide check instead');

  // WORKFLOW.md promises this exact invocation exits 2 for an uncertified actor.
  assert.strictEqual(afFail(['check', '--actor', 'gemini'], d).status, 2);
});

// BUG6 - the profile exists so an explicit launcher model wins; degrading to the
// default silently re-pins the model and deletes the record that it was ever set.
test('an unreadable install profile refuses rather than silently resetting to interactive', () => {
  const d = tmp();
  af(['init', '--claude', '--profile', 'orchestrated'], d);
  const skill = path.join(d, '.claude/skills/coding/SKILL.md');
  const manifest = path.join(d, '.specship/install.json');
  assert.match(read(skill), /^model: inherit$/m);

  fs.writeFileSync(manifest, '{ this is not json');
  const upd = afFail(['update'], d);
  assert.strictEqual(upd.status, 1, 'a corrupt manifest must stop the run');
  assert.match(upd.out, /install\.json/);
  assert.ok(fs.existsSync(manifest), 'the evidence must survive the refusal');
  assert.match(read(skill), /^model: inherit$/m, 'the orchestrated skills must not be re-pinned');

  // An unknown profile (e.g. written by a newer specship) is refused, not guessed.
  fs.writeFileSync(manifest, JSON.stringify({ profile: 'headless', version: '9.9.9' }));
  assert.strictEqual(afFail(['doctor'], d).status, 1);
  assert.strictEqual(afFail(['update'], d).status, 1);
  assert.ok(fs.existsSync(manifest), 'still there');

  // Repairing the manifest restores normal operation.
  fs.writeFileSync(manifest, JSON.stringify({ profile: 'orchestrated', version: VERSION }));
  assert.match(af(['doctor'], d), /healthy/);
});

console.log(`\n${passed} passed`);
