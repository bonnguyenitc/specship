// Where each agent's files must land in the consumer project.
// `skillsDest`: the skills tree is copied here (the agent's native skills location).
// `doc.src`: the pointer template inside this package.
// `doc.dest`: where it lands in the consumer project.
// `doc.merge`: true → merge into an existing file inside a marker block (idempotent);
//              false → write the file as-is (standalone config, e.g. a Cursor rule).
// `manifest`: optional per-skill vendor file in `skills/<skill>/agents/` to install
//             for this target only (others skip the whole `agents/` dir).
module.exports = {
  claude: {
    label: 'Claude Code',
    skillsDest: '.claude/skills',
    doc: { src: '.claude/CLAUDE.md', dest: 'CLAUDE.md', merge: true },
  },
  codex: {
    label: 'Codex',
    skillsDest: '.codex/skills',
    doc: { src: '.codex/AGENTS.md', dest: 'AGENTS.md', merge: true },
    // Per-skill vendor manifest copied from `skills/<skill>/agents/openai.yaml`.
    manifest: 'openai.yaml',
  },
  cursor: {
    label: 'Cursor',
    skillsDest: '.cursor/skills',
    doc: { src: '.cursor/WORKFLOW.mdc', dest: '.cursor/rules/specship.mdc', merge: false },
  },
  antigravity: {
    label: 'Antigravity (Gemini)',
    skillsDest: '.agent/skills',
    doc: { src: '.antigravity/rules.md', dest: '.agent/rules/specship.md', merge: false },
  },
};
