Claude Code settings - Claude Code Docs

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

Configuration

Claude Code settings

[Getting started

](/docs/en/overview)[Build with Claude Code

](/docs/en/sub-agents)[Deployment

](/docs/en/third-party-integrations)[Administration

](/docs/en/setup)[Configuration

](/docs/en/settings)[Reference

](/docs/en/cli-reference)[Resources

](/docs/en/legal-and-compliance)

##### Configuration


*   [

    Settings

    ](/docs/en/settings)
*   [

    Terminal configuration

    ](/docs/en/terminal-config)
*   [

    Model configuration

    ](/docs/en/model-config)
*   [

    Memory management

    ](/docs/en/memory)
*   [

    Status line configuration

    ](/docs/en/statusline)

On this page

*   [Settings files](#settings-files)
*   [Available settings](#available-settings)
*   [Permission settings](#permission-settings)
*   [Sandbox settings](#sandbox-settings)
*   [Attribution settings](#attribution-settings)
*   [Settings precedence](#settings-precedence)
*   [Key points about the configuration system](#key-points-about-the-configuration-system)
*   [System prompt](#system-prompt)
*   [Excluding sensitive files](#excluding-sensitive-files)
*   [Subagent configuration](#subagent-configuration)
*   [Plugin configuration](#plugin-configuration)
*   [Plugin settings](#plugin-settings)
*   [enabledPlugins](#enabledplugins)
*   [extraKnownMarketplaces](#extraknownmarketplaces)
*   [Managing plugins](#managing-plugins)
*   [Environment variables](#environment-variables)
*   [Tools available to Claude](#tools-available-to-claude)
*   [Bash tool behavior](#bash-tool-behavior)
*   [Extending tools with hooks](#extending-tools-with-hooks)
*   [See also](#see-also)

Configuration

# Claude Code settings


Copy page

Configure Claude Code with global and project-level settings, and environment variables.

Copy page

Claude Code offers a variety of settings to configure its behavior to meet your needs. You can configure Claude Code by running the `/config` command when using the interactive REPL, which opens a tabbed Settings interface where you can view status information and modify configuration options.

##

[​


](#settings-files)

Settings files

The `settings.json` file is our official mechanism for configuring Claude Code through hierarchical settings:

*   **User settings** are defined in `~/.claude/settings.json` and apply to all projects.
*   **Project settings** are saved in your project directory:
    *   `.claude/settings.json` for settings that are checked into source control and shared with your team
    *   `.claude/settings.local.json` for settings that are not checked in, useful for personal preferences and experimentation. Claude Code will configure git to ignore `.claude/settings.local.json` when it is created.
*   For enterprise deployments of Claude Code, we also support **enterprise managed policy settings**. These take precedence over user and project settings. System administrators can deploy policies to:
    *   macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`
    *   Linux and WSL: `/etc/claude-code/managed-settings.json`
    *   Windows: `C:\Program Files\ClaudeCode\managed-settings.json`
        *   `C:\ProgramData\ClaudeCode\managed-settings.json` will be deprecated in a future version.
*   Enterprise deployments can also configure **managed MCP servers** that override user-configured servers. See [Enterprise MCP configuration](/docs/en/mcp#enterprise-mcp-configuration):
    *   macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
    *   Linux and WSL: `/etc/claude-code/managed-mcp.json`
    *   Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`
        *   `C:\ProgramData\ClaudeCode\managed-mcp.json` will be deprecated in a future version.
*   **Other configuration** is stored in `~/.claude.json`. This file contains your preferences (theme, notification settings, editor mode), OAuth session, [MCP server](/docs/en/mcp) configurations for user and local scopes, per-project state (allowed tools, trust settings), and various caches. Project-scoped MCP servers are stored separately in `.mcp.json`.

Example settings.json

Report incorrect code

Copy

Ask AI
```
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test:*)",
      "Read(~/.zshrc)"
    ],
    "deny": [
      "Bash(curl:*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  },
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp"
  },
  "companyAnnouncements": [
    "Welcome to Acme Corp! Review our code guidelines at docs.acme.com",
    "Reminder: Code reviews required for all PRs",
    "New security policy in effect"
  ]
}
```

###

[​


](#available-settings)

Available settings

`settings.json` supports a number of options:

Key

Description

Example

`apiKeyHelper`

Custom script, to be executed in `/bin/sh`, to generate an auth value. This value will be sent as `X-Api-Key` and `Authorization: Bearer` headers for model requests

`/bin/generate_temp_api_key.sh`

`cleanupPeriodDays`

Sessions inactive for longer than this period are deleted at startup. Setting to `0` immediately deletes all sessions. (default: 30 days)

`20`

`companyAnnouncements`

Announcement to display to users at startup. If multiple announcements are provided, they will be cycled through at random.

`["Welcome to Acme Corp! Review our code guidelines at docs.acme.com"]`

`env`

Environment variables that will be applied to every session

`{"FOO": "bar"}`

`attribution`

Customize attribution for git commits and pull requests. See [Attribution settings](#attribution-settings)

`{"commit": "🤖 Generated with Claude Code", "pr": ""}`

`includeCoAuthoredBy`

**Deprecated**: Use `attribution` instead. Whether to include the `co-authored-by Claude` byline in git commits and pull requests (default: `true`)

`false`

`permissions`

See table below for structure of permissions.

`hooks`

Configure custom commands to run before or after tool executions. See [hooks documentation](/docs/en/hooks)

`{"PreToolUse": {"Bash": "echo 'Running command...'"}}`

`disableAllHooks`

Disable all [hooks](/docs/en/hooks)

`true`

`model`

Override the default model to use for Claude Code

`"claude-sonnet-4-5-20250929"`

`statusLine`

Configure a custom status line to display context. See [`statusLine` documentation](/docs/en/statusline)

`{"type": "command", "command": "~/.claude/statusline.sh"}`

`outputStyle`

Configure an output style to adjust the system prompt. See [output styles documentation](/docs/en/output-styles)

`"Explanatory"`

`forceLoginMethod`

Use `claudeai` to restrict login to Claude.ai accounts, `console` to restrict login to Claude Console (API usage billing) accounts

`claudeai`

`forceLoginOrgUUID`

Specify the UUID of an organization to automatically select it during login, bypassing the organization selection step. Requires `forceLoginMethod` to be set

`"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`

`enableAllProjectMcpServers`

Automatically approve all MCP servers defined in project `.mcp.json` files

`true`

`enabledMcpjsonServers`

List of specific MCP servers from `.mcp.json` files to approve

`["memory", "github"]`

`disabledMcpjsonServers`

List of specific MCP servers from `.mcp.json` files to reject

`["filesystem"]`

`allowedMcpServers`

When set in managed-settings.json, allowlist of MCP servers users can configure. Undefined = no restrictions, empty array = lockdown. Applies to all scopes. Denylist takes precedence. See [Enterprise MCP configuration](/docs/en/mcp#enterprise-mcp-configuration)

`[{ "serverName": "github" }]`

`deniedMcpServers`

When set in managed-settings.json, denylist of MCP servers that are explicitly blocked. Applies to all scopes including enterprise servers. Denylist takes precedence over allowlist. See [Enterprise MCP configuration](/docs/en/mcp#enterprise-mcp-configuration)

`[{ "serverName": "filesystem" }]`

`awsAuthRefresh`

Custom script that modifies the `.aws` directory (see [advanced credential configuration](/docs/en/amazon-bedrock#advanced-credential-configuration))

`aws sso login --profile myprofile`

`awsCredentialExport`

Custom script that outputs JSON with AWS credentials (see [advanced credential configuration](/docs/en/amazon-bedrock#advanced-credential-configuration))

`/bin/generate_aws_grant.sh`

`alwaysThinkingEnabled`

Enable [extended thinking](/docs/en/common-workflows#use-extended-thinking) by default for all sessions. Typically configured via the `/config` command rather than editing directly

`true`

###

[​


](#permission-settings)

Permission settings

Keys

Description

Example

`allow`

Array of [permission rules](/docs/en/iam#configuring-permissions) to allow tool use. **Note:** Bash rules use prefix matching, not regex

`[ "Bash(git diff:*)" ]`

`ask`

Array of [permission rules](/docs/en/iam#configuring-permissions) to ask for confirmation upon tool use.

`[ "Bash(git push:*)" ]`

`deny`

Array of [permission rules](/docs/en/iam#configuring-permissions) to deny tool use. Use this to also exclude sensitive files from Claude Code access. **Note:** Bash patterns are prefix matches and can be bypassed (see [Bash permission limitations](/docs/en/iam#tool-specific-permission-rules))

`[ "WebFetch", "Bash(curl:*)", "Read(./.env)", "Read(./secrets/**)" ]`

`additionalDirectories`

Additional [working directories](/docs/en/iam#working-directories) that Claude has access to

`[ "../docs/" ]`

`defaultMode`

Default [permission mode](/docs/en/iam#permission-modes) when opening Claude Code

`"acceptEdits"`

`disableBypassPermissionsMode`

Set to `"disable"` to prevent `bypassPermissions` mode from being activated. This disables the `--dangerously-skip-permissions` command-line flag. See [managed policy settings](/docs/en/iam#enterprise-managed-policy-settings)

`"disable"`

###

[​


](#sandbox-settings)

Sandbox settings

Configure advanced sandboxing behavior. Sandboxing isolates bash commands from your filesystem and network. See [Sandboxing](/docs/en/sandboxing) for details. **Filesystem and network restrictions** are configured via Read, Edit, and WebFetch permission rules, not via these sandbox settings.

Keys

Description

Example

`enabled`

Enable bash sandboxing (macOS/Linux only). Default: false

`true`

`autoAllowBashIfSandboxed`

Auto-approve bash commands when sandboxed. Default: true

`true`

`excludedCommands`

Commands that should run outside of the sandbox

`["git", "docker"]`

`allowUnsandboxedCommands`

Allow commands to run outside the sandbox via the `dangerouslyDisableSandbox` parameter. When set to `false`, the `dangerouslyDisableSandbox` escape hatch is completely disabled and all commands must run sandboxed (or be in `excludedCommands`). Useful for enterprise policies that require strict sandboxing. Default: true

`false`

`network.allowUnixSockets`

Unix socket paths accessible in sandbox (for SSH agents, etc.)

`["~/.ssh/agent-socket"]`

`network.allowLocalBinding`

Allow binding to localhost ports (macOS only). Default: false

`true`

`network.httpProxyPort`

HTTP proxy port used if you wish to bring your own proxy. If not specified, Claude will run its own proxy.

`8080`

`network.socksProxyPort`

SOCKS5 proxy port used if you wish to bring your own proxy. If not specified, Claude will run its own proxy.

`8081`

`enableWeakerNestedSandbox`

Enable weaker sandbox for unprivileged Docker environments (Linux only). **Reduces security.** Default: false

`true`

**Configuration example:**

Report incorrect code

Copy

Ask AI
```
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker"],
    "network": {
      "allowUnixSockets": [
        "/var/run/docker.sock"
      ],
      "allowLocalBinding": true
    }
  },
  "permissions": {
    "deny": [
      "Read(.envrc)",
      "Read(~/.aws/**)"
    ]
  }
}
```
**Filesystem and network restrictions** use standard permission rules:

*   Use `Read` deny rules to block Claude from reading specific files or directories
*   Use `Edit` allow rules to let Claude write to directories beyond the current working directory
*   Use `Edit` deny rules to block writes to specific paths
*   Use `WebFetch` allow/deny rules to control which network domains Claude can access

###

[​


](#attribution-settings)

Attribution settings

Claude Code adds attribution to git commits and pull requests. These are configured separately:

*   Commits use [git trailers](https://git-scm.com/docs/git-interpret-trailers) (like `Co-Authored-By`) by default, which can be customized or disabled
*   Pull request descriptions are plain text

Keys

Description

`commit`

Attribution for git commits, including any trailers. Empty string hides commit attribution

`pr`

Attribution for pull request descriptions. Empty string hides pull request attribution

**Default commit attribution:**

Report incorrect code

Copy

Ask AI
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <[email protected]>
```
**Default pull request attribution:**

Report incorrect code

Copy

Ask AI
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
**Example:**

Report incorrect code

Copy

Ask AI
```
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <[email protected]>",
    "pr": ""
  }
}
```
The `attribution` setting takes precedence over the deprecated `includeCoAuthoredBy` setting. To hide all attribution, set `commit` and `pr` to empty strings.

###

[​


](#settings-precedence)

Settings precedence

Settings apply in order of precedence. From highest to lowest:

1.  **Enterprise managed policies** (`managed-settings.json`)
    *   Deployed by IT/DevOps
    *   Can’t be overridden
2.  **Command line arguments**
    *   Temporary overrides for a specific session
3.  **Local project settings** (`.claude/settings.local.json`)
    *   Personal project-specific settings
4.  **Shared project settings** (`.claude/settings.json`)
    *   Team-shared project settings in source control
5.  **User settings** (`~/.claude/settings.json`)
    *   Personal global settings

This hierarchy ensures that enterprise security policies are always enforced while still allowing teams and individuals to customize their experience. For example, if your user settings allow `Bash(npm run:*)` but a project’s shared settings deny it, the project setting takes precedence and the command is blocked.

###

[​


](#key-points-about-the-configuration-system)

Key points about the configuration system

*   **Memory files (`CLAUDE.md`)**: Contain instructions and context that Claude loads at startup
*   **Settings files (JSON)**: Configure permissions, environment variables, and tool behavior
*   **Slash commands**: Custom commands that can be invoked during a session with `/command-name`
*   **MCP servers**: Extend Claude Code with additional tools and integrations
*   **Precedence**: Higher-level configurations (Enterprise) override lower-level ones (User/Project)
*   **Inheritance**: Settings are merged, with more specific settings adding to or overriding broader ones

###

[​


](#system-prompt)

System prompt

Claude Code’s internal system prompt is not published. To add custom instructions, use `CLAUDE.md` files or the `--append-system-prompt` flag.

###

[​


](#excluding-sensitive-files)

Excluding sensitive files

To prevent Claude Code from accessing files containing sensitive information like API keys, secrets, and environment files, use the `permissions.deny` setting in your `.claude/settings.json` file:

Report incorrect code

Copy

Ask AI
```
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)",
      "Read(./build)"
    ]
  }
}
```
This replaces the deprecated `ignorePatterns` configuration. Files matching these patterns will be completely invisible to Claude Code, preventing any accidental exposure of sensitive data.

##

[​


](#subagent-configuration)

Subagent configuration

Claude Code supports custom AI subagents that can be configured at both user and project levels. These subagents are stored as Markdown files with YAML frontmatter:

*   **User subagents**: `~/.claude/agents/` - Available across all your projects
*   **Project subagents**: `.claude/agents/` - Specific to your project and can be shared with your team

Subagent files define specialized AI assistants with custom prompts and tool permissions. Learn more about creating and using subagents in the [subagents documentation](/docs/en/sub-agents).

##

[​


](#plugin-configuration)

Plugin configuration

Claude Code supports a plugin system that lets you extend functionality with custom commands, agents, hooks, and MCP servers. Plugins are distributed through marketplaces and can be configured at both user and repository levels.

###

[​


](#plugin-settings)

Plugin settings

Plugin-related settings in `settings.json`:

Report incorrect code

Copy

Ask AI
```
{
  "enabledPlugins": {
    "formatter@company-tools": true,
    "deployer@company-tools": true,
    "analyzer@security-plugins": false
  },
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": "github",
      "repo": "company/claude-plugins"
    }
  }
}
```

####

[​


](#enabledplugins)

`enabledPlugins`

Controls which plugins are enabled. Format: `"plugin-name@marketplace-name": true/false` **Scopes**:

*   **User settings** (`~/.claude/settings.json`): Personal plugin preferences
*   **Project settings** (`.claude/settings.json`): Project-specific plugins shared with team
*   **Local settings** (`.claude/settings.local.json`): Per-machine overrides (not committed)

**Example**:

Report incorrect code

Copy

Ask AI
```
{
  "enabledPlugins": {
    "code-formatter@team-tools": true,
    "deployment-tools@team-tools": true,
    "experimental-features@personal": false
  }
}
```

####

[​


](#extraknownmarketplaces)

`extraKnownMarketplaces`

Defines additional marketplaces that should be made available for the repository. Typically used in repository-level settings to ensure team members have access to required plugin sources. **When a repository includes `extraKnownMarketplaces`**:

1.  Team members are prompted to install the marketplace when they trust the folder
2.  Team members are then prompted to install plugins from that marketplace
3.  Users can skip unwanted marketplaces or plugins (stored in user settings)
4.  Installation respects trust boundaries and requires explicit consent

**Example**:

Report incorrect code

Copy

Ask AI
```
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "company-org/claude-plugins"
      }
    },
    "security-plugins": {
      "source": {
        "source": "git",
        "url": "https://git.company.com/security/plugins.git"
      }
    }
  }
}
```
**Marketplace source types**:

*   `github`: GitHub repository (uses `repo`)
*   `git`: Any git URL (uses `url`)
*   `directory`: Local filesystem path (uses `path`, for development only)

###

[​


](#managing-plugins)

Managing plugins

Use the `/plugin` command to manage plugins interactively:

*   Browse available plugins from marketplaces
*   Install/uninstall plugins
*   Enable/disable plugins
*   View plugin details (commands, agents, hooks provided)
*   Add/remove marketplaces

Learn more about the plugin system in the [plugins documentation](/docs/en/plugins).

##

[​


](#environment-variables)

Environment variables

Claude Code supports the following environment variables to control its behavior:

All environment variables can also be configured in [`settings.json`](#available-settings). This is useful as a way to automatically set environment variables for each session, or to roll out a set of environment variables for your whole team or organization.

Variable

Purpose

`ANTHROPIC_API_KEY`

API key sent as `X-Api-Key` header, typically for the Claude SDK (for interactive usage, run `/login`)

`ANTHROPIC_AUTH_TOKEN`

Custom value for the `Authorization` header (the value you set here will be prefixed with `Bearer` )

`ANTHROPIC_CUSTOM_HEADERS`

Custom headers you want to add to the request (in `Name: Value` format)

`ANTHROPIC_DEFAULT_HAIKU_MODEL`

See [Model configuration](/docs/en/model-config#environment-variables)

`ANTHROPIC_DEFAULT_OPUS_MODEL`

See [Model configuration](/docs/en/model-config#environment-variables)

`ANTHROPIC_DEFAULT_SONNET_MODEL`

See [Model configuration](/docs/en/model-config#environment-variables)

`ANTHROPIC_FOUNDRY_API_KEY`

API key for Microsoft Foundry authentication (see [Microsoft Foundry](/docs/en/microsoft-foundry))

`ANTHROPIC_MODEL`

Name of the model setting to use (see [Model Configuration](/docs/en/model-config#environment-variables))

`ANTHROPIC_SMALL_FAST_MODEL`

\[DEPRECATED\] Name of [Haiku-class model for background tasks](/docs/en/costs)

`ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION`

Override AWS region for the Haiku-class model when using Bedrock

`AWS_BEARER_TOKEN_BEDROCK`

Bedrock API key for authentication (see [Bedrock API keys](https://aws.amazon.com/blogs/machine-learning/accelerate-ai-development-with-amazon-bedrock-api-keys/))

`BASH_DEFAULT_TIMEOUT_MS`

Default timeout for long-running bash commands

`BASH_MAX_OUTPUT_LENGTH`

Maximum number of characters in bash outputs before they are middle-truncated

`BASH_MAX_TIMEOUT_MS`

Maximum timeout the model can set for long-running bash commands

`CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR`

Return to the original working directory after each Bash command

`CLAUDE_CODE_API_KEY_HELPER_TTL_MS`

Interval in milliseconds at which credentials should be refreshed (when using `apiKeyHelper`)

`CLAUDE_CODE_CLIENT_CERT`

Path to client certificate file for mTLS authentication

`CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`

Passphrase for encrypted CLAUDE\_CODE\_CLIENT\_KEY (optional)

`CLAUDE_CODE_CLIENT_KEY`

Path to client private key file for mTLS authentication

`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`

Set to `1` to disable Anthropic API-specific `anthropic-beta` headers. Use this if experiencing issues like “Unexpected value(s) for the `anthropic-beta` header” when using an LLM gateway with third-party providers

`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`

Equivalent of setting `DISABLE_AUTOUPDATER`, `DISABLE_BUG_COMMAND`, `DISABLE_ERROR_REPORTING`, and `DISABLE_TELEMETRY`

`CLAUDE_CODE_DISABLE_TERMINAL_TITLE`

Set to `1` to disable automatic terminal title updates based on conversation context

`CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`

Skip auto-installation of IDE extensions

`CLAUDE_CODE_MAX_OUTPUT_TOKENS`

Set the maximum number of output tokens for most requests

`CLAUDE_CODE_SHELL_PREFIX`

Command prefix to wrap all bash commands (for example, for logging or auditing). Example: `/path/to/logger.sh` will execute `/path/to/logger.sh <command>`

`CLAUDE_CODE_SKIP_BEDROCK_AUTH`

Skip AWS authentication for Bedrock (for example, when using an LLM gateway)

`CLAUDE_CODE_SKIP_FOUNDRY_AUTH`

Skip Azure authentication for Microsoft Foundry (for example, when using an LLM gateway)

`CLAUDE_CODE_SKIP_VERTEX_AUTH`

Skip Google authentication for Vertex (for example, when using an LLM gateway)

`CLAUDE_CODE_SUBAGENT_MODEL`

See [Model configuration](/docs/en/model-config)

`CLAUDE_CODE_USE_BEDROCK`

Use [Bedrock](/docs/en/amazon-bedrock)

`CLAUDE_CODE_USE_FOUNDRY`

Use [Microsoft Foundry](/docs/en/microsoft-foundry)

`CLAUDE_CODE_USE_VERTEX`

Use [Vertex](/docs/en/google-vertex-ai)

`CLAUDE_CONFIG_DIR`

Customize where Claude Code stores its configuration and data files

`DISABLE_AUTOUPDATER`

Set to `1` to disable automatic updates.

`DISABLE_BUG_COMMAND`

Set to `1` to disable the `/bug` command

`DISABLE_COST_WARNINGS`

Set to `1` to disable cost warning messages

`DISABLE_ERROR_REPORTING`

Set to `1` to opt out of Sentry error reporting

`DISABLE_NON_ESSENTIAL_MODEL_CALLS`

Set to `1` to disable model calls for non-critical paths like flavor text

`DISABLE_PROMPT_CACHING`

Set to `1` to disable prompt caching for all models (takes precedence over per-model settings)

`DISABLE_PROMPT_CACHING_HAIKU`

Set to `1` to disable prompt caching for Haiku models

`DISABLE_PROMPT_CACHING_OPUS`

Set to `1` to disable prompt caching for Opus models

`DISABLE_PROMPT_CACHING_SONNET`

Set to `1` to disable prompt caching for Sonnet models

`DISABLE_TELEMETRY`

Set to `1` to opt out of Statsig telemetry (note that Statsig events do not include user data like code, file paths, or bash commands)

`HTTP_PROXY`

Specify HTTP proxy server for network connections

`HTTPS_PROXY`

Specify HTTPS proxy server for network connections

`MAX_MCP_OUTPUT_TOKENS`

Maximum number of tokens allowed in MCP tool responses. Claude Code displays a warning when output exceeds 10,000 tokens (default: 25000)

`MAX_THINKING_TOKENS`

Enable [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) and set the token budget for the thinking process. Extended thinking improves performance on complex reasoning and coding tasks but impacts [prompt caching efficiency](https://docs.claude.com/en/docs/build-with-claude/prompt-caching#caching-with-thinking-blocks). Disabled by default.

`MCP_TIMEOUT`

Timeout in milliseconds for MCP server startup

`MCP_TOOL_TIMEOUT`

Timeout in milliseconds for MCP tool execution

`NO_PROXY`

List of domains and IPs to which requests will be directly issued, bypassing proxy

`SLASH_COMMAND_TOOL_CHAR_BUDGET`

Maximum number of characters for slash command metadata shown to [SlashCommand tool](/docs/en/slash-commands#slashcommand-tool) (default: 15000)

`USE_BUILTIN_RIPGREP`

Set to `0` to use system-installed `rg` instead of `rg` included with Claude Code

`VERTEX_REGION_CLAUDE_3_5_HAIKU`

Override region for Claude 3.5 Haiku when using Vertex AI

`VERTEX_REGION_CLAUDE_3_7_SONNET`

Override region for Claude 3.7 Sonnet when using Vertex AI

`VERTEX_REGION_CLAUDE_4_0_OPUS`

Override region for Claude 4.0 Opus when using Vertex AI

`VERTEX_REGION_CLAUDE_4_0_SONNET`

Override region for Claude 4.0 Sonnet when using Vertex AI

`VERTEX_REGION_CLAUDE_4_1_OPUS`

Override region for Claude 4.1 Opus when using Vertex AI

##

[​


](#tools-available-to-claude)

Tools available to Claude

Claude Code has access to a set of powerful tools that help it understand and modify your codebase:

Tool

Description

Permission Required

**AskUserQuestion**

Asks the user multiple choice questions to gather information or clarify ambiguity

No

**Bash**

Executes shell commands in your environment (see [Bash tool behavior](#bash-tool-behavior) below)

Yes

**BashOutput**

Retrieves output from a background bash shell

No

**Edit**

Makes targeted edits to specific files

Yes

**ExitPlanMode**

Prompts the user to exit plan mode and start coding

Yes

**Glob**

Finds files based on pattern matching

No

**Grep**

Searches for patterns in file contents

No

**KillShell**

Kills a running background bash shell by its ID

No

**NotebookEdit**

Modifies Jupyter notebook cells

Yes

**Read**

Reads the contents of files

No

**Skill**

Executes a skill within the main conversation

Yes

**SlashCommand**

Runs a [custom slash command](/docs/en/slash-commands#slashcommand-tool)

Yes

**Task**

Runs a sub-agent to handle complex, multi-step tasks

No

**TodoWrite**

Creates and manages structured task lists

No

**WebFetch**

Fetches content from a specified URL

Yes

**WebSearch**

Performs web searches with domain filtering

Yes

**Write**

Creates or overwrites files

Yes

Permission rules can be configured using `/allowed-tools` or in [permission settings](/docs/en/settings#available-settings). Also see [Tool-specific permission rules](/docs/en/iam#tool-specific-permission-rules).

###

[​


](#bash-tool-behavior)

Bash tool behavior

The Bash tool executes shell commands with the following persistence behavior:

*   **Working directory persists**: When Claude changes the working directory (for example, `cd /path/to/dir`), subsequent Bash commands will execute in that directory. You can use `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` to reset to the project directory after each command.
*   **Environment variables do NOT persist**: Environment variables set in one Bash command (for example, `export MY_VAR=value`) are **not** available in subsequent Bash commands. Each Bash command runs in a fresh shell environment.

To make environment variables available in Bash commands, you have **three options**: **Option 1: Activate environment before starting Claude Code** (simplest approach) Activate your virtual environment in your terminal before launching Claude Code:

Report incorrect code

Copy

Ask AI
```
conda activate myenv

# or: source /path/to/venv/bin/activate

claude
```
This works for shell environments but environment variables set within Claude’s Bash commands will not persist between commands. **Option 2: Set CLAUDE\_ENV\_FILE before starting Claude Code** (persistent environment setup) Export the path to a shell script containing your environment setup:

Report incorrect code

Copy

Ask AI
```
export CLAUDE_ENV_FILE=/path/to/env-setup.sh
claude
```
Where `/path/to/env-setup.sh` contains:

Report incorrect code

Copy

Ask AI
```
conda activate myenv

# or: source /path/to/venv/bin/activate

# or: export MY_VAR=value

```
Claude Code will source this file before each Bash command, making the environment persistent across all commands. **Option 3: Use a SessionStart hook** (project-specific configuration) Configure in `.claude/settings.json`:

Report incorrect code

Copy

Ask AI
```
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup",
      "hooks": [{
        "type": "command",
        "command": "echo 'conda activate myenv' >> \"$CLAUDE_ENV_FILE\""
      }]
    }]
  }
}
```
The hook writes to `$CLAUDE_ENV_FILE`, which is then sourced before each Bash command. This is ideal for team-shared project configurations. See [SessionStart hooks](/docs/en/hooks#persisting-environment-variables) for more details on Option 3.

###

[​


](#extending-tools-with-hooks)

Extending tools with hooks

You can run custom commands before or after any tool executes using [Claude Code hooks](/docs/en/hooks-guide). For example, you could automatically run a Python formatter after Claude modifies Python files, or prevent modifications to production configuration files by blocking Write operations to certain paths.

##

[​


](#see-also)

See also

*   [Identity and Access Management](/docs/en/iam#configuring-permissions) - Learn about Claude Code’s permission system
*   [IAM and access control](/docs/en/iam#enterprise-managed-policy-settings) - Enterprise policy management
*   [Troubleshooting](/docs/en/troubleshooting#auto-updater-issues) - Solutions for common configuration issues

Was this page helpful?

YesNo

[Terminal configuration](/docs/en/terminal-config)

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