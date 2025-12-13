# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**crosstrain** is an OpenCode plugin that bridges Claude Code's extension ecosystem to OpenCode. It converts Claude Code skills, agents, commands, and hooks into their OpenCode equivalents, enabling users of both AI assistants to share extension points.

## Development Commands

```bash
bun install                    # Install dependencies
bun test                       # Run all tests (194 tests)
bun test:watch                 # Watch mode
bun test --test-name-pattern skills  # Run specific test file
bun run typecheck              # TypeScript type checking
bun run build                  # Build to dist/
```

## Architecture

### Plugin Entry Point (`src/index.ts`)

The `CrosstrainPlugin` function is the main export. It:
1. Loads configuration from multiple sources (files, env vars)
2. Scans `.claude/` directories (project and user-level)
3. Converts each asset type using specialized loaders
4. Registers tools and event handlers with OpenCode
5. Sets up file watchers for dynamic reloading

### Loader Pattern (`src/loaders/`)

Each loader follows a consistent pattern with three phases:
- `discover*()` - Scan directories for Claude Code assets
- `convert*()` - Transform to OpenCode format
- `sync*ToOpenCode()` - Write to `.opencode/` directory

| Loader | Source | Destination |
|--------|--------|-------------|
| `skills.ts` | `.claude/skills/*/SKILL.md` | Plugin `tool` exports |
| `agents.ts` | `.claude/agents/*.md` | `.opencode/agent/claude_*.md` |
| `commands.ts` | `.claude/commands/*.md` | `.opencode/command/claude_*.md` |
| `hooks.ts` | `.claude/settings.json` | Event handlers (`tool.execute.before/after`) |
| `marketplace.ts` | Marketplace sources | Plugin discovery |
| `plugin-installer.ts` | Marketplace plugins | `.claude/plugins/` |

### Type System (`src/types.ts`)

Defines interfaces for both Claude Code and OpenCode formats:
- `Claude*` types: Input formats from Claude Code assets
- `OpenCode*` types: Output formats for OpenCode
- `*_MAPPING` constants: Translation tables (models, tools, permissions, hooks)

### Configuration (`src/utils/config.ts`)

Config sources (merged in order):
1. `crosstrain.config.json` or `.crosstrainrc.json`
2. `opencode.json` under `plugins.crosstrain`
3. Environment variables `CROSSTRAIN_*`

Key config options: `enabled`, `claudeDir`, `openCodeDir`, `watch`, `filePrefix`, `loaders`, `marketplaces`, `plugins`

### Plugin Tools

The plugin exposes management tools to OpenCode:
- `crosstrain_list_marketplaces` - List configured marketplaces
- `crosstrain_list_installed` - Show plugin installation status
- `crosstrain_install_plugin` / `crosstrain_uninstall_plugin` - Manage plugins
- `crosstrain_clear_cache` - Clear Git marketplace cache

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

Tests are in `src/tests/` with fixtures. Each loader has its own test file. Use `--test-name-pattern` to filter:

```bash
bun test --test-name-pattern "skills"
bun test --test-name-pattern "marketplace"
```

## Reference Documentation

OpenCode docs are in `.claude/reference/opencode/` covering plugins, tools, agents, commands, and MCP integration.
