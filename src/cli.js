'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { initTarget, uninstallTarget, doctorTarget, detectInstalled, TARGETS, VERSION } = require('./init');
const { check, taskRows } = require('./pipeline');

const NAMES = Object.keys(TARGETS);

function help() {
  const flags = NAMES.map((n) => `--${n}`).join(' ');
  console.log(`specship v${VERSION} - install a staged agent workflow into a project

Usage:
  npx specship <command> [agents] [options]

Commands:
  init       Install the workflow for the given agents (no agents: pick interactively)
  update     Refresh the workflow for agents already present in the project
  uninstall  Remove the workflow for the given agents (shared files are kept while in use)
  list       Show which agents are installed in the project
  doctor     Audit installed agents: skill drift, config integrity, stale versions
  check      Validate tasks/ pipeline artifacts against the workflow contract (CI gate)
  tasks      Show the active tasks and where each one stands
  help       Show this help

Agents:
  ${flags}  --all
${NAMES.map((n) => `  --${n.padEnd(12)} ${TARGETS[n].label}: skills → ${TARGETS[n].skillsDest}/, config → ${TARGETS[n].doc.dest}`).join('\n')}

Options:
  --dir <path>   Target project directory (default: current directory)
  --force        Overwrite skill files the user has modified
  --dry-run      Print what init/update/uninstall would change without writing
  -v, --version  Print version
  -h, --help     Show this help

Examples:
  npx specship init --claude
  npx specship init --codex --gemini --cursor
  npx specship init --all --dir ./my-app
  npx specship update          # refresh whatever is already installed
  npx specship uninstall --cursor
  npx specship check           # exit 1 on contract violations - use in CI
  npx specship tasks`);
}

function parse(args) {
  const selected = new Set();
  const opts = { dir: process.cwd(), force: false, dry: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--all') NAMES.forEach((n) => selected.add(n));
    else if (a === '--dir') opts.dir = path.resolve(args[++i] || '.');
    else if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dry = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--') && TARGETS[a.slice(2)]) selected.add(a.slice(2));
    else { opts.error = `Unknown option: ${a}`; }
  }
  return { selected, opts };
}

function fail(msg) {
  console.error(msg + '\n');
  help();
  process.exitCode = 1;
}

function install(names, opts, verb) {
  console.log(`specship: ${verb} in ${opts.dir}${opts.dry ? ' (dry-run)' : ''}\n`);
  for (const name of names) {
    console.log(`▸ ${TARGETS[name].label}`);
    for (const line of initTarget(name, opts.dir, opts)) console.log(`    ${line}`);
  }
  console.log(opts.dry
    ? `\nDry run - nothing was written.`
    : `\nDone. Commit the generated files so your team and agents share the same workflow.`);
}

// Bare `specship init` on a TTY: pick agents interactively instead of failing.
function promptAgents(opts) {
  console.log('Which agents should specship set up?\n');
  NAMES.forEach((n, i) => console.log(`  ${String(i + 1).padStart(2)}. ${TARGETS[n].label.padEnd(28)} (--${n})`));
  console.log('   a. all of the above');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('\nSelect (numbers, comma-separated, or "a"): ', (answer) => {
    rl.close();
    const picks = new Set();
    const t = answer.trim().toLowerCase();
    if (t === 'a' || t === 'all') NAMES.forEach((n) => picks.add(n));
    else for (const part of t.split(/[,\s]+/).filter(Boolean)) {
      const n = NAMES[Number(part) - 1];
      if (n) picks.add(n);
      else return fail(`Not a listed number: ${part}`);
    }
    if (picks.size === 0) return fail('Nothing selected.');
    install([...picks], opts, 'installing');
  });
}

function cmdInit({ selected, opts }) {
  if (opts.error) return fail(opts.error);
  if (selected.size === 0) {
    if (process.stdin.isTTY && process.stdout.isTTY) return promptAgents(opts);
    return fail('Pick at least one agent: ' + NAMES.map((n) => `--${n}`).join(' ') + ' (or --all)');
  }
  install([...selected], opts, 'installing');
}

function cmdUpdate({ opts }) {
  if (opts.error) return fail(opts.error);
  const installed = detectInstalled(opts.dir);
  if (installed.length === 0) return fail('Nothing to update - no specship install found here. Run `init` first.');
  install(installed, { ...opts, force: true }, 'updating');
}

function cmdUninstall({ selected, opts }) {
  if (opts.error) return fail(opts.error);
  if (selected.size === 0) return fail('Pick agents to uninstall: ' + NAMES.map((n) => `--${n}`).join(' ') + ' (or --all)');
  const remaining = new Set(detectInstalled(opts.dir));
  console.log(`specship: uninstalling in ${opts.dir}${opts.dry ? ' (dry-run)' : ''}\n`);
  for (const name of selected) {
    console.log(`▸ ${TARGETS[name].label}`);
    if (!remaining.has(name)) { console.log('    not installed - nothing to do'); continue; }
    remaining.delete(name);
    for (const line of uninstallTarget(name, opts.dir, [...remaining], opts)) console.log(`    ${line}`);
  }
  if (opts.dry) console.log('\nDry run - nothing was removed.');
}

function cmdList({ opts }) {
  const installed = new Set(detectInstalled(opts.dir));
  console.log(`specship: agents in ${opts.dir}\n`);
  for (const n of NAMES) {
    const t = TARGETS[n];
    const here = installed.has(n);
    const cfg = fs.existsSync(path.join(opts.dir, t.doc.dest));
    const mark = here ? '✓' : '·';
    console.log(`  ${mark} ${t.label.padEnd(20)} skills:${here ? t.skillsDest : '-'}  config:${cfg ? t.doc.dest : '-'}`);
  }
  console.log(`\n✓ installed   · not installed`);
}

function cmdDoctor({ opts }) {
  const installed = detectInstalled(opts.dir);
  if (installed.length === 0) return console.log(`specship doctor: no specship install found in ${opts.dir}.`);
  console.log(`specship doctor: auditing ${opts.dir} against v${VERSION}\n`);
  let problems = 0;
  for (const name of installed) {
    const found = doctorTarget(name, opts.dir);
    console.log(`  ${found.length ? '✗' : '✓'} ${TARGETS[name].label}`);
    for (const p of found) console.log(`      - ${p}`);
    problems += found.length;
  }
  if (problems) {
    console.log(`\n${problems} problem(s) found.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll installed agents are healthy.');
  }
}

function cmdCheck({ opts }) {
  const violations = check(opts.dir);
  if (violations.length === 0) {
    return console.log(`specship check: OK - tasks/ conforms to the workflow contract.`);
  }
  console.error(`specship check: ${violations.length} violation(s) in ${opts.dir}\n`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  console.error('\nSee skills/WORKFLOW.md (installed with specship) for the contract.');
  process.exitCode = 1;
}

function cmdTasks({ opts }) {
  const rows = taskRows(opts.dir);
  if (rows.length === 0) return console.log(`specship tasks: no active tasks in ${opts.dir} (tasks/archive/ is not shown).`);
  console.log(`specship: active tasks in ${opts.dir}\n`);
  const idW = Math.max(...rows.map((r) => r.id.length), 4);
  for (const r of rows) {
    const flag = r.status === 'paused' ? '⏸' : r.status === 'blocked' ? '✋' : r.stage === 'done' ? '✓' : '•';
    console.log(`  ${flag} ${r.id.padEnd(idW)}  ${r.stage.padEnd(6)}  ${r.status.padEnd(7)}  ${r.updated}  ${r.title}`);
  }
  console.log('\n• active   ✋ blocked   ⏸ paused   ✓ done   (archive/ hidden)');
}

function run(argv) {
  const args = argv.slice();
  const cmd = args.shift();

  if (cmd === '-v' || cmd === '--version') return console.log(VERSION);
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') return help();

  const parsed = parse(args);
  if (parsed.opts.help) return help();

  if (cmd === 'init') return cmdInit(parsed);
  if (cmd === 'update') return cmdUpdate(parsed);
  if (cmd === 'uninstall') return cmdUninstall(parsed);
  if (cmd === 'list') return cmdList(parsed);
  if (cmd === 'doctor') return cmdDoctor(parsed);
  if (cmd === 'check') return cmdCheck(parsed);
  if (cmd === 'tasks') return cmdTasks(parsed);
  return fail(`Unknown command: ${cmd}`);
}

module.exports = { run };
