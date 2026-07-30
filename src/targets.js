// Where each agent's files must land in the consumer project.
// `skillsDest`: the skills tree is copied here (the agent's native skills location).
// `doc.src`: the pointer template inside this package.
// `doc.dest`: where it lands in the consumer project.
// `doc.merge`: true → merge into an existing file inside a marker block (idempotent);
//              false → write the file as-is (standalone config, e.g. a Cursor rule).
// `manifest`: optional per-skill vendor file in `skills/<skill>/agents/` to install
//             for this target only (others skip the whole `agents/` dir).
// `actor`: this target's canonical id when an external orchestrator runs one phase
//          on it (skills/WORKFLOW.md → External phase execution). Only targets that
//          carry an `actor` are certified for orchestrated mode; the rest stay
//          legacy install targets. The id is the label written to the Pipeline Log.
// `modelFrontmatter`: this agent honours a `model:` line in a skill's frontmatter,
//                     so the orchestrated profile must neutralise it (→ `inherit`)
//                     to let the launcher's explicit model win. Agents without it
//                     ignore the line, so their output never varies by profile.
// `subagents`: dest dir for the project-level subagent definitions shipped in
//              the package-root `agents/` dir. Only targets with a native
//              subagent file format carry it (today: Claude Code); the rest
//              skip the dir entirely, so their output is unaffected.
module.exports = {
  claude: {
    label: 'Claude Code',
    skillsDest: '.claude/skills',
    doc: { src: '.claude/CLAUDE.md', dest: 'CLAUDE.md', merge: true },
    actor: 'claude-code',
    modelFrontmatter: true,
    subagents: '.claude/agents',
  },
  codex: {
    label: 'Codex',
    skillsDest: '.codex/skills',
    actor: 'codex',
    // Shares the AGENTS.md template with `agents`: both merge the same block
    // (fallback path order inside covers either install), so merge order
    // between the two targets can't change the outcome.
    doc: { src: '.agents/AGENTS.md', dest: 'AGENTS.md', merge: true },
    // Per-skill vendor manifest copied from `skills/<skill>/agents/openai.yaml`.
    manifest: 'openai.yaml',
  },
  agents: {
    label: 'AGENTS.md-compatible agents',
    skillsDest: '.agents/skills',
    doc: { src: '.agents/AGENTS.md', dest: 'AGENTS.md', merge: true },
  },
  gemini: {
    label: 'Gemini CLI',
    skillsDest: '.gemini/skills',
    doc: { src: '.gemini/GEMINI.md', dest: 'GEMINI.md', merge: true },
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
  copilot: {
    label: 'GitHub Copilot',
    skillsDest: '.specship/skills',
    doc: { src: '.github/copilot-instructions.md', dest: '.github/copilot-instructions.md', merge: true },
  },
  windsurf: {
    label: 'Windsurf',
    skillsDest: '.specship/skills',
    doc: { src: '.windsurf/rules/specship.md', dest: '.windsurf/rules/specship.md', merge: false },
  },
  cline: {
    label: 'Cline',
    skillsDest: '.specship/skills',
    doc: { src: '.clinerules/specship.md', dest: '.clinerules/specship.md', merge: false },
  },
  roo: {
    label: 'Roo Code',
    skillsDest: '.specship/skills',
    doc: { src: '.roo/rules/specship.md', dest: '.roo/rules/specship.md', merge: false },
  },
};
