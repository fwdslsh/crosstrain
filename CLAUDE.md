# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**crosstrain** is a CLI tool and OpenCode plugin that bridges Claude Code's extension ecosystem to OpenCode. It converts Claude Code skills, agents, commands, hooks, and MCP servers into their OpenCode equivalents, enabling users of both AI assistants to share extension points.

## Development Commands

```bash
bun install                    # Install dependencies
bun test                       # Run all tests
bun test:watch                 # Watch mode
bun test --test-name-pattern cli  # Run CLI tests
bun run typecheck              # TypeScript type checking
bun run build                  # Build to dist/
```

## Architecture

### CLI Tool (`src/cli.ts`)

The primary interface is the crosstrain CLI. It handles all asset conversion operations:

```bash
crosstrain <command> [path] [options]
```

**Commands:**
- `command <path>` - Convert a Claude Code command to OpenCode
- `skill <path>` - Convert a skill to an OpenCode plugin tool
- `agent <path>` - Convert an agent to OpenCode format
- `hook` - Display hooks configuration
- `mcp [path]` - Convert MCP servers to OpenCode config
- `plugin <source>` - Convert a full plugin (local or remote)
- `list <source>` - Browse marketplace plugins
- `all` / `sync` - Convert all assets in current project
- `init` - Initialize a skills plugin
- `settings` - Import Claude Code settings to opencode.json

**Options:**
- `-o, --output-dir <path>` - Output directory (default: .opencode)
- `-p, --prefix <prefix>` - File prefix (default: claude_)
- `-v, --verbose` - Enable verbose output
- `--dry-run` - Preview changes without writing files
- `--no-user` - Skip user-level assets from ~/.claude

### Plugin Entry Point (`src/index.ts`)

The OpenCode plugin wraps the CLI, exposing tools that allow the AI agent to:
- Run crosstrain CLI commands
- Assist with asset conversion
- Review and improve generated OpenCode assets

**Plugin Tools:**
- `crosstrain` - Generic CLI wrapper (accepts any command string)
- `crosstrain_convert_all` - Convert all assets
- `crosstrain_convert_plugin` - Convert a plugin
- `crosstrain_list_marketplace` - Browse marketplaces
- `crosstrain_convert_command` - Convert single command
- `crosstrain_convert_skill` - Convert single skill
- `crosstrain_convert_agent` - Convert single agent
- `crosstrain_convert_mcp` - Convert MCP servers
- `crosstrain_show_hooks` - Display hooks config
- `crosstrain_init` - Initialize skills plugin
- `crosstrain_import_settings` - Import Claude Code settings to opencode.json
- `crosstrain_help` - Show CLI help

### Loader Pattern (`src/loaders/`)

Loaders are used by the CLI for asset discovery and conversion:

| Loader | Source | Destination |
|--------|--------|-------------|
| `skills.ts` | `.claude/skills/*/SKILL.md` | Plugin tool code |
| `agents.ts` | `.claude/agents/*.md` | `.opencode/agent/claude_*.md` |
| `commands.ts` | `.claude/commands/*.md` | `.opencode/command/claude_*.md` |
| `hooks.ts` | `.claude/settings.json` | Runtime event handlers |
| `mcp.ts` | `.mcp.json` files | `opencode.json` → `mcp` section |
| `marketplace.ts` | Git repos / local dirs | Plugin discovery |
| `crosstrainer-config.ts` | `crosstrainer.{json,js}` | Conversion customization |
| `settings-converter.ts` | `.claude/settings.json` | `opencode.json` |

### Type System (`src/types.ts`)

Defines interfaces for both Claude Code and OpenCode formats:
- `Claude*` types: Input formats from Claude Code assets
- `OpenCode*` types: Output formats for OpenCode
- `*_MAPPING` constants: Translation tables (models, tools, permissions, hooks)

### Configuration (`src/utils/config.ts`)

Plugin configuration in `.opencode/plugin/crosstrain/settings.json`:

```json
{
  "enabled": true,
  "verbose": false
}
```

The CLI uses its own arguments and doesn't require configuration files.

### Crosstrainer Config (`src/loaders/crosstrainer-config.ts`)

Plugin authors can customize conversion with `crosstrainer.{json,jsonc,js,ts}` in their plugin root:

- **JSON/JSONC**: Declarative config for mappings and filters
- **JS/TS**: Full control with transform hooks

Only one crosstrainer file allowed per plugin. See `docs/cli.md` for full documentation.

**Key features:**
- Asset filtering (include/exclude lists)
- Model and permission mappings
- Transform hooks for agents, commands, skills, MCP
- Custom skill tool code generation
- Post-conversion hooks

## Key Mappings

### Model Mapping (Claude alias → OpenCode path)
- `sonnet` → `anthropic/claude-sonnet-4-20250514`
- `opus` → `anthropic/claude-opus-4-20250514`
- `haiku` → `anthropic/claude-haiku-4-20250514`

### Hook Event Mapping
- `PreToolUse` → `tool.execute.before`
- `PostToolUse` → `tool.execute.after`
- `SessionStart` → `session.created`
- `SessionEnd` / `Stop` → `session.idle`

### Permission Mode Mapping
- `acceptEdits` → `{ edit: "allow" }`
- `bypassPermissions` → `{ edit: "allow", bash: "allow" }`
- `plan` → `{ edit: "deny", bash: "deny" }`

## Testing

Tests are in `src/tests/`. Run specific test files:

```bash
bun test --test-name-pattern "cli"
bun test --test-name-pattern "skills"
bun test --test-name-pattern "marketplace"
bun test --test-name-pattern "config"
```

## Reference Documentation

- CLI documentation: `docs/cli.md`
- OpenCode docs: `.claude/reference/opencode/`
