CLI reference - Claude Code Docs

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

Reference

CLI reference

[Getting started

](/docs/en/overview)[Build with Claude Code

](/docs/en/sub-agents)[Deployment

](/docs/en/third-party-integrations)[Administration

](/docs/en/setup)[Configuration

](/docs/en/settings)[Reference

](/docs/en/cli-reference)[Resources

](/docs/en/legal-and-compliance)

##### Reference


*   [

    CLI reference

    ](/docs/en/cli-reference)
*   [

    Interactive mode

    ](/docs/en/interactive-mode)
*   [

    Slash commands

    ](/docs/en/slash-commands)
*   [

    Checkpointing

    ](/docs/en/checkpointing)
*   [

    Hooks reference

    ](/docs/en/hooks)
*   [

    Plugins reference

    ](/docs/en/plugins-reference)

On this page

*   [CLI commands](#cli-commands)
*   [CLI flags](#cli-flags)
*   [Agents flag format](#agents-flag-format)
*   [System prompt flags](#system-prompt-flags)
*   [See also](#see-also)

Reference

# CLI reference


Copy page

Complete reference for Claude Code command-line interface, including commands and flags.

Copy page

##

[​


](#cli-commands)

CLI commands

Command

Description

Example

`claude`

Start interactive REPL

`claude`

`claude "query"`

Start REPL with initial prompt

`claude "explain this project"`

`claude -p "query"`

Query via SDK, then exit

`claude -p "explain this function"`

`cat file | claude -p "query"`

Process piped content

`cat logs.txt | claude -p "explain"`

`claude -c`

Continue most recent conversation

`claude -c`

`claude -c -p "query"`

Continue via SDK

`claude -c -p "Check for type errors"`

`claude -r "<session-id>" "query"`

Resume session by ID

`claude -r "abc123" "Finish this PR"`

`claude update`

Update to latest version

`claude update`

`claude mcp`

Configure Model Context Protocol (MCP) servers

See the [Claude Code MCP documentation](/docs/en/mcp).

##

[​


](#cli-flags)

CLI flags

Customize Claude Code’s behavior with these command-line flags:

Flag

Description

Example

`--add-dir`

Add additional working directories for Claude to access (validates each path exists as a directory)

`claude --add-dir ../apps ../lib`

`--agent`

Specify an agent for the current session (overrides the `agent` setting)

`claude --agent my-custom-agent`

`--agents`

Define custom [subagents](/docs/en/sub-agents) dynamically via JSON (see below for format)

`claude --agents '{"reviewer":{"description":"Reviews code","prompt":"You are a code reviewer"}}'`

`--allowedTools`

A list of tools that should be allowed without prompting the user for permission, in addition to [settings.json files](/docs/en/settings)

`"Bash(git log:*)" "Bash(git diff:*)" "Read"`

`--append-system-prompt`

Append custom text to the end of the default system prompt (works in both interactive and print modes)

`claude --append-system-prompt "Always use TypeScript"`

`--betas`

Beta headers to include in API requests (API key users only)

`claude --betas interleaved-thinking`

`--continue`, `-c`

Load the most recent conversation in the current directory

`claude --continue`

`--dangerously-skip-permissions`

Skip permission prompts (use with caution)

`claude --dangerously-skip-permissions`

`--debug`

Enable debug mode with optional category filtering (for example, `"api,hooks"` or `"!statsig,!file"`)

`claude --debug "api,mcp"`

`--disallowedTools`

A list of tools that should be disallowed without prompting the user for permission, in addition to [settings.json files](/docs/en/settings)

`"Bash(git log:*)" "Bash(git diff:*)" "Edit"`

`--fallback-model`

Enable automatic fallback to specified model when default model is overloaded (print mode only)

`claude -p --fallback-model sonnet "query"`

`--fork-session`

When resuming, create a new session ID instead of reusing the original (use with `--resume` or `--continue`)

`claude --resume abc123 --fork-session`

`--ide`

Automatically connect to IDE on startup if exactly one valid IDE is available

`claude --ide`

`--include-partial-messages`

Include partial streaming events in output (requires `--print` and `--output-format=stream-json`)

`claude -p --output-format stream-json --include-partial-messages "query"`

`--input-format`

Specify input format for print mode (options: `text`, `stream-json`)

`claude -p --output-format json --input-format stream-json`

`--json-schema`

Get validated JSON output matching a JSON Schema after agent completes its workflow (print mode only, see [Agent SDK Structured Outputs](https://docs.claude.com/en/docs/agent-sdk/structured-outputs))

`claude -p --json-schema '{"type":"object","properties":{...}}' "query"`

`--max-turns`

Limit the number of agentic turns in non-interactive mode

`claude -p --max-turns 3 "query"`

`--mcp-config`

Load MCP servers from JSON files or strings (space-separated)

`claude --mcp-config ./mcp.json`

`--model`

Sets the model for the current session with an alias for the latest model (`sonnet` or `opus`) or a model’s full name

`claude --model claude-sonnet-4-5-20250929`

`--output-format`

Specify output format for print mode (options: `text`, `json`, `stream-json`)

`claude -p "query" --output-format json`

`--permission-mode`

Begin in a specified [permission mode](/docs/en/iam#permission-modes)

`claude --permission-mode plan`

`--permission-prompt-tool`

Specify an MCP tool to handle permission prompts in non-interactive mode

`claude -p --permission-prompt-tool mcp_auth_tool "query"`

`--plugin-dir`

Load plugins from directories for this session only (repeatable)

`claude --plugin-dir ./my-plugins`

`--print`, `-p`

Print response without interactive mode (see [SDK documentation](https://docs.claude.com/en/docs/agent-sdk) for programmatic usage details)

`claude -p "query"`

`--resume`, `-r`

Resume a specific session by ID, or by choosing in interactive mode

`claude --resume abc123 "query"`

`--session-id`

Use a specific session ID for the conversation (must be a valid UUID)

`claude --session-id "550e8400-e29b-41d4-a716-446655440000"`

`--setting-sources`

Comma-separated list of setting sources to load (`user`, `project`, `local`)

`claude --setting-sources user,project`

`--settings`

Path to a settings JSON file or a JSON string to load additional settings from

`claude --settings ./settings.json`

`--strict-mcp-config`

Only use MCP servers from `--mcp-config`, ignoring all other MCP configurations

`claude --strict-mcp-config --mcp-config ./mcp.json`

`--system-prompt`

Replace the entire system prompt with custom text (works in both interactive and print modes)

`claude --system-prompt "You are a Python expert"`

`--system-prompt-file`

Load system prompt from a file, replacing the default prompt (print mode only)

`claude -p --system-prompt-file ./custom-prompt.txt "query"`

`--tools`

Specify the list of available tools from the built-in set (use `""` to disable all, `"default"` for all, or tool names like `"Bash,Edit,Read"`)

`claude -p --tools "Bash,Edit,Read" "query"`

`--verbose`

Enable verbose logging, shows full turn-by-turn output (helpful for debugging in both print and interactive modes)

`claude --verbose`

`--version`, `-v`

Output the version number

`claude -v`

The `--output-format json` flag is particularly useful for scripting and automation, allowing you to parse Claude’s responses programmatically.

###

[​


](#agents-flag-format)

Agents flag format

The `--agents` flag accepts a JSON object that defines one or more custom subagents. Each subagent requires a unique name (as the key) and a definition object with the following fields:

Field

Required

Description

`description`

Yes

Natural language description of when the subagent should be invoked

`prompt`

Yes

The system prompt that guides the subagent’s behavior

`tools`

No

Array of specific tools the subagent can use (for example, `["Read", "Edit", "Bash"]`). If omitted, inherits all tools

`model`

No

Model alias to use: `sonnet`, `opus`, or `haiku`. If omitted, uses the default subagent model

Example:

Report incorrect code

Copy

Ask AI
```
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist for errors and test failures.",
    "prompt": "You are an expert debugger. Analyze errors, identify root causes, and provide fixes."
  }
}'
```
For more details on creating and using subagents, see the [subagents documentation](/docs/en/sub-agents).

###

[​


](#system-prompt-flags)

System prompt flags

Claude Code provides three flags for customizing the system prompt, each serving a different purpose:

Flag

Behavior

Modes

Use Case

`--system-prompt`

**Replaces** entire default prompt

Interactive + Print

Complete control over Claude’s behavior and instructions

`--system-prompt-file`

**Replaces** with file contents

Print only

Load prompts from files for reproducibility and version control

`--append-system-prompt`

**Appends** to default prompt

Interactive + Print

Add specific instructions while keeping default Claude Code behavior

**When to use each:**

*   **`--system-prompt`**: Use when you need complete control over Claude’s system prompt. This removes all default Claude Code instructions, giving you a blank slate.

    Report incorrect code

    Copy

    Ask AI

    ```
    claude --system-prompt "You are a Python expert who only writes type-annotated code"

    ```

*   **`--system-prompt-file`**: Use when you want to load a custom prompt from a file, useful for team consistency or version-controlled prompt templates.

    Report incorrect code

    Copy

    Ask AI

    ```
    claude -p --system-prompt-file ./prompts/code-review.txt "Review this PR"

    ```

*   **`--append-system-prompt`**: Use when you want to add specific instructions while keeping Claude Code’s default capabilities intact. This is the safest option for most use cases.

    Report incorrect code

    Copy

    Ask AI

    ```
    claude --append-system-prompt "Always use TypeScript and include JSDoc comments"

    ```
`--system-prompt` and `--system-prompt-file` are mutually exclusive. You cannot use both flags simultaneously.

For most use cases, `--append-system-prompt` is recommended as it preserves Claude Code’s built-in capabilities while adding your custom requirements. Use `--system-prompt` or `--system-prompt-file` only when you need complete control over the system prompt.

For detailed information about print mode (`-p`) including output formats, streaming, verbose logging, and programmatic usage, see the [SDK documentation](https://docs.claude.com/en/docs/agent-sdk).

##

[​


](#see-also)

See also

*   [Interactive mode](/docs/en/interactive-mode) - Shortcuts, input modes, and interactive features
*   [Slash commands](/docs/en/slash-commands) - Interactive session commands
*   [Quickstart guide](/docs/en/quickstart) - Getting started with Claude Code
*   [Common workflows](/docs/en/common-workflows) - Advanced workflows and patterns
*   [Settings](/docs/en/settings) - Configuration options
*   [SDK documentation](https://docs.claude.com/en/docs/agent-sdk) - Programmatic usage and integrations

Was this page helpful?

YesNo

[Interactive mode](/docs/en/interactive-mode)

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