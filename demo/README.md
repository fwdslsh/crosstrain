# Crosstrain Demo Examples

This directory contains working examples that demonstrate how the crosstrain plugin loads and converts Claude Code assets for use with OpenCode.

## Quick Start

```bash
# Run from the project root
bun run demo/skills/01-basic-skill.ts
bun run demo/agents/01-basic-agent.ts
bun run demo/commands/01-basic-command.ts
bun run demo/hooks/01-pre-tool-use.ts
bun run demo/plugin-integration.ts
```

## Directory Structure

```
demo/
├── fixtures/           # Sample Claude Code assets for demos
│   └── .claude/
│       ├── skills/     # Sample skills (SKILL.md files)
│       ├── agents/     # Sample agents (markdown)
│       ├── commands/   # Sample commands (markdown)
│       └── settings.json  # Sample hooks configuration
├── skills/             # Skills -> Tools demos
├── agents/             # Agents -> Agents demos
├── commands/           # Commands -> Commands demos
├── hooks/              # Hooks -> Event handlers demos
├── marketplaces/       # Marketplace integration demos
└── plugin-integration.ts  # Full plugin demonstration
```

## Demo Categories

### Skills -> Tools (`demo/skills/`)

Shows how Claude Code Skills are converted to OpenCode custom tools.

```bash
bun run demo/skills/01-basic-skill.ts
```

**What it demonstrates:**
- `discoverSkills()` - Finds all SKILL.md files in `.claude/skills/`
- `createToolsFromSkills()` - Converts skills to OpenCode tool definitions
- Tool execution returns skill instructions to guide the LLM

### Agents -> Agents (`demo/agents/`)

Shows how Claude Code Subagents are synced to OpenCode agents.

```bash
bun run demo/agents/01-basic-agent.ts
```

**What it demonstrates:**
- `discoverAgents()` - Finds all agent markdown files
- `syncAgentsToOpenCode()` - Writes converted agents to `.opencode/agent/`
- Frontmatter mapping (model aliases, tools, permissions)

### Commands -> Commands (`demo/commands/`)

Shows how Claude Code slash commands are synced to OpenCode commands.

```bash
bun run demo/commands/01-basic-command.ts
```

**What it demonstrates:**
- `discoverCommands()` - Finds all command markdown files
- `syncCommandsToOpenCode()` - Writes converted commands to `.opencode/command/`
- Template syntax is 100% compatible (`$ARGUMENTS`, `$1`, `@file`, `` !`cmd` ``)

### Hooks -> Event Handlers (`demo/hooks/`)

Shows how Claude Code hooks become OpenCode plugin event handlers.

```bash
bun run demo/hooks/01-pre-tool-use.ts
```

**What it demonstrates:**
- `loadClaudeHooksConfig()` - Reads hooks from settings.json
- `buildHookHandlers()` - Creates OpenCode event handlers
- Hook event mapping (PreToolUse -> tool.execute.before, etc.)

### Full Plugin Integration (`demo/plugin-integration.ts`)

Shows the complete plugin initialization process.

```bash
bun run demo/plugin-integration.ts
```

**What it demonstrates:**
- Full `CrosstrainPlugin` initialization
- All loaders working together
- Tools, agents, commands, and hooks loaded simultaneously

## Key Concepts

### How the Plugin Works

1. **Discovery**: The plugin scans `.claude/` directories for assets
2. **Parsing**: Each asset type is parsed (frontmatter + content)
3. **Conversion**: Assets are mapped to OpenCode equivalents
4. **Export**: Tools are exported directly; agents/commands are written to `.opencode/`

### Asset Conversion Summary

| Claude Code | OpenCode | Location |
|-------------|----------|----------|
| Skills (`skills/*/SKILL.md`) | Custom Tools | Plugin `tool` export |
| Agents (`agents/*.md`) | Agents | `.opencode/agent/` |
| Commands (`commands/*.md`) | Commands | `.opencode/command/` |
| Hooks (`settings.json`) | Event Handlers | Plugin event hooks |

### Naming Convention

Converted assets use a prefix to avoid conflicts:

- `skill_commit_helper` (from `commit-helper` skill)
- `claude_documentation.md` (from `documentation` agent)
- `claude_test.md` (from `test` command)

## Fixtures

The `demo/fixtures/.claude/` directory contains sample Claude Code assets:

### Skills
- **commit-helper**: Generates conventional commit messages
- **code-review**: Provides thorough code review with checklists

### Agents
- **documentation**: Specialized agent for writing documentation
- **security-reviewer**: Security-focused code reviewer

### Commands
- **test**: Run tests with coverage
- **component**: Create React components
- **review**: Review changes and create commits

### Hooks
- **PreToolUse**: Logs file modifications and shell commands
- **PostToolUse**: Logs tool completion

## Using in Your Project

To use crosstrain in a real OpenCode project:

1. Install the plugin in `.opencode/plugin/crosstrain/`
2. Add Claude Code assets to `.claude/`
3. Start OpenCode - assets are loaded automatically

Configuration via `crosstrain.config.json`:

```json
{
  "enabled": true,
  "claudeDir": ".claude",
  "openCodeDir": ".opencode",
  "watch": true,
  "verbose": false,
  "filePrefix": "claude_"
}
```

## API Reference

### Skills Loader

```typescript
import { discoverSkills, createToolsFromSkills } from "crosstrain/loaders/skills"

const skills = await discoverSkills(claudeDir, homeDir)
const tools = await createToolsFromSkills(claudeDir, homeDir)
```

### Agents Loader

```typescript
import { discoverAgents, syncAgentsToOpenCode } from "crosstrain/loaders/agents"

const agents = await discoverAgents(claudeDir, homeDir)
await syncAgentsToOpenCode(claudeDir, homeDir, openCodeDir, options)
```

### Commands Loader

```typescript
import { discoverCommands, syncCommandsToOpenCode } from "crosstrain/loaders/commands"

const commands = await discoverCommands(claudeDir, homeDir)
await syncCommandsToOpenCode(claudeDir, homeDir, openCodeDir, options)
```

### Hooks Loader

```typescript
import { loadClaudeHooksConfig, buildHookHandlers } from "crosstrain/loaders/hooks"

const config = await loadClaudeHooksConfig(claudeDir, homeDir)
const handlers = await buildHookHandlers(claudeDir, homeDir)
```

## License

MIT - Same as the crosstrain plugin
