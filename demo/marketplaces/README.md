# Marketplace Demo

This directory contains example marketplaces and plugins demonstrating how to use the crosstrain marketplace and plugin installation features.

## Structure

```
marketplaces/
└── demo-marketplace/              # Example marketplace
    ├── .claude-plugin/
    │   └── marketplace.json       # Marketplace manifest
    └── example-plugin/            # Example plugin
        ├── .claude-plugin/
        │   └── plugin.json        # Plugin manifest
        ├── skills/                # Plugin skills
        ├── agents/                # Plugin agents
        └── commands/              # Plugin commands
```

## Usage

### 1. Configure the Marketplace

Add the marketplace to your crosstrain configuration:

**In `.crosstrainrc.json` or `crosstrain.config.json`:**
```json
{
  "marketplaces": [
    {
      "name": "demo-marketplace",
      "source": "./demo/marketplaces/demo-marketplace",
      "enabled": true
    }
  ]
}
```

**Or in `opencode.json`:**
```json
{
  "plugins": {
    "crosstrain": {
      "marketplaces": [
        {
          "name": "demo-marketplace",
          "source": "./demo/marketplaces/demo-marketplace",
          "enabled": true
        }
      ]
    }
  }
}
```

### 2. Configure Plugin Installation

Add plugins to install from the marketplace:

```json
{
  "plugins": [
    {
      "name": "example-plugin",
      "marketplace": "demo-marketplace",
      "installDir": "project",
      "enabled": true
    }
  ]
}
```

### 3. Restart OpenCode

After configuring, restart OpenCode. The crosstrain plugin will:
1. Load the configured marketplace
2. Install the configured plugins
3. Load the plugin assets (skills, agents, commands)

### 4. Use Plugin Management Tools

Interact with marketplaces and plugins using the provided tools:

```
# List available marketplaces and their plugins
Use the crosstrain_list_marketplaces tool

# Check installation status
Use the crosstrain_list_installed tool

# Install a plugin manually
Use the crosstrain_install_plugin tool with:
- pluginName: "example-plugin"
- marketplace: "demo-marketplace"
- installDir: "project" (or "user" or custom path)

# Uninstall a plugin
Use the crosstrain_uninstall_plugin tool with:
- pluginName: "example-plugin"
- installDir: "project"
```

## Installation Directories

### Project Installation (`"project"`)
Installs to `.claude/plugins/` in your project directory.
- **Use when:** Plugin is specific to this project
- **Location:** `.claude/plugins/<plugin-name>/`

### User Installation (`"user"`)
Installs to `~/.claude/plugins/` in your home directory.
- **Use when:** Plugin should be available across all projects
- **Location:** `~/.claude/plugins/<plugin-name>/`

### Custom Path
Specify any absolute or relative path.
- **Use when:** You have a custom organization structure
- **Example:** `"installDir": "../shared/claude-plugins"`

## Creating Your Own Marketplace

### 1. Create Directory Structure
```bash
mkdir -p my-marketplace/.claude-plugin
mkdir -p my-marketplace/my-plugin/.claude-plugin
```

### 2. Create Marketplace Manifest
Create `my-marketplace/.claude-plugin/marketplace.json`:
```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "description": "My custom marketplace",
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./my-plugin",
      "description": "My custom plugin"
    }
  ]
}
```

### 3. Create Plugin Manifest
Create `my-marketplace/my-plugin/.claude-plugin/plugin.json`:
```json
{
  "name": "my-plugin",
  "description": "My custom Claude Code plugin",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### 4. Add Plugin Components
Add any combination of:
- `skills/` - Claude Code skills
- `agents/` - Claude Code agents
- `commands/` - Claude Code commands
- `hooks/` - Claude Code hooks
- `.mcp.json` - MCP server configuration

### 5. Configure and Use
Add your marketplace to crosstrain configuration and install your plugin!

## Future: Git-Based Marketplaces

The crosstrain plugin is designed to support Git-based marketplaces (not yet implemented):

```json
{
  "marketplaces": [
    {
      "name": "github-marketplace",
      "source": "https://github.com/org/claude-plugins",
      "ref": "main",
      "enabled": true
    },
    {
      "name": "shorthand-marketplace",
      "source": "org/claude-plugins",
      "enabled": true
    }
  ]
}
```

When implemented, crosstrain will:
1. Clone the repository
2. Checkout the specified branch/tag
3. Parse the marketplace manifest
4. Make plugins available for installation

## See Also

- [Claude Code Plugin Documentation](https://docs.claude.com/docs/en/plugins)
- [Crosstrain Main README](../../README.md)
- [Plugin Structure Reference](https://docs.claude.com/docs/en/plugins-reference)
