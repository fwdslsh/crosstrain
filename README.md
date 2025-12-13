# Crosstrain

OpenCode plugin that loads Claude Code extensions into OpenCode.

## What It Does

Crosstrain bridges Claude Code's extension ecosystem to OpenCode:

| Claude Code | → | OpenCode |
|-------------|---|----------|
| Skills (`.claude/skills/`) | → | Custom tools |
| Agents (`.claude/agents/`) | → | Agents (`.opencode/agent/`) |
| Commands (`.claude/commands/`) | → | Commands (`.opencode/command/`) |
| Hooks (`settings.json`) | → | Event handlers |
| MCP Servers (`.mcp.json`) | → | MCP config (`opencode.json`) |

## Installation

### Quick Install (Project)

```bash
curl -fsSL https://raw.githubusercontent.com/fwdslsh/crosstrain/main/install.sh | bash
```

### Global Install (User-wide)

```bash
curl -fsSL https://raw.githubusercontent.com/fwdslsh/crosstrain/main/install.sh | bash -s -- global
```

### Manual Install

```bash
# Clone to your plugin directory
git clone https://github.com/fwdslsh/crosstrain.git .opencode/plugin/crosstrain
cd .opencode/plugin/crosstrain
bun install
```

## Configuration

Settings are in the plugin directory at `.opencode/plugin/crosstrain/settings.json`:

```json
{
  "enabled": true,
  "claudeDir": ".claude",
  "openCodeDir": ".opencode",
  "loadUserAssets": true,
  "loadUserSettings": true,
  "watch": true,
  "filePrefix": "claude_",
  "verbose": false
}
```

All settings are optional. The plugin works with sensible defaults.

### Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable the plugin |
| `claudeDir` | `.claude` | Claude Code assets directory |
| `openCodeDir` | `.opencode` | OpenCode assets directory |
| `loadUserAssets` | `true` | Load from `~/.claude` |
| `loadUserSettings` | `true` | Load marketplace/plugin settings from `~/.claude/settings.json` |
| `watch` | `true` | Watch for file changes |
| `filePrefix` | `claude_` | Prefix for generated files |
| `verbose` | `false` | Enable verbose logging |
| `loaders` | all `true` | Enable/disable loaders: `skills`, `agents`, `commands`, `hooks`, `mcp` |

### Environment Variables

Override settings with environment variables:

```bash
CROSSTRAIN_ENABLED=false      # Disable plugin
CROSSTRAIN_VERBOSE=true       # Enable logging
CROSSTRAIN_WATCH=false        # Disable file watching
CROSSTRAIN_LOAD_USER_ASSETS=false
CROSSTRAIN_LOAD_USER_SETTINGS=false
```

## Usage

### Skills → Tools

Place skills in `.claude/skills/<name>/SKILL.md`:

```markdown
---
name: commit-helper
description: Generates commit messages from diffs
---

# Instructions
1. Run `git diff --staged`
2. Generate a commit message
```

Becomes tool: `skill_commit_helper`

### Agents → Agents

Place agents in `.claude/agents/<name>.md`:

```markdown
---
description: Code review agent
model: sonnet
tools: Read, Grep, Glob
---

Review code for quality and suggest improvements.
```

Becomes: `.opencode/agent/claude_<name>.md`

**Model mapping:**
- `sonnet` → `anthropic/claude-sonnet-4-20250514`
- `opus` → `anthropic/claude-opus-4-20250514`
- `haiku` → `anthropic/claude-haiku-4-20250514`

### Commands → Commands

Place commands in `.claude/commands/<name>.md`:

```markdown
---
description: Run tests
---

Run the test suite: `$ARGUMENTS`
```

Becomes: `.opencode/command/claude_<name>.md`

### Hooks → Event Handlers

Define hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "echo 'Pre-bash'" }]
      }
    ]
  }
}
```

**Event mapping:**
- `PreToolUse` → `tool.execute.before`
- `PostToolUse` → `tool.execute.after`
- `SessionStart` → `session.created`
- `SessionEnd` → `session.idle`

### Marketplace Plugins

Crosstrain reads marketplace and plugin settings from Claude Code's `settings.json`:

```json
{
  "enabledPlugins": {
    "my-plugin@my-marketplace": true
  },
  "extraKnownMarketplaces": {
    "my-marketplace": {
      "source": { "source": "github", "repo": "org/plugins" }
    }
  }
}
```

**Available tools:**
- `crosstrain_list_marketplaces` - List configured marketplaces
- `crosstrain_list_installed` - Show installed plugins
- `crosstrain_install_plugin` - Install a plugin
- `crosstrain_uninstall_plugin` - Remove a plugin
- `crosstrain_clear_cache` - Clear marketplace cache

## Directory Structure

```
project/
├── .claude/                      # Claude Code assets
│   ├── skills/
│   │   └── my-skill/SKILL.md
│   ├── agents/
│   │   └── my-agent.md
│   ├── commands/
│   │   └── my-command.md
│   └── settings.json             # Hooks and plugin settings
│
└── .opencode/                    # OpenCode assets
    ├── agent/
    │   └── claude_my-agent.md    # Generated
    ├── command/
    │   └── claude_my-command.md  # Generated
    └── plugin/
        └── crosstrain/           # This plugin
            ├── index.ts          # Entry point
            ├── settings.json     # Plugin configuration
            ├── settings.schema.json
            └── src/              # Implementation
```

## Development

```bash
git clone https://github.com/fwdslsh/crosstrain.git
cd crosstrain
bun install
bun test              # Run tests
bun run typecheck     # Type check
bun run build         # Build
```

## License

CC-BY-4.0
