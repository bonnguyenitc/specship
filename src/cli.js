'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { initTarget, uninstallTarget, doctorTarget, detectInstalled, TARGETS, VERSION } = require('./init');
const { check, taskRows, loadTask, checkPhase, PHASES, EXTERNAL_ACTORS } = require('./pipeline');
const { DEFAULT_PROFILE, PROFILES, MANIFEST_REL, readProfile, writeProfile, removeProfile, validateProfile } = require('./install-profile');

const NAMES = Object.keys(TARGETS);
// Commands that accept a bare `TASK-<ID>` argument.
const TASK_SCOPED = new Set(['inspect', 'check']);
const CERTIFIED_LABELS = NAMES.filter((n) => TARGETS[n].actor).map((n) => TARGETS[n].label).join(' and ');

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
             With a TASK-<ID> + --phase: validate one phase gate (JSON, for orchestrators)
  inspect    Print one task's normalized state as JSON (read-only)
  tasks      Show the active tasks and where each one stands
  help       Show this help

Agents:
  ${flags}  --all
${NAMES.map((n) => `  --${n.padEnd(12)} ${TARGETS[n].label}: skills → ${TARGETS[n].skillsDest}/, config → ${TARGETS[n].doc.dest}`).join('\n')}

Options:
  --dir <path>       Target project directory (default: current directory)
  --force            Overwrite skill files the user has modified
  --dry-run          Print what init/update/uninstall would change without writing
  --profile <name>   ${PROFILES.join(' | ')} (default: ${DEFAULT_PROFILE})
                     orchestrated: an external tool runs one phase at a time and picks
                     the model itself - Claude stage skills install with \`model: inherit\`.
                     Certified for ${CERTIFIED_LABELS} only. Persisted in ${MANIFEST_REL};
                     update/doctor keep using it. Omit to keep the project's profile.
  -v, --version      Print version
  -h, --help         Show this help

Task-scoped options (check/inspect):
  --phase <name>         ${PHASES.join(' | ')}
  --actor <id>           ${EXTERNAL_ACTORS.join(' | ')} - the agent running the phase
  --expect-revision <n>  Fail if the task has moved past revision <n>
  --json                 Accepted for explicitness - both commands always emit JSON

Examples:
  npx specship init --claude
  npx specship init --codex --gemini --cursor
  npx specship init --all --dir ./my-app
  npx specship update          # refresh whatever is already installed
  npx specship uninstall --cursor
  npx specship check           # exit 1 on contract violations - use in CI
  npx specship tasks

  # External orchestration (see skills/WORKFLOW.md → External phase execution):
  npx specship init --codex --claude --profile orchestrated
  npx specship inspect TASK-001 --json                  # what should run next?
  npx specship check TASK-001 --phase coding --actor codex --expect-revision 7 --json
  #   exit 0 = gate valid, 1 = state/gate invalid, 2 = bad input or no such task`);
}

function parse(args) {
  const selected = new Set();
  const opts = { dir: process.cwd(), force: false, dry: false, positional: [] };
  // A value-taking flag must be followed by an actual value: silently eating the
  // next flag (`--actor --json`) turns a typo into a confusing downstream error.
  const value = (i, flag) => {
    const v = args[i + 1];
    if (v === undefined || v.startsWith('-')) {
      opts.error = `${flag} needs a value`;
      return undefined;
    }
    return v;
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--all') NAMES.forEach((n) => selected.add(n));
    else if (a === '--dir') opts.dir = path.resolve(value(i++, '--dir') || '.');
    else if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dry = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--profile') opts.profile = value(i++, '--profile');
    else if (a === '--phase') opts.phase = value(i++, '--phase');
    else if (a === '--actor') opts.actor = value(i++, '--actor');
    else if (a === '--expect-revision') opts.expectRevision = value(i++, '--expect-revision');
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--') && TARGETS[a.slice(2)]) selected.add(a.slice(2));
    else if (a.startsWith('-')) opts.error = `Unknown option: ${a}`;
    // Bare words are task ids (`inspect TASK-001`); commands that take none
    // still reject them, so no existing invocation changes meaning.
    else opts.positional.push(a);
  }
  return { selected, opts };
}

// Commands that take no positional argument keep rejecting stray words.
function strayArg(opts) {
  return opts.positional.length ? `Unknown option: ${opts.positional[0]}` : null;
}

function fail(msg) {
  console.error(msg + '\n');
  help();
  process.exitCode = 1;
}

function install(names, opts, verb) {
  // The profile is a *project* setting: naming it switches the project, omitting
  // it inherits whatever is persisted. Only an explicit request is validated
  // against the named targets - an inherited profile is simply a no-op for a
  // target that isn't certified (it reads no model frontmatter either way), so
  // `init --windsurf` in an orchestrated project must not reset or reject it.
  const explicit = opts.profile !== undefined;
  if (explicit) {
    const bad = validateProfile(opts.profile, names);
    if (bad) return fail(bad);
  }
  let profile = opts.profile;
  if (!explicit) {
    const r = readProfile(opts.dir);
    if (r.error) return fail(`specship: ${r.error}`);
    profile = r.profile;
  }
  console.log(`specship: ${verb} in ${opts.dir}${opts.dry ? ' (dry-run)' : ''}`
    + (profile === DEFAULT_PROFILE ? '\n' : `  [profile: ${profile}]\n`));
  for (const name of names) {
    console.log(`▸ ${TARGETS[name].label}`);
    for (const line of initTarget(name, opts.dir, { ...opts, profile })) console.log(`    ${line}`);
  }
  // Persisted last: only record a profile once its install actually succeeded.
  const rec = writeProfile(opts.dir, profile, { dry: opts.dry });
  if (rec) console.log(`\n▸ profile → ${rec} (${profile})`);
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
  install(installed, { ...opts, force: true }, 'updating'); // install() inherits the persisted profile
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
  // The profile describes how the install was generated - it outlives nothing.
  if (remaining.size === 0) removeProfile(opts.dir, { dry: opts.dry });
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
  // An unreadable profile is itself the problem to report - auditing against a
  // guessed one would flag every correctly-generated skill as drift.
  const r = readProfile(opts.dir);
  if (r.error) return fail(`specship doctor: ${r.error}`);
  const profile = r.profile;
  console.log(`specship doctor: auditing ${opts.dir} against v${VERSION} [profile: ${profile}]\n`);
  let problems = 0;
  for (const name of installed) {
    const found = doctorTarget(name, opts.dir, profile);
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

// `inspect TASK-<ID> --json` - the read-only normalized state, for orchestrators.
function cmdInspect({ opts }) {
  const id = opts.positional[0];
  // inspect only ever exits 0 (reported) or 2 (cannot report) - bad input is a 2.
  if (opts.error || !id) {
    console.error(`specship inspect: ${opts.error || 'name a task, e.g. `specship inspect TASK-001 --json`'}`);
    process.exitCode = 2;
    return;
  }
  const state = loadTask(opts.dir, id);
  if (!state) {
    console.error(`specship inspect: task \`${id}\` not found under tasks/ (or not a safe TASK-<ID>)`);
    process.exitCode = 2;
    return;
  }
  console.log(JSON.stringify(state, null, 2));
}

// `check TASK-<ID> --phase <phase>` - one gate, JSON-only stdout, documented exit codes.
function cmdCheckPhase(opts) {
  const id = opts.positional[0];
  const emit = (code, body) => {
    console.log(JSON.stringify(body, null, 2));
    process.exitCode = code;
  };
  if (opts.error) {
    return emit(2, { task: id, phase: opts.phase || null, ok: false, issues: [opts.error] });
  }
  if (!id) {
    return emit(2, { task: null, phase: opts.phase || null, ok: false, issues: ['name a task, e.g. `specship check TASK-001 --phase coding --json`'] });
  }
  if (!opts.phase) {
    return emit(2, { task: id, phase: null, ok: false, issues: [`--phase <${PHASES.join('|')}> is required`] });
  }
  let expectRevision;
  if (opts.expectRevision !== undefined) {
    expectRevision = Number(opts.expectRevision);
    if (!Number.isInteger(expectRevision) || expectRevision < 0) {
      return emit(2, {
        task: id, phase: opts.phase, ok: false,
        issues: [`--expect-revision \`${opts.expectRevision}\` is not a non-negative integer`],
      });
    }
  }
  const { code, body } = checkPhase(opts.dir, id, opts.phase, { expectRevision, actor: opts.actor });
  emit(code, body);
}

// `check` is two commands: the repo-wide CI gate, and the task-scoped phase gate.
// Any task-scoped option selects the latter - routing on the task id alone let a
// phase check with a mistyped/absent id silently run the CI gate instead, whose
// exit 0 an orchestrator reads as "this phase may run" (BUG3).
function cmdCheck({ opts }) {
  const taskScoped = opts.positional.length || opts.phase !== undefined
    || opts.actor !== undefined || opts.expectRevision !== undefined;
  if (taskScoped) return cmdCheckPhase(opts);
  if (opts.error) return fail(opts.error);
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
  // Only the task-scoped commands take a bare word; elsewhere one is still a typo.
  const stray = strayArg(parsed.opts);
  if (stray && !TASK_SCOPED.has(cmd) && !parsed.opts.error) parsed.opts.error = stray;

  if (cmd === 'init') return cmdInit(parsed);
  if (cmd === 'inspect') return cmdInspect(parsed);
  if (cmd === 'update') return cmdUpdate(parsed);
  if (cmd === 'uninstall') return cmdUninstall(parsed);
  if (cmd === 'list') return cmdList(parsed);
  if (cmd === 'doctor') return cmdDoctor(parsed);
  if (cmd === 'check') return cmdCheck(parsed);
  if (cmd === 'tasks') return cmdTasks(parsed);
  return fail(`Unknown command: ${cmd}`);
}

module.exports = { run };
