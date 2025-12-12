Plugins - Claude Code Docs

[Skip to main content](#content-area)

[Claude Code Docs home page![light logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/light.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=536eade682636e84231afce2577f9509)![dark logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/dark.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=0766b3221061e80143e9f300733e640b)](/docs)

![US](https://d3gk2c5xim1je2.cloudfront.net/flags/US.svg)

English

Search...

⌘K

*   [Claude Developer Platform](https://platform.claude.com/)
*   [Claude Code on the Web](https://claude.ai/code)
*   [

    Claude Code on the Web

    ](https://claude.ai/code)

Search...

Navigation

Build with Claude Code

Plugins

[Getting started

](/docs/en/overview)[Build with Claude Code

](/docs/en/sub-agents)[Deployment

](/docs/en/third-party-integrations)[Administration

](/docs/en/setup)[Configuration

](/docs/en/settings)[Reference

](/docs/en/cli-reference)[Resources

](/docs/en/legal-and-compliance)

##### Build with Claude Code


*   [

    Subagents

    ](/docs/en/sub-agents)
*   [

    Plugins

    ](/docs/en/plugins)
*   [

    Agent Skills

    ](/docs/en/skills)
*   [

    Output styles

    ](/docs/en/output-styles)
*   [

    Hooks

    ](/docs/en/hooks-guide)
*   [

    Headless mode

    ](/docs/en/headless)
*   [

    Model Context Protocol (MCP)

    ](/docs/en/mcp)
*   [

    Migrate to Claude Agent SDK

    ](/docs/en/sdk/migration-guide)
*   [

    Troubleshooting

    ](/docs/en/troubleshooting)

On this page

*   [Quickstart](#quickstart)
*   [Prerequisites](#prerequisites)
*   [Create your first plugin](#create-your-first-plugin)
*   [Plugin structure overview](#plugin-structure-overview)
*   [Install and manage plugins](#install-and-manage-plugins)
*   [Prerequisites](#prerequisites-2)
*   [Add marketplaces](#add-marketplaces)
*   [Install plugins](#install-plugins)
*   [Via interactive menu (recommended for discovery)](#via-interactive-menu-recommended-for-discovery)
*   [Via direct commands (for quick installation)](#via-direct-commands-for-quick-installation)
*   [Verify installation](#verify-installation)
*   [Set up team plugin workflows](#set-up-team-plugin-workflows)
*   [Develop more complex plugins](#develop-more-complex-plugins)
*   [Add Skills to your plugin](#add-skills-to-your-plugin)
*   [Organize complex plugins](#organize-complex-plugins)
*   [Test your plugins locally](#test-your-plugins-locally)
*   [Debug plugin issues](#debug-plugin-issues)
*   [Share your plugins](#share-your-plugins)
*   [Next steps](#next-steps)
*   [For plugin users](#for-plugin-users)
*   [For plugin developers](#for-plugin-developers)
*   [For team leads and administrators](#for-team-leads-and-administrators)
*   [See also](#see-also)

Build with Claude Code

# Plugins


Copy page

Extend Claude Code with custom commands, agents, hooks, Skills, and MCP servers through the plugin system.

Copy page

For complete technical specifications and schemas, see [Plugins reference](/docs/en/plugins-reference). For marketplace management, see [Plugin marketplaces](/docs/en/plugin-marketplaces).

Plugins let you extend Claude Code with custom functionality that can be shared across projects and teams. Install plugins from [marketplaces](/docs/en/plugin-marketplaces) to add pre-built commands, agents, hooks, Skills, and MCP servers, or create your own to automate your workflows.

##

[​


](#quickstart)

Quickstart

Let’s create a simple greeting plugin to get you familiar with the plugin system. We’ll build a working plugin that adds a custom command, test it locally, and understand the core concepts.

###

[​


](#prerequisites)

Prerequisites

*   Claude Code installed on your machine
*   Basic familiarity with command-line tools

###

[​


](#create-your-first-plugin)

Create your first plugin

1

Create the marketplace structure

Report incorrect code

Copy

Ask AI
```
mkdir test-marketplace
cd test-marketplace
```
2

Create the plugin directory

Report incorrect code

Copy

Ask AI
```
mkdir my-first-plugin
cd my-first-plugin
```
3

Create the plugin manifest

Create .claude-plugin/plugin.json

Report incorrect code

Copy

Ask AI
```
mkdir .claude-plugin
cat > .claude-plugin/plugin.json << 'EOF'
{
"name": "my-first-plugin",
"description": "A simple greeting plugin to learn the basics",
"version": "1.0.0",
"author": {
"name": "Your Name"
}
}
EOF
```
4

Add a custom command

Create commands/hello.md

Report incorrect code

Copy

Ask AI
```
mkdir commands
cat > commands/hello.md << 'EOF'
---
description: Greet the user with a personalized message
---

# Hello Command


Greet the user warmly and ask how you can help them today. Make the greeting personal and encouraging.
EOF
```
5

Create the marketplace manifest

Create marketplace.json

Report incorrect code

Copy

Ask AI
```
cd ..
mkdir .claude-plugin
cat > .claude-plugin/marketplace.json << 'EOF'
{
"name": "test-marketplace",
"owner": {
"name": "Test User"
},
"plugins": [
{
  "name": "my-first-plugin",
  "source": "./my-first-plugin",
  "description": "My first test plugin"
}
]
}
EOF
```
6

Install and test your plugin

Start Claude Code from parent directory

Report incorrect code

Copy

Ask AI
```
cd ..
claude
```
Add the test marketplace

Report incorrect code

Copy

Ask AI
```
/plugin marketplace add ./test-marketplace
```
Install your plugin

Report incorrect code

Copy

Ask AI
```
/plugin install my-first-plugin@test-marketplace
```
Select “Install now”. You’ll then need to restart Claude Code in order to use the new plugin.

Try your new command

Report incorrect code

Copy

Ask AI
```
/hello
```
You’ll see Claude use your greeting command! Check `/help` to see your new command listed.

You’ve successfully created and tested a plugin with these key components:

*   **Plugin manifest** (`.claude-plugin/plugin.json`) - Describes your plugin’s metadata
*   **Commands directory** (`commands/`) - Contains your custom slash commands
*   **Test marketplace** - Allows you to test your plugin locally

###

[​


](#plugin-structure-overview)

Plugin structure overview

Your plugin follows this basic structure:

Report incorrect code

Copy

Ask AI
```
my-first-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/                 # Custom slash commands (optional)
│   └── hello.md
├── agents/                   # Custom agents (optional)
│   └── helper.md
├── skills/                   # Agent Skills (optional)
│   └── my-skill/
│       └── SKILL.md
└── hooks/                    # Event handlers (optional)
    └── hooks.json
```
**Additional components you can add:**

*   **Commands**: Create markdown files in `commands/` directory
*   **Agents**: Create agent definitions in `agents/` directory
*   **Skills**: Create `SKILL.md` files in `skills/` directory
*   **Hooks**: Create `hooks/hooks.json` for event handling
*   **MCP servers**: Create `.mcp.json` for external tool integration

**Next steps**: Ready to add more features? Jump to [Develop more complex plugins](#develop-more-complex-plugins) to add agents, hooks, and MCP servers. For complete technical specifications of all plugin components, see [Plugins reference](/docs/en/plugins-reference).

* * *

##

[​


](#install-and-manage-plugins)

Install and manage plugins

Learn how to discover, install, and manage plugins to extend your Claude Code capabilities.

###

[​


](#prerequisites-2)

Prerequisites

*   Claude Code installed and running
*   Basic familiarity with command-line interfaces

###

[​


](#add-marketplaces)

Add marketplaces

Marketplaces are catalogs of available plugins. Add them to discover and install plugins:

Add a marketplace

Report incorrect code

Copy

Ask AI
```
/plugin marketplace add your-org/claude-plugins
```
Browse available plugins

Report incorrect code

Copy

Ask AI
```
/plugin
```
For detailed marketplace management including Git repositories, local development, and team distribution, see [Plugin marketplaces](/docs/en/plugin-marketplaces).

###

[​


](#install-plugins)

Install plugins

####

[​


](#via-interactive-menu-recommended-for-discovery)

Via interactive menu (recommended for discovery)

Open the plugin management interface

Report incorrect code

Copy

Ask AI
```
/plugin
```
Select “Browse Plugins” to see available options with descriptions, features, and installation options.

####

[​


](#via-direct-commands-for-quick-installation)

Via direct commands (for quick installation)

Install a specific plugin

Report incorrect code

Copy

Ask AI
```
/plugin install formatter@your-org
```
Enable a disabled plugin

Report incorrect code

Copy

Ask AI
```
/plugin enable plugin-name@marketplace-name
```
Disable without uninstalling

Report incorrect code

Copy

Ask AI
```
/plugin disable plugin-name@marketplace-name
```
Completely remove a plugin

Report incorrect code

Copy

Ask AI
```
/plugin uninstall plugin-name@marketplace-name
```

###

[​


](#verify-installation)

Verify installation

After installing a plugin:

1.  **Check available commands**: Run `/help` to see new commands
2.  **Test plugin features**: Try the plugin’s commands and features
3.  **Review plugin details**: Use `/plugin` → “Manage Plugins” to see what the plugin provides

##

[​


](#set-up-team-plugin-workflows)

Set up team plugin workflows

Configure plugins at the repository level to ensure consistent tooling across your team. When team members trust your repository folder, Claude Code automatically installs specified marketplaces and plugins. **To set up team plugins:**

1.  Add marketplace and plugin configuration to your repository’s `.claude/settings.json`
2.  Team members trust the repository folder
3.  Plugins install automatically for all team members

For complete instructions including configuration examples, marketplace setup, and rollout best practices, see [Configure team marketplaces](/docs/en/plugin-marketplaces#how-to-configure-team-marketplaces).

* * *

##

[​


](#develop-more-complex-plugins)

Develop more complex plugins

Once you’re comfortable with basic plugins, you can create more sophisticated extensions.

###

[​


](#add-skills-to-your-plugin)

Add Skills to your plugin

Plugins can include [Agent Skills](/docs/en/skills) to extend Claude’s capabilities. Skills are model-invoked—Claude autonomously uses them based on the task context. To add Skills to your plugin, create a `skills/` directory at your plugin root and add Skill folders with `SKILL.md` files. Plugin Skills are automatically available when the plugin is installed. For complete Skill authoring guidance, see [Agent Skills](/docs/en/skills).

###

[​


](#organize-complex-plugins)

Organize complex plugins

For plugins with many components, organize your directory structure by functionality. For complete directory layouts and organization patterns, see [Plugin directory structure](/docs/en/plugins-reference#plugin-directory-structure).

###

[​


](#test-your-plugins-locally)

Test your plugins locally

When developing plugins, use a local marketplace to test changes iteratively. This workflow builds on the quickstart pattern and works for plugins of any complexity.

1

Set up your development structure

Organize your plugin and marketplace for testing:

Create directory structure

Report incorrect code

Copy

Ask AI
```
mkdir dev-marketplace
cd dev-marketplace
mkdir my-plugin
```
This creates:

Report incorrect code

Copy

Ask AI
```
dev-marketplace/
├── .claude-plugin/marketplace.json  (you'll create this)
└── my-plugin/                        (your plugin under development)
    ├── .claude-plugin/plugin.json
    ├── commands/
    ├── agents/
    └── hooks/
```
2

Create the marketplace manifest

Create marketplace.json

Report incorrect code

Copy

Ask AI
```
mkdir .claude-plugin
cat > .claude-plugin/marketplace.json << 'EOF'
{
"name": "dev-marketplace",
"owner": {
"name": "Developer"
},
"plugins": [
{
  "name": "my-plugin",
  "source": "./my-plugin",
  "description": "Plugin under development"
}
]
}
EOF
```
3

Install and test

Start Claude Code from parent directory

Report incorrect code

Copy

Ask AI
```
cd ..
claude
```
Add your development marketplace

Report incorrect code

Copy

Ask AI
```
/plugin marketplace add ./dev-marketplace
```
Install your plugin

Report incorrect code

Copy

Ask AI
```
/plugin install my-plugin@dev-marketplace
```
Test your plugin components:

*   Try your commands with `/command-name`
*   Check that agents appear in `/agents`
*   Verify hooks work as expected

4

Iterate on your plugin

After making changes to your plugin code:

Uninstall the current version

Report incorrect code

Copy

Ask AI
```
/plugin uninstall my-plugin@dev-marketplace
```
Reinstall to test changes

Report incorrect code

Copy

Ask AI
```
/plugin install my-plugin@dev-marketplace
```
Repeat this cycle as you develop and refine your plugin.

**For multiple plugins**: Organize plugins in subdirectories like `./plugins/plugin-name` and update your marketplace.json accordingly. See [Plugin sources](/docs/en/plugin-marketplaces#plugin-sources) for organization patterns.

###

[​


](#debug-plugin-issues)

Debug plugin issues

If your plugin isn’t working as expected:

1.  **Check the structure**: Ensure your directories are at the plugin root, not inside `.claude-plugin/`
2.  **Test components individually**: Check each command, agent, and hook separately
3.  **Use validation and debugging tools**: See [Debugging and development tools](/docs/en/plugins-reference#debugging-and-development-tools) for CLI commands and troubleshooting techniques

###

[​


](#share-your-plugins)

Share your plugins

When your plugin is ready to share:

1.  **Add documentation**: Include a README.md with installation and usage instructions
2.  **Version your plugin**: Use semantic versioning in your `plugin.json`
3.  **Create or use a marketplace**: Distribute through plugin marketplaces for installation
4.  **Test with others**: Have team members test the plugin before wider distribution

For complete technical specifications, debugging techniques, and distribution strategies, see [Plugins reference](/docs/en/plugins-reference).

* * *

##

[​


](#next-steps)

Next steps

Now that you understand Claude Code’s plugin system, here are suggested paths for different goals:

###

[​


](#for-plugin-users)

For plugin users

*   **Discover plugins**: Browse community marketplaces for useful tools
*   **Team adoption**: Set up repository-level plugins for your projects
*   **Marketplace management**: Learn to manage multiple plugin sources
*   **Advanced usage**: Explore plugin combinations and workflows

###

[​


](#for-plugin-developers)

For plugin developers

*   **Create your first marketplace**: [Plugin marketplaces guide](/docs/en/plugin-marketplaces)
*   **Advanced components**: Dive deeper into specific plugin components:
    *   [Slash commands](/docs/en/slash-commands) - Command development details
    *   [Subagents](/docs/en/sub-agents) - Agent configuration and capabilities
    *   [Agent Skills](/docs/en/skills) - Extend Claude’s capabilities
    *   [Hooks](/docs/en/hooks) - Event handling and automation
    *   [MCP](/docs/en/mcp) - External tool integration
*   **Distribution strategies**: Package and share your plugins effectively
*   **Community contribution**: Consider contributing to community plugin collections

###

[​


](#for-team-leads-and-administrators)

For team leads and administrators

*   **Repository configuration**: Set up automatic plugin installation for team projects
*   **Plugin governance**: Establish guidelines for plugin approval and security review
*   **Marketplace maintenance**: Create and maintain organization-specific plugin catalogs
*   **Training and documentation**: Help team members adopt plugin workflows effectively

##

[​


](#see-also)

See also

*   [Plugin marketplaces](/docs/en/plugin-marketplaces) - Creating and managing plugin catalogs
*   [Slash commands](/docs/en/slash-commands) - Understanding custom commands
*   [Subagents](/docs/en/sub-agents) - Creating and using specialized agents
*   [Agent Skills](/docs/en/skills) - Extend Claude’s capabilities
*   [Hooks](/docs/en/hooks) - Automating workflows with event handlers
*   [MCP](/docs/en/mcp) - Connecting to external tools and services
*   [Settings](/docs/en/settings) - Configuration options for plugins

Was this page helpful?

YesNo

[Subagents](/docs/en/sub-agents)[Agent Skills](/docs/en/skills)

⌘I

[Claude Code Docs home page![light logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/light.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=536eade682636e84231afce2577f9509)![dark logo](https://mintcdn.com/claude-code/o69F7a6qoW9vboof/logo/dark.svg?fit=max&auto=format&n=o69F7a6qoW9vboof&q=85&s=0766b3221061e80143e9f300733e640b)](/docs)

[x](https://x.com/AnthropicAI)[linkedin](https://www.linkedin.com/company/anthropicresearch)

Company

[Anthropic](https://www.anthropic.com/company)[Careers](https://www.anthropic.com/careers)[Economic Futures](https://www.anthropic.com/economic-futures)[Research](https://www.anthropic.com/research)[News](https://www.anthropic.com/news)[Trust center](https://trust.anthropic.com/)[Transparency](https://www.anthropic.com/transparency)

Help and security

[Availability](https://www.anthropic.com/supported-countries)[Status](https://status.anthropic.com/)[Support center](https://support.claude.com/)

Learn

[Courses](https://www.anthropic.com/learn)[MCP connectors](https://claude.com/partners/mcp)[Customer stories](https://www.claude.com/customers)[Engineering blog](https://www.anthropic.com/engineering)[Events](https://www.anthropic.com/events)[Powered by Claude](https://claude.com/partners/powered-by-claude)[Service partners](https://claude.com/partners/services)[Startups program](https://claude.com/programs/startups)

Terms and policies

[Privacy policy](https://www.anthropic.com/legal/privacy)[Disclosure policy](https://www.anthropic.com/responsible-disclosure-policy)[Usage policy](https://www.anthropic.com/legal/aup)[Commercial terms](https://www.anthropic.com/legal/commercial-terms)[Consumer terms](https://www.anthropic.com/legal/consumer-terms)