Tools | OpenCode     [Skip to content](#_top)

# Tools


Manage the tools an LLM can use.

Tools allow the LLM to perform actions in your codebase. OpenCode comes with a set of built-in tools, but you can extend it with [custom tools](/docs/custom-tools) or [MCP servers](/docs/mcp-servers).

By default, all tools are **enabled** and don’t need permission to run. But you can configure this and control the [permissions](/docs/permissions) through your config.

* * *

## [Configure](#configure)


You can configure tools globally or per agent. Agent-specific configs override global settings.

By default, all tools are set to `true`. To disable a tool, set it to `false`.

* * *

### [Global](#global)


Disable or enable tools globally using the `tools` option.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "write": false,    "bash": false,    "webfetch": true  }}
```
You can also use wildcards to control multiple tools at once. For example, to disable all tools from an MCP server:

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "mymcp_*": false  }}
```
* * *

### [Per agent](#per-agent)


Override global tool settings for specific agents using the `tools` config in the agent definition.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "write": true,    "bash": true  },  "agent": {    "plan": {      "tools": {        "write": false,        "bash": false      }    }  }}
```
For example, here the `plan` agent overrides the global config to disable `write` and `bash` tools.

You can also configure tools for agents in Markdown.

~/.config/opencode/agent/readonly.md
```
---description: Read-only analysis agentmode: subagenttools:  write: false  edit: false  bash: false---
Analyze code without making any modifications.
```
[Learn more](/docs/agents#tools) about configuring tools per agent.

* * *

## [Built-in](#built-in)


Here are all the built-in tools available in OpenCode.

* * *

### [bash](#bash)


Execute shell commands in your project environment.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "bash": true  }}
```
This tool allows the LLM to run terminal commands like `npm install`, `git status`, or any other shell command.

* * *

### [edit](#edit)


Modify existing files using exact string replacements.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "edit": true  }}
```
This tool performs precise edits to files by replacing exact text matches. It’s the primary way the LLM modifies code.

* * *

### [write](#write)


Create new files or overwrite existing ones.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "write": true  }}
```
Use this to allow the LLM to create new files. It will overwrite existing files if they already exist.

* * *

### [read](#read)


Read file contents from your codebase.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "read": true  }}
```
This tool reads files and returns their contents. It supports reading specific line ranges for large files.

* * *

### [grep](#grep)


Search file contents using regular expressions.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "grep": true  }}
```
Fast content search across your codebase. Supports full regex syntax and file pattern filtering.

* * *

### [glob](#glob)


Find files by pattern matching.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "glob": true  }}
```
Search for files using glob patterns like `**/*.js` or `src/**/*.ts`. Returns matching file paths sorted by modification time.

* * *

### [list](#list)


List files and directories in a given path.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "list": true  }}
```
This tool lists directory contents. It accepts glob patterns to filter results.

* * *

### [patch](#patch)


Apply patches to files.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "patch": true  }}
```
This tool applies patch files to your codebase. Useful for applying diffs and patches from various sources.

* * *

### [todowrite](#todowrite)


Manage todo lists during coding sessions.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "todowrite": true  }}
```
Creates and updates task lists to track progress during complex operations. The LLM uses this to organize multi-step tasks.

Note

This tool is disabled for subagents by default, but you can enable it manually. [Learn more](/docs/agents/#tools)

* * *

### [todoread](#todoread)


Read existing todo lists.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "todoread": true  }}
```
Reads the current todo list state. Used by the LLM to track what tasks are pending or completed.

Note

This tool is disabled for subagents by default, but you can enable it manually. [Learn more](/docs/agents/#tools)

* * *

### [webfetch](#webfetch)


Fetch web content.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tools": {    "webfetch": true  }}
```
Allows the LLM to fetch and read web pages. Useful for looking up documentation or researching online resources.

* * *

## [Custom tools](#custom-tools)


Custom tools let you define your own functions that the LLM can call. These are defined in your config file and can execute arbitrary code.

[Learn more](/docs/custom-tools) about creating custom tools.

* * *

## [MCP servers](#mcp-servers)


MCP (Model Context Protocol) servers allow you to integrate external tools and services. This includes database access, API integrations, and third-party services.

[Learn more](/docs/mcp-servers) about configuring MCP servers.

* * *

## [Internals](#internals)


Internally, tools like `grep`, `glob`, and `list` use [ripgrep](https://github.com/BurntSushi/ripgrep) under the hood. By default, ripgrep respects `.gitignore` patterns, which means files and directories listed in your `.gitignore` will be excluded from searches and listings.

* * *

### [Ignore patterns](#ignore-patterns)


To include files that would normally be ignored, create a `.ignore` file in your project root. This file can explicitly allow certain paths.

.ignore
```
!node_modules/!dist/!build/
```
For example, this `.ignore` file allows ripgrep to search within `node_modules/`, `dist/`, and `build/` directories even if they’re listed in `.gitignore`.