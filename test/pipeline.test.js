'use strict';
// Zero-dep tests for the normalized task-state model (skills/WORKFLOW.md schema v2).
// Run: node test/pipeline.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isSafeTaskId, loadTask } = require('../src/pipeline');

let passed = 0;

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'specship-pipe-'));
}
// Write tasks/<id>/task.md (+ sibling artifacts) and return the project dir.
function writeTask(dir, id, fm, files = {}, body = '# Task\n\n## Now\n- Blocked by: none\n') {
  const td = path.join(dir, 'tasks', id);
  fs.mkdirSync(td, { recursive: true });
  fs.writeFileSync(path.join(td, 'task.md'), `---\n${fm}\n---\n\n${body}`);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(td, name), text);
  return dir;
}
function test(name, fn) {
  fn();
  console.log(`  ok  ${name}`);
  passed++;
}

test('isSafeTaskId accepts canonical ids and rejects unsafe ones', () => {
  for (const ok of ['TASK-001', 'TASK-PROJ-123', 'TASK-42',
                    'TASK-20260723-fix-login', 'TASK-20260723-fix-login-x7']) {
    assert.strictEqual(isSafeTaskId(ok), true, `${ok} should be safe`);
  }
  for (const bad of [
    'TASK-../etc', 'TASK-001/..', '../TASK-001', 'TASK-001/spec.md',
    'TASK-', 'task-001', 'TASK', 'TASK-001​', 'TASK-Ѕ01', // Cyrillic Ѕ confusable
    'TASK-001 ', '', null, undefined,
  ]) {
    assert.strictEqual(isSafeTaskId(bad), false, `${String(bad)} should be unsafe`);
  }
});

test('loadTask parses the nested artifacts map into a normalized state', () => {
  const d = writeTask(tmp(), 'TASK-001',
    'task: TASK-001\ntitle: demo\nstage: coding\nstatus: active\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700\n' +
    'artifacts:\n  spec: confirmed\n  plan: approved\n  coding: in-progress\n  review: missing\n  debug: missing',
    filesFor({ spec: 'confirmed', plan: 'approved', coding: 'in-progress', review: 'missing', debug: 'missing' }));
  const s = loadTask(d, 'TASK-001');
  assert.strictEqual(s.valid, true, `issues: ${s.issues.join('; ')}`);
  assert.strictEqual(s.task, 'TASK-001');
  assert.strictEqual(s.title, 'demo');
  assert.strictEqual(s.stage, 'coding');
  assert.deepStrictEqual(s.artifacts, {
    spec: 'confirmed', plan: 'approved', coding: 'in-progress', review: 'missing', debug: 'missing',
  });
});

// Build a schema-v2 task.md frontmatter with the given overrides.
function fmV2(over = {}) {
  const a = artifactsOf(over);
  const head = Object.assign({
    task: 'TASK-001', title: 'demo', schema: 2, revision: 3,
    stage: 'coding', status: 'active',
    created: '2026-07-07 10:00 +0700', updated: '2026-07-07 11:00 +0700',
  }, over.head || {});
  const lines = Object.entries(head).map(([k, v]) => `${k}: ${v}`);
  lines.push('artifacts:');
  for (const [k, v] of Object.entries(a)) lines.push(`  ${k}: ${v}`);
  return lines.join('\n');
}
// The artifact files a declared `artifacts:` map implies on disk. The gate reads
// the map, so a fixture that writes the map without the files it names is not a
// task any agent could ever produce - and a state model validated only against
// such fixtures is free to ignore the filesystem (BUG4).
function filesFor(artifacts) {
  const files = {};
  const head = (status) => `---\ntask: TASK-001\ntype: x\nstatus: ${status}\ncreated: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700\n---\n`;
  if (artifacts.spec !== 'missing') files['spec.md'] = head(artifacts.spec) + '\n- R1: a requirement\n- [ ] AC1 something -> verify: x\n';
  if (artifacts.plan !== 'missing') {
    // `coding: done` means every step landed, so the S# ticks must agree.
    const tick = artifacts.coding === 'done' ? 'x' : ' ';
    files['plan.md'] = head(artifacts.plan) + `\n- [${tick}] S1 - a step (covers: R1, AC1) -> verify: x\n`;
  }
  if (artifacts.review !== 'missing') files['review.md'] = head(artifacts.review) + '\n## Findings\n';
  if (artifacts.debug !== 'missing') files['debug.md'] = head('x') + '\n## BUG1 - a bug\n';
  return files;
}
function artifactsOf(over = {}) {
  return Object.assign(
    { spec: 'confirmed', plan: 'approved', coding: 'in-progress', review: 'missing', debug: 'missing' },
    over.artifacts || {});
}
function stateOf(over, body) {
  const files = Object.assign(filesFor(artifactsOf(over)), (over || {}).files || {});
  return loadTask(writeTask(tmp(), 'TASK-001', fmV2(over), files, body), 'TASK-001');
}

test('gates advance deterministically along spec → plan → coding → review → done', () => {
  // Each case names the stage the task is actually at: a fixture whose `stage`
  // contradicts its own artifacts map is not a task any stage could check point.
  const cases = [
    ['spec', { spec: 'draft', plan: 'missing', coding: 'missing' }, 'spec', 'unconfirmed spec retries spec'],
    ['spec', { spec: 'confirmed', plan: 'missing', coding: 'missing' }, 'plan', 'confirmed spec → plan'],
    ['plan', { spec: 'confirmed', plan: 'draft', coding: 'missing' }, 'plan', 'draft plan retries plan'],
    ['plan', { spec: 'confirmed', plan: 'approved', coding: 'missing' }, 'coding', 'approved plan → coding'],
    ['coding', { spec: 'confirmed', plan: 'approved', coding: 'in-progress' }, 'coding', 'unfinished coding retries coding'],
    ['coding', { spec: 'confirmed', plan: 'approved', coding: 'done' }, 'review', 'completed coding → review'],
    ['done', { spec: 'confirmed', plan: 'approved', coding: 'done', review: 'approved' }, null, 'approved review → done'],
  ];
  for (const [stage, artifacts, expected, why] of cases) {
    const s = stateOf({ artifacts, head: { stage } });
    assert.strictEqual(s.valid, true, `${why}: ${s.issues.join('; ')}`);
    assert.strictEqual(s.next_phase, expected, why);
  }
});

test('a blocker keeps the current phase as the retry target', () => {
  const s = stateOf({
    artifacts: { coding: 'in-progress' },
    head: { status: 'blocked' },
  }, '# Task\n\n## Now\n- Blocked by: payments API access\n');
  assert.strictEqual(s.valid, true, s.issues.join('; '));
  assert.strictEqual(s.next_phase, 'coding', 'blocked coding still retries coding');
  assert.strictEqual(s.blocked_reason, 'payments API access');
});

test('review changes-requested must classify coding or debug', () => {
  const toCoding = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested' },
    head: { next_phase: 'coding', stage: 'review' },
  });
  assert.strictEqual(toCoding.valid, true, toCoding.issues.join('; '));
  assert.strictEqual(toCoding.next_phase, 'coding');

  const toDebug = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested' },
    head: { next_phase: 'debug', stage: 'review' },
  });
  assert.strictEqual(toDebug.next_phase, 'debug');

  // Edge case: changes requested without classifying the loop-back target.
  const unclassified = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested' },
    head: { stage: 'review' },
  });
  assert.strictEqual(unclassified.valid, false);
  assert.strictEqual(unclassified.next_phase, null, 'fails closed rather than guessing');
  assert.match(unclassified.issues.join('; '), /does not classify/);
});

test('debug entry records a resume phase; a clear debug hands back to it', () => {
  const entered = stateOf({
    artifacts: { coding: 'in-progress', debug: 'open-bugs' },
    head: { status: 'blocked', resume_phase: 'coding', next_phase: 'debug' },
  }, '# Task\n\n## Now\n- Blocked by: BUG1\n');
  assert.strictEqual(entered.valid, true, entered.issues.join('; '));
  assert.strictEqual(entered.next_phase, 'debug', 'open bugs run debug next');
  assert.strictEqual(entered.resume_phase, 'coding');

  const resumed = stateOf({
    artifacts: { coding: 'in-progress', debug: 'clear' },
    head: { next_phase: 'coding' },
  });
  assert.strictEqual(resumed.valid, true, resumed.issues.join('; '));
  assert.strictEqual(resumed.next_phase, 'coding', 'clear debug resumes the interrupted phase');
  assert.strictEqual(resumed.resume_phase, null, 'resume_phase is cleared');

  // Edge case: debug open without a valid resume phase, and a stale resume_phase.
  assert.match(stateOf({ artifacts: { debug: 'open-bugs' }, head: { status: 'blocked' } }).issues.join('; '),
    /resume_phase does not name coding\|review/);
  assert.match(stateOf({ artifacts: { debug: 'clear' }, head: { resume_phase: 'coding' } }).issues.join('; '),
    /debug is clear but resume_phase `coding` was not cleared/);
});

// BUG1 - the loop-back has to *close*, not just open. Asserting that
// changes-requested routes to coding/debug says nothing about whether the task
// can ever get back to review, which is the only way it reaches done.
test('a review loop-back closes: the classifier also names the way back to review', () => {
  const backToReview = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested' },
    head: { next_phase: 'review', stage: 'review' },
  });
  assert.strictEqual(backToReview.valid, true, backToReview.issues.join('; '));
  assert.strictEqual(backToReview.next_phase, 'review', 'addressed findings re-review');

  // ...but only once the work that addresses the findings has actually landed.
  const premature = stateOf({
    artifacts: { coding: 'in-progress', review: 'changes-requested' },
    head: { next_phase: 'review', stage: 'review' },
  });
  assert.strictEqual(premature.valid, false);
  assert.strictEqual(premature.next_phase, null, 'unfinished loop-back work fails closed');
  assert.match(premature.issues.join('; '), /coding is not `done`/);
});

test('the full review → debug → review loop reaches done', () => {
  // review finds a defect and classifies the loop-back as debug
  const toDebug = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested' },
    head: { next_phase: 'debug', stage: 'review' },
  });
  assert.strictEqual(toDebug.next_phase, 'debug', toDebug.issues.join('; '));

  // debug opens, naming the phase it interrupted
  const debugging = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested', debug: 'open-bugs' },
    head: { status: 'blocked', resume_phase: 'review', next_phase: 'debug', stage: 'review' },
  }, '# Task\n\n## Now\n- Blocked by: BUG1\n');
  assert.strictEqual(debugging.valid, true, debugging.issues.join('; '));
  assert.strictEqual(debugging.next_phase, 'debug');
  assert.strictEqual(debugging.resume_phase, 'review');

  // debug clears and hands back to review - the case debug/SKILL.md instructs
  const resumed = stateOf({
    artifacts: { coding: 'done', review: 'changes-requested', debug: 'clear' },
    head: { next_phase: 'review', stage: 'review' },
  });
  assert.strictEqual(resumed.valid, true, resumed.issues.join('; '));
  assert.strictEqual(resumed.next_phase, 'review', 'clear debug resumes the review it interrupted');
  assert.strictEqual(resumed.resume_phase, null);

  // review approves → nothing left to run
  const done = stateOf({
    artifacts: { coding: 'done', review: 'approved', debug: 'clear' },
    head: { stage: 'done', status: 'done' },
  });
  assert.strictEqual(done.valid, true, done.issues.join('; '));
  assert.strictEqual(done.next_phase, null, 'the loop terminates');
});

// BUG2 - the parser's own docblock advertises `# comments`.
test('comments and blank lines inside a nested map do not void it', () => {
  const withNoise = loadTask(writeTask(tmp(), 'TASK-001',
    'task: TASK-001\ntitle: demo\nschema: 2\nrevision: 1\nstage: done\nstatus: done\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700\n' +
    'artifacts:\n  # current states\n\n  spec: confirmed\n  plan: approved\n\n  # the rest\n  coding: done\n  review: approved\n  debug: clear',
    filesFor({ spec: 'confirmed', plan: 'approved', coding: 'done', review: 'approved', debug: 'clear' })), 'TASK-001');
  assert.deepStrictEqual(withNoise.artifacts, {
    spec: 'confirmed', plan: 'approved', coding: 'done', review: 'approved', debug: 'clear',
  }, 'a comment must not silently rewind a finished task to spec');
  assert.strictEqual(withNoise.valid, true, withNoise.issues.join('; '));
  assert.strictEqual(withNoise.next_phase, null);
});

test('an artifacts map that is not a map fails closed', () => {
  const scalar = loadTask(writeTask(tmp(), 'TASK-001',
    'task: TASK-001\ntitle: demo\nschema: 2\nrevision: 1\nstage: coding\nstatus: active\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700\n' +
    'artifacts: confirmed'), 'TASK-001');
  assert.strictEqual(scalar.valid, false, 'a scalar artifacts: must not read as an empty map');
  assert.match(scalar.issues.join('; '), /artifacts.*not a map/);
});

// BUG4 - the map is the gate's only input, so it has to be backed by reality.
test('an artifact the map declares must exist on disk and agree with it', () => {
  const absent = loadTask(writeTask(tmp(), 'TASK-001', fmV2({
    artifacts: { spec: 'confirmed', plan: 'approved', coding: 'done', review: 'missing', debug: 'missing' },
  })), 'TASK-001');
  assert.strictEqual(absent.valid, false, 'task.md may not promise artifacts that are not there');
  assert.match(absent.issues.join('; '), /spec\.md is missing/);
  assert.match(absent.issues.join('; '), /plan\.md is missing/);

  const disagrees = stateOf({
    artifacts: { spec: 'confirmed' },
    files: { 'spec.md': '---\ntask: TASK-001\nstatus: draft\n---\n' },
  });
  assert.strictEqual(disagrees.valid, false);
  assert.match(disagrees.issues.join('; '), /artifacts\.spec `confirmed` but spec\.md status is `draft`/);

  const unticked = stateOf({
    artifacts: { coding: 'done' },
    files: { 'plan.md': '---\ntask: TASK-001\nstatus: approved\n---\n\n- [ ] S1 - a step -> verify: x\n' },
  });
  assert.strictEqual(unticked.valid, false, 'coding is not done while a step is unticked');
  assert.match(unticked.issues.join('; '), /coding is `done` but unticked in plan\.md: S1/);
});

// BUG5 - all-missing defaults are only "safe" if nothing reads them as fact.
test('a legacy v1 task that already shipped does not gate back to spec', () => {
  const shipped = loadTask(writeTask(tmp(), 'TASK-001',
    'task: TASK-001\ntitle: shipped long ago\nstage: done\nstatus: done\n' +
    'created: 2026-01-05 10:00 +0700\nupdated: 2026-01-06 11:00 +0700'), 'TASK-001');
  assert.strictEqual(shipped.schema, 1);
  assert.strictEqual(shipped.valid, false, 'a done task whose gate says `spec` is contradictory, not valid');
  assert.match(shipped.issues.join('; '), /stage `done`.*gate/);

  // ...but a v1 task still at the start is consistent, so it stays orchestrable
  // and its first checkpoint is what upgrades it to v2 (R9).
  const fresh = loadTask(writeTask(tmp(), 'TASK-001',
    'task: TASK-001\ntitle: not started\nstage: spec\nstatus: active\n' +
    'created: 2026-01-05 10:00 +0700\nupdated: 2026-01-06 11:00 +0700'), 'TASK-001');
  assert.strictEqual(fresh.schema, 1);
  assert.strictEqual(fresh.valid, true, fresh.issues.join('; '));
  assert.strictEqual(fresh.next_phase, 'spec', 'a legacy task can still be picked up at spec');
});

// resume_phase looks redundant - the gate never reads it - but the *debug agent*
// does, and in external mode it hydrates from artifacts alone. These two states
// are identical in every field the gate reads, and demand opposite hand-backs:
// only resume_phase tells them apart. Deleting the field silently breaks one.
test('resume_phase carries what artifact state cannot: which phase debug interrupted', () => {
  const common = {
    artifacts: { coding: 'done', review: 'changes-requested', debug: 'open-bugs' },
    head: { status: 'blocked', next_phase: 'debug', stage: 'review' },
  };
  const body = '# Task\n\n## Now\n- Blocked by: BUG1\n';
  // review found a defect → debug interrupted review → hand back to review
  const fromReview = stateOf({ ...common, head: { ...common.head, resume_phase: 'review' } }, body);
  // review asked for coding work, and *that* hit a defect → hand back to coding
  const fromCoding = stateOf({ ...common, head: { ...common.head, resume_phase: 'coding' } }, body);

  assert.strictEqual(fromReview.valid, true, fromReview.issues.join('; '));
  assert.strictEqual(fromCoding.valid, true, fromCoding.issues.join('; '));
  const gateVisible = (s) => JSON.stringify([s.stage, s.status, s.artifacts, s.next_phase]);
  assert.strictEqual(gateVisible(fromReview), gateVisible(fromCoding),
    'the two cases are indistinguishable from artifact state alone');
  assert.notStrictEqual(fromReview.resume_phase, fromCoding.resume_phase,
    'so resume_phase is the only thing that can carry the difference');
});

test('an explicit next_phase may not contradict the derived gate', () => {
  const s = stateOf({ artifacts: { coding: 'done' }, head: { next_phase: 'coding' } });
  assert.strictEqual(s.valid, false);
  assert.match(s.issues.join('; '), /next_phase `coding` contradicts the gate \(`review`\)/);
});

test('a legacy v1 task reads with safe defaults and is never rewritten', () => {
  const d = writeTask(tmp(), 'TASK-001',
    'task: TASK-001\ntitle: old one\nstage: plan\nstatus: active\n' +
    'created: 2026-07-07 10:00 +0700\nupdated: 2026-07-07 11:00 +0700');
  const before = fs.readFileSync(path.join(d, 'tasks/TASK-001/task.md'), 'utf8');
  const s = loadTask(d, 'TASK-001');
  assert.strictEqual(s.schema, 1, 'no schema: field → v1');
  assert.strictEqual(s.revision, 0, 'v1 defaults to revision 0');
  assert.strictEqual(s.resume_phase, null);
  assert.deepStrictEqual(s.artifacts, {
    spec: 'missing', plan: 'missing', coding: 'missing', review: 'missing', debug: 'missing',
  }, 'no artifacts map → all missing');
  assert.strictEqual(s.next_phase, 'spec', 'gates still derive from what is known');
  assert.strictEqual(fs.readFileSync(path.join(d, 'tasks/TASK-001/task.md'), 'utf8'), before, 'reading must not rewrite');
});

test('identity mismatches and bad values fail closed', () => {
  assert.strictEqual(loadTask(tmp(), 'TASK-../etc'), null, 'unsafe id → not loadable');
  assert.strictEqual(loadTask(tmp(), 'TASK-404'), null, 'missing task → null');

  const mismatch = stateOf({ head: { task: 'TASK-999' } });
  assert.strictEqual(mismatch.valid, false);
  assert.match(mismatch.issues.join('; '), /does not match folder `TASK-001`/);

  const foreign = loadTask(writeTask(tmp(), 'TASK-001', fmV2(), {
    'spec.md': '---\ntask: TASK-002\nstatus: confirmed\n---\n',
  }), 'TASK-001');
  assert.strictEqual(foreign.valid, false);
  assert.match(foreign.issues.join('; '), /spec\.md `task: TASK-002` does not match folder/);

  assert.match(stateOf({ artifacts: { spec: 'bogus' } }).issues.join('; '), /artifacts\.spec `bogus` not one of/);
  assert.match(stateOf({ head: { revision: 'x' } }).issues.join('; '), /revision `x` is not a non-negative integer/);
  assert.match(stateOf({ head: { schema: 99 } }).issues.join('; '), /schema v99 is newer than this specship understands/);
});

console.log(`\n${passed} passed`);
