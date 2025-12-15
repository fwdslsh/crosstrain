## Usage

```bash
# Convert all assets in current project
crosstrain all

# Convert specific assets
crosstrain command .claude/commands/my-command.md
crosstrain skill .claude/skills/my-skill
crosstrain agent .claude/agents/my-agent.md

# Convert a full plugin (local or remote)
crosstrain plugin path/to/plugin
crosstrain plugin https://github.com/user/plugin

# Import Claude Code settings to opencode.json
crosstrain settings

# Convert MCP servers
crosstrain mcp

# Initialize a skills plugin
crosstrain init

# Browse marketplace plugins
crosstrain list https://github.com/user/marketplace

# Use options
crosstrain all --output-dir custom-dir --prefix custom_ --verbose
```

## Features

- **Asset Conversion**: Convert Claude Code skills, agents, commands, hooks, and MCP servers to OpenCode format
- **Plugin Support**: Convert entire plugins from local directories or remote Git repositories
- **Marketplace Integration**: Browse and convert plugins from Claude Code marketplaces
- **Flexible Configuration**: Customize output directory, file prefixes, and conversion behavior
- **Settings Import**: Import Claude Code settings.json to OpenCode opencode.json format
- **Skill Plugin Generator**: Initialize new skills plugins with proper structure
- **Dry Run Mode**: Preview changes before writing files
- **Verbose Output**: Detailed logging for troubleshooting

## Installation

```bash
# Quick install (recommended)
curl -fsSL https://raw.githubusercontent.com/fwdslsh/crosstrain/main/install.sh | bash

# Install via npm
npm install -g @fwdslsh/crosstrain

# Or use npx (no installation required)
npx @fwdslsh/crosstrain --help
```
