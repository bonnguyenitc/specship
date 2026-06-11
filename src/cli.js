'use strict';
const fs = require('fs');
const path = require('path');
const { initTarget, detectInstalled, TARGETS } = require('./init');

const NAMES = Object.keys(TARGETS);
const VERSION = require('../package.json').version;

function help() {
  const flags = NAMES.map((n) => `--${n}`).join(' ');
  console.log(`specship v${VERSION} — install a staged agent workflow into a project

Usage:
  npx specship <command> [agents] [options]

Commands:
  init      Install the workflow for the given agents
  update    Refresh the workflow for agents already present in the project
  list      Show which agents are installed in the project
  help      Show this help

Agents:
  ${flags}  --all
${NAMES.map((n) => `  --${n.padEnd(12)} ${TARGETS[n].label}: skills → ${TARGETS[n].skillsDest}/, config → ${TARGETS[n].doc.dest}`).join('\n')}

Options:
  --dir <path>   Target project directory (default: current directory)
  --force        Overwrite skill files the user has modified
  -v, --version  Print version
  -h, --help     Show this help

Examples:
  npx specship init --claude
  npx specship init --codex --cursor
  npx specship init --all --dir ./my-app
  npx specship update          # refresh whatever is already installed
  npx specship list`);
}

function parse(args) {
  const selected = new Set();
  const opts = { dir: process.cwd(), force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--all') NAMES.forEach((n) => selected.add(n));
    else if (a === '--dir') opts.dir = path.resolve(args[++i] || '.');
    else if (a === '--force') opts.force = true;
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
  console.log(`specship: ${verb} in ${opts.dir}\n`);
  for (const name of names) {
    console.log(`▸ ${TARGETS[name].label}`);
    for (const line of initTarget(name, opts.dir, opts)) console.log(`    ${line}`);
  }
  console.log(`\nDone. Commit the generated files so your team and agents share the same workflow.`);
}

function cmdInit({ selected, opts }) {
  if (opts.error) return fail(opts.error);
  if (selected.size === 0) return fail('Pick at least one agent: ' + NAMES.map((n) => `--${n}`).join(' ') + ' (or --all)');
  install([...selected], opts, 'installing');
}

function cmdUpdate({ opts }) {
  if (opts.error) return fail(opts.error);
  const installed = detectInstalled(opts.dir);
  if (installed.length === 0) return fail('Nothing to update — no specship install found here. Run `init` first.');
  install(installed, { ...opts, force: true }, 'updating');
}

function cmdList({ opts }) {
  const installed = new Set(detectInstalled(opts.dir));
  console.log(`specship: agents in ${opts.dir}\n`);
  for (const n of NAMES) {
    const t = TARGETS[n];
    const here = installed.has(n);
    const cfg = fs.existsSync(path.join(opts.dir, t.doc.dest));
    const mark = here ? '✓' : '·';
    console.log(`  ${mark} ${t.label.padEnd(20)} skills:${here ? t.skillsDest : '—'}  config:${cfg ? t.doc.dest : '—'}`);
  }
  console.log(`\n✓ installed   · not installed`);
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
  if (cmd === 'list') return cmdList(parsed);
  return fail(`Unknown command: ${cmd}`);
}

module.exports = { run };
