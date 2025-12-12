# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**crosstrain** is an opencode.ai plugin that enables opencode to leverage Claude Code's extension points including plugins, skills, agents, commands, and hooks. This bridges two AI coding assistants by making Claude Code's extension ecosystem available to opencode users.

## OpenCode Plugin Architecture

Plugins are JavaScript/TypeScript modules that extend OpenCode by hooking into events and providing custom functionality.

### Plugin Locations
- Project-local: `.opencode/plugin/`
- Global: `~/.config/opencode/plugin/`

### Plugin Structure
```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    // Event handlers
    event: async ({ event }) => { /* handle session.idle, file.edited, etc */ },

    // Tool hooks
    "tool.execute.before": async (input, output) => { /* pre-tool logic */ },
    "tool.execute.after": async (input, output) => { /* post-tool logic */ },

    // Custom tools
    tool: {
      mytool: tool({
        description: "Tool description",
        args: { param: tool.schema.string() },
        async execute(args, ctx) { return "result" }
      })
    }
  }
}
```

### Plugin Context
- `project`: Current project information
- `directory`: Current working directory
- `worktree`: Git worktree path
- `client`: OpenCode SDK client for AI interactions
- `$`: Bun shell API for command execution

## Extension Points to Bridge

### From Claude Code to OpenCode

| Claude Code Concept | OpenCode Equivalent | Implementation Path |
|---------------------|---------------------|---------------------|
| Skills (`.claude/skills/`) | Custom Tools | Plugin `tool` exports |
| Agents (`.claude/agents/`) | Agents (`.opencode/agent/`) | Markdown or JSON config |
| Commands (`.claude/commands/`) | Commands (`.opencode/command/`) | Markdown or JSON config |
| Hooks | Plugin event handlers | `tool.execute.before/after`, event handlers |
| MCP Servers | MCP config in `opencode.json` | Direct MCP integration |

### OpenCode Event Types
- **Session**: `session.created`, `session.idle`, `session.error`, `session.status`
- **Tool**: `tool.execute.before`, `tool.execute.after`
- **File**: `file.edited`, `file.watcher.updated`
- **Message**: `message.updated`, `message.removed`
- **Permission**: `permission.updated`, `permission.replied`
- **TUI**: `tui.prompt.append`, `tui.command.execute`

## Development Commands

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type checking (if TypeScript)
bun run typecheck

# Build plugin
bun run build
```

## Key Configuration Files

### opencode.json Schema
```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": { /* agent definitions */ },
  "command": { /* command definitions */ },
  "tools": { /* tool enable/disable */ },
  "mcp": { /* MCP server config */ },
  "instructions": [ /* rule file paths */ ]
}
```

### Custom Tool Definition
```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "What the tool does",
  args: {
    param: tool.schema.string().describe("Parameter description")
  },
  async execute(args, context) {
    const { agent, sessionID, messageID } = context
    return "result"
  }
})
```

### Agent Markdown Format (`.opencode/agent/name.md`)
```markdown
---
description: What the agent does
mode: subagent  # or: primary, all
model: anthropic/claude-sonnet-4-20250514
temperature: 0.3
tools:
  write: false
  edit: false
  bash: false
permission:
  edit: ask
  bash: ask
---
System prompt content here.
```

### Command Markdown Format (`.opencode/command/name.md`)
```markdown
---
description: Command description
agent: build
model: anthropic/claude-3-5-sonnet-20241022
subtask: true  # optional: run as subagent
---
Prompt template with $ARGUMENTS or $1, $2, etc.
Include @filepath for file references.
Use !`command` for shell output injection.
```

## Reference Documentation

All opencode documentation is available in `.claude/reference/opencode/`:
- `plugins.md` - Plugin system and event hooks
- `custom-tools.md` - Custom tool creation
- `agents.md` - Agent configuration
- `commands.md` - Custom commands
- `rules.md` - AGENTS.md instruction files
- `mcp-servers.md` - MCP server integration
- `sdk.md` - JavaScript/TypeScript SDK
- `config.md` - Configuration options

## Implementation Notes

- Use `@opencode-ai/plugin` package for type-safe plugin development
- Use `@opencode-ai/sdk` for programmatic opencode interaction
- Custom tools use Zod schemas via `tool.schema` for argument validation
- Plugin hooks can block tool execution by throwing errors
- Agent permissions support glob patterns for bash commands
- Commands support `$ARGUMENTS`, positional params (`$1`, `$2`), file refs (`@path`), and shell injection (`` !`cmd` ``)
