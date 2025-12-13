# Crosstrain CLI Reference

The crosstrain CLI converts Claude Code assets (skills, agents, commands, hooks, MCP servers) to OpenCode format.

## Installation

```bash
# Install globally
bun install -g crosstrain

# Or run directly with bunx
bunx crosstrain --help

# Or from source
git clone https://github.com/fwdslsh/crosstrain.git
cd crosstrain
bun install
bun link
```

## Usage

```bash
crosstrain <command> [path] [options]
```

## Global Options

| Option | Description |
|--------|-------------|
| `-o, --output-dir <path>` | Output directory (default: `.opencode`) |
| `-p, --prefix <prefix>` | File prefix for generated files (default: `claude_`) |
| `-v, --verbose` | Enable verbose output |
| `--dry-run` | Preview changes without writing files |
| `--no-user` | Skip user-level assets from `~/.claude` |
| `-h, --help` | Show help message |
| `--version` | Show version number |

## Commands

### `all` / `sync`

Convert all Claude Code assets in the current project.

```bash
crosstrain all [options]
crosstrain sync [options]  # Alias for 'all'
```

**What it converts:**
- Commands from `.claude/commands/`
- Agents from `.claude/agents/`
- Skills from `.claude/skills/`
- MCP servers from `.mcp.json`
- Displays hooks from `.claude/settings.json`

**Example:**
```bash
# Convert everything
crosstrain all

# Preview changes first
crosstrain all --dry-run

# Convert without user-level assets
crosstrain all --no-user

# Custom output directory
crosstrain all -o ./my-opencode
```

---

### `command`

Convert a single Claude Code command to OpenCode format.

```bash
crosstrain command <path> [options]
```

**Arguments:**
- `path` - Path to the command file (`.md`)

**Input:** Markdown file with optional frontmatter
```markdown
---
description: Run the test suite
---

Run tests with: $ARGUMENTS
```

**Output:** `.opencode/command/claude_<name>.md`

**Example:**
```bash
crosstrain command .claude/commands/run-tests.md
crosstrain command .claude/commands/deploy.md --dry-run
```

---

### `skill`

Convert a Claude Code skill to an OpenCode plugin tool.

```bash
crosstrain skill <path> [options]
```

**Arguments:**
- `path` - Path to the skill directory (must contain `SKILL.md`)

**Input:** Directory with `SKILL.md` file
```
.claude/skills/commit-helper/
├── SKILL.md
└── (optional supporting files)
```

**Output:** TypeScript plugin tool
```
.opencode/plugin/crosstrain-skills/
├── index.ts
├── package.json
└── tools/
    └── skill_commit_helper.ts
```

**Example:**
```bash
crosstrain skill .claude/skills/pdf-extractor
crosstrain skill .claude/skills/code-review --dry-run
```

---

### `agent`

Convert a Claude Code agent to OpenCode format.

```bash
crosstrain agent <path> [options]
```

**Arguments:**
- `path` - Path to the agent file (`.md`)

**Input:** Markdown file with frontmatter
```markdown
---
description: Code review agent
model: sonnet
tools: Read, Grep, Glob
permissionMode: plan
---

Review code for quality issues and suggest improvements.
```

**Output:** `.opencode/agent/claude_<name>.md`

**Model mapping:**
- `sonnet` → `anthropic/claude-sonnet-4-20250514`
- `opus` → `anthropic/claude-opus-4-20250514`
- `haiku` → `anthropic/claude-haiku-4-20250514`

**Example:**
```bash
crosstrain agent .claude/agents/code-review.md
crosstrain agent .claude/agents/test-writer.md --dry-run
```

---

### `hook`

Display Claude Code hooks configuration and their OpenCode event mapping.

```bash
crosstrain hook [options]
```

**Reads from:**
- `.claude/settings.json`
- `~/.claude/settings.json` (unless `--no-user`)

**Event mapping:**
| Claude Code | OpenCode |
|-------------|----------|
| `PreToolUse` | `tool.execute.before` |
| `PostToolUse` | `tool.execute.after` |
| `SessionStart` | `session.created` |
| `SessionEnd` | `session.idle` |
| `Stop` | `session.idle` |

**Example:**
```bash
crosstrain hook
crosstrain hook --no-user
```

---

### `mcp`

Convert Claude Code MCP servers to OpenCode configuration.

```bash
crosstrain mcp [path] [options]
```

**Arguments:**
- `path` - (Optional) Path to specific `.mcp.json` file. If omitted, discovers all.

**Input:** `.mcp.json` file
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}
```

**Output:** Merges into `opencode.json` → `mcp` section

**Example:**
```bash
# Discover and convert all MCP servers
crosstrain mcp

# Convert specific file
crosstrain mcp .mcp.json

# Preview changes
crosstrain mcp --dry-run
```

---

### `plugin`

Convert a Claude Code plugin to OpenCode assets. Supports both local paths and remote GitHub sources.

```bash
crosstrain plugin <source> [options]
```

**Arguments:**
- `source` - Plugin source:
  - Local path: `./path/to/plugin` or `.claude/plugins/my-plugin`
  - GitHub shorthand: `org/repo/plugin-path`
  - GitHub with version: `org/repo/plugin-path@v1.0.0`
  - Full URL: `https://github.com/org/repo`

**What it converts:**
- `commands/` → OpenCode commands
- `agents/` → OpenCode agents
- `skills/` → Plugin tools (namespaced by plugin name)
- `.mcp.json` → OpenCode MCP config
- `settings.json` → Displays hooks info

**Output structure:**
```
.opencode/
├── agent/
│   └── claude_<plugin>_<agent>.md
├── command/
│   └── claude_<plugin>_<command>.md
└── plugin/
    └── crosstrain-<plugin>/
        ├── index.ts
        ├── package.json
        └── tools/
            └── skill_<plugin>_<skill>.ts
```

**Examples:**
```bash
# Local plugin
crosstrain plugin .claude/plugins/my-plugin

# GitHub plugin
crosstrain plugin anthropics/claude-plugins/code-review

# GitHub with version
crosstrain plugin org/marketplace/my-plugin@v2.0.0

# Preview changes
crosstrain plugin ./my-plugin --dry-run
```

---

### `list`

List available plugins in a Claude Code marketplace.

```bash
crosstrain list <source> [options]
```

**Arguments:**
- `source` - Marketplace source:
  - GitHub shorthand: `org/repo`
  - GitHub with version: `org/repo@v1.0.0`
  - Full URL: `https://github.com/org/repo`

**Output:** Lists plugins with:
- Name and description
- Available components (skills, agents, commands, mcp)
- Command to convert each plugin

**Example:**
```bash
# List plugins in a marketplace
crosstrain list anthropics/claude-plugins

# List from specific version
crosstrain list org/marketplace@v1.0.0

# Verbose output
crosstrain list org/repo --verbose
```

---

### `init`

Initialize a new OpenCode plugin structure for skills.

```bash
crosstrain init [options]
```

**Creates:**
```
.opencode/plugin/crosstrain-skills/
├── index.ts        # Plugin entry point
├── package.json    # Plugin manifest
└── tools/          # Directory for skill tools
```

**Example:**
```bash
crosstrain init
crosstrain init --dry-run
crosstrain init -o ./custom-opencode
```

---

### `settings`

Import Claude Code settings to OpenCode configuration.

```bash
crosstrain settings [options]
```

**Reads from (in order):**
1. `~/.claude/settings.json` - User settings
2. `~/.claude/settings.local.json` - User local settings
3. `.claude/settings.json` - Project settings
4. `.claude/settings.local.json` - Project local settings

**Converts to:** `opencode.json` in project root

**What it converts:**
- `model` → OpenCode model path (e.g., `anthropic/claude-sonnet-4-5`)
- `permissions.defaultMode` → Permission presets
- `permissions.allow/deny` → Tool permissions

**Permission mode mapping:**
| Claude Code | OpenCode |
|-------------|----------|
| `acceptEdits` | `{ edit: "allow" }` |
| `bypassPermissions` | `{ edit: "allow", bash: "allow" }` |
| `plan` | `{ edit: "deny", bash: "deny" }` |

**Not converted** (no direct equivalent):
- `hooks` - Use OpenCode plugins/events instead
- `env` - Set environment variables before running OpenCode
- `companyAnnouncements` - Not supported
- `sandbox` - OpenCode uses different sandboxing

**Example:**
```bash
# Import settings
crosstrain settings

# Preview changes first
crosstrain settings --dry-run

# Show detailed settings discovery
crosstrain settings --verbose

# Skip user-level settings
crosstrain settings --no-user
```

---

## Remote Sources

The `plugin` and `list` commands support remote sources:

### GitHub Shorthand
```bash
crosstrain plugin org/repo/plugin-name
crosstrain list org/repo
```

### Version Tags
```bash
crosstrain plugin org/repo/plugin@v1.0.0
crosstrain list org/repo@main
```

### Full URLs
```bash
crosstrain plugin https://github.com/org/repo
crosstrain plugin git@github.com:org/repo.git
```

### Caching

Remote repositories are cached in a temporary directory. The cache is automatically updated on each run. To force a fresh clone, delete the cache directory:
```bash
rm -rf /tmp/crosstrain-cli-cache
```

---

## Workflow Examples

### Convert entire project
```bash
cd my-project
crosstrain all --dry-run  # Preview
crosstrain all            # Execute
```

### Convert plugin from marketplace
```bash
# Browse available plugins
crosstrain list anthropics/claude-plugins

# Convert one
crosstrain plugin anthropics/claude-plugins/code-review
```

### Set up skills as tools
```bash
# Initialize plugin structure
crosstrain init

# Add individual skills
crosstrain skill .claude/skills/pdf-extractor
crosstrain skill .claude/skills/commit-helper

# Or convert all at once
crosstrain all
```

### Custom output directory
```bash
crosstrain all -o ./my-opencode-dir -p "my_"
```

### Import settings from Claude Code
```bash
# Preview what settings will be imported
crosstrain settings --dry-run --verbose

# Import settings to opencode.json
crosstrain settings

# Full migration: settings + all assets
crosstrain settings && crosstrain all
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (invalid arguments, missing files, conversion failure) |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DEBUG` | Set to any value to show stack traces on errors |
| `HOME` | Used to locate `~/.claude` for user-level assets |

---

## See Also

- [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Architecture and development guide
