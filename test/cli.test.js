'use strict';
// Zero-dep test runner for the specship CLI. Run: npm test
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'bin', 'cli.js');
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
  assert.ok(fs.existsSync(path.join(d, '.cursor/skills/WORKFLOW.md')));
  assert.ok(fs.existsSync(path.join(d, '.agent/skills/WORKFLOW.md')), 'antigravity → .agent/skills');
  assert.ok(fs.existsSync(path.join(d, '.cursor/rules/specship.mdc')));
  assert.ok(fs.existsSync(path.join(d, '.agent/rules/specship.md')));
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
  af(['init', '--cursor'], d);
  const out = af(['list'], d);
  assert.match(out, /✓ Cursor/);
  assert.match(out, /· Claude Code/);
});

test('update refreshes only installed agents', () => {
  const d = tmp();
  af(['init', '--claude'], d);
  const skill = path.join(d, '.claude/skills/spec/SKILL.md');
  fs.writeFileSync(skill, 'STALE');
  af(['update'], d); // implies --force on installed targets
  assert.notStrictEqual(read(skill), 'STALE', 'update should refresh skills');
});

console.log(`\n${passed} passed`);
