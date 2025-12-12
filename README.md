# Crosstrain

An OpenCode plugin that dynamically loads Claude Code extension points into OpenCode, bridging two AI coding assistants by making Claude Code's extension ecosystem available to OpenCode users.

## Features

- **Skills → Tools**: Converts Claude Code Skills (`.claude/skills/`) to OpenCode custom tools
- **Agents → Agents**: Converts Claude Code Subagents (`.claude/agents/`) to OpenCode agents (`.opencode/agent/`)
- **Commands → Commands**: Converts Claude Code slash commands (`.claude/commands/`) to OpenCode commands (`.opencode/command/`)
- **Hooks → Event Handlers**: Converts Claude Code hooks (settings.json) to OpenCode plugin event handlers
- **Dynamic Updates**: Watches for changes and automatically resyncs assets

## Installation

### As an OpenCode Plugin

1. Clone or copy this repository to your OpenCode plugin directory:
   ```bash
   # Project-local
   cp -r crosstrain .opencode/plugin/crosstrain

   # Or global
   cp -r crosstrain ~/.config/opencode/plugin/crosstrain
   ```

2. Install dependencies:
   ```bash
   cd .opencode/plugin/crosstrain
   bun install
   ```

3. Restart OpenCode to load the plugin

### Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Build
bun run build
```

## Mapping Reference

### Claude Code Skills → OpenCode Tools

| Claude Code | OpenCode |
|-------------|----------|
| `.claude/skills/<name>/SKILL.md` | Plugin `tool` export as `skill_<name>` |
| `name` frontmatter | Tool name suffix |
| `description` frontmatter | Tool description |
| `allowed-tools` frontmatter | Tool restriction info (shown in description) |
| Markdown content | Tool execution returns instructions |

**Example Claude Skill:**
```markdown
---
name: generating-commit-messages
description: Generates clear commit messages from git diffs
allowed-tools: Read, Grep, Glob, Bash
---

# Generating Commit Messages

## Instructions
1. Run `git diff --staged` to see changes
2. Generate a commit message with summary and details
```

Becomes an OpenCode tool: `skill_generating_commit_messages`

### Claude Code Agents → OpenCode Agents

| Claude Code | OpenCode |
|-------------|----------|
| `.claude/agents/<name>.md` | `.opencode/agent/claude_<name>.md` |
| `name` frontmatter | Filename |
| `description` frontmatter | `description` frontmatter |
| `tools` (comma-separated) | `tools` (object with booleans) |
| `model` (alias) | `model` (full path) |
| `permissionMode` | `permission` object |
| `skills` | Added to system prompt |
| System prompt | System prompt |

**Model Mapping:**
- `sonnet` → `anthropic/claude-sonnet-4-20250514`
- `opus` → `anthropic/claude-opus-4-20250514`
- `haiku` → `anthropic/claude-haiku-4-20250514`
- `inherit` → (no model specified, inherits from parent)

**Permission Mode Mapping:**
- `default` → (no permission changes)
- `acceptEdits` → `{ edit: "allow" }`
- `bypassPermissions` → `{ edit: "allow", bash: "allow" }`
- `plan` → `{ edit: "deny", bash: "deny" }`

### Claude Code Commands → OpenCode Commands

| Claude Code | OpenCode |
|-------------|----------|
| `.claude/commands/<name>.md` | `.opencode/command/claude_<name>.md` |
| `description` frontmatter | `description` frontmatter |
| Template content | Template content |
| `$ARGUMENTS` | `$ARGUMENTS` (compatible) |
| `$1`, `$2`, etc. | `$1`, `$2`, etc. (compatible) |
| `@filepath` | `@filepath` (compatible) |
| `` !`command` `` | `` !`command` `` (compatible) |

### Claude Code Hooks → OpenCode Event Handlers

| Claude Code | OpenCode |
|-------------|----------|
| `PreToolUse` | `tool.execute.before` |
| `PostToolUse` | `tool.execute.after` |
| `SessionStart` | `session.created` event |
| `SessionEnd` | `session.idle` event |
| `Notification` | `tui.toast.show` event |
| `Stop` | `session.idle` event |

**Hook Behavior:**
- Hooks receive JSON input via stdin (same as Claude Code)
- Exit code 2 blocks tool execution (throws error in OpenCode)
- Matchers support pipe-separated patterns (e.g., `Edit|Write`)

## Directory Structure

```
.claude/                    # Claude Code assets (source)
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── agents/
│   └── my-agent.md
├── commands/
│   └── my-command.md
└── settings.json           # Contains hooks configuration

.opencode/                  # OpenCode assets (generated)
├── agent/
│   └── claude_my-agent.md  # Converted agents
├── command/
│   └── claude_my-command.md # Converted commands
└── plugin/
    └── crosstrain/         # This plugin
```

## How It Works

1. **Initialization**: When OpenCode starts, the plugin scans for Claude Code assets in:
   - Project: `.claude/` directory
   - User: `~/.claude/` directory

2. **Asset Conversion**: Each asset type is converted:
   - Skills become tools available to the LLM
   - Agents are written as markdown files to `.opencode/agent/`
   - Commands are written as markdown files to `.opencode/command/`
   - Hooks are registered as plugin event handlers

3. **File Watching**: The plugin watches Claude Code directories for changes and automatically:
   - Reloads skills as tools
   - Rewrites agent/command files
   - Rebuilds hook handlers

4. **Prefixing**: Converted assets are prefixed with `claude_` to avoid conflicts with native OpenCode assets

## API

### Plugin Export

```typescript
import { CrosstrainPlugin } from "@crosstrain/claude-loader"

// The plugin is automatically loaded when placed in the plugin directory
export const MyPlugin = CrosstrainPlugin
```

### Info Tool

The plugin provides a `crosstrain_info` tool that shows loaded Claude Code assets:

```
What Claude Code assets are loaded?
```

## Limitations

- **Skill Interactivity**: Claude Code skills are model-invoked; OpenCode tools require explicit invocation or LLM decision
- **Hook Complexity**: Some Claude Code hook events don't have direct OpenCode equivalents
- **Permission Granularity**: OpenCode has different permission models; some Claude permissions are approximated
- **Real-time Reload**: While files are watched, OpenCode may need a restart to pick up some changes (agents, commands)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT
