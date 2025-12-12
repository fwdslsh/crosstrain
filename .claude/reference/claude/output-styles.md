Output styles - Claude Code Docs

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

Output styles

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

*   [Built-in output styles](#built-in-output-styles)
*   [How output styles work](#how-output-styles-work)
*   [Change your output style](#change-your-output-style)
*   [Create a custom output style](#create-a-custom-output-style)
*   [Frontmatter](#frontmatter)
*   [Comparisons to related features](#comparisons-to-related-features)
*   [Output Styles vs. CLAUDE.md vs. —append-system-prompt](#output-styles-vs-claude-md-vs-%E2%80%94append-system-prompt)
*   [Output Styles vs. Agents](#output-styles-vs-agents)
*   [Output Styles vs. Custom Slash Commands](#output-styles-vs-custom-slash-commands)

Build with Claude Code

# Output styles


Copy page

Adapt Claude Code for uses beyond software engineering

Copy page

Output styles allow you to use Claude Code as any type of agent while keeping its core capabilities, such as running local scripts, reading/writing files, and tracking TODOs.

##

[​


](#built-in-output-styles)

Built-in output styles

Claude Code’s **Default** output style is the existing system prompt, designed to help you complete software engineering tasks efficiently. There are two additional built-in output styles focused on teaching you the codebase and how Claude operates:

*   **Explanatory**: Provides educational “Insights” in between helping you complete software engineering tasks. Helps you understand implementation choices and codebase patterns.
*   **Learning**: Collaborative, learn-by-doing mode where Claude will not only share “Insights” while coding, but also ask you to contribute small, strategic pieces of code yourself. Claude Code will add `TODO(human)` markers in your code for you to implement.

##

[​


](#how-output-styles-work)

How output styles work

Output styles directly modify Claude Code’s system prompt.

*   All output styles exclude instructions for efficient output (such as responding concisely).
*   Custom output styles exclude instructions for coding (such as verifying code with tests), unless `keep-coding-instructions` is true.
*   All output styles have their own custom instructions added to the end of the system prompt.
*   All output styles trigger reminders for Claude to adhere to the output style instructions during the conversation.

##

[​


](#change-your-output-style)

Change your output style

You can either:

*   Run `/output-style` to access a menu and select your output style (this can also be accessed from the `/config` menu)
*   Run `/output-style [style]`, such as `/output-style explanatory`, to directly switch to a style

These changes apply to the [local project level](/docs/en/settings) and are saved in `.claude/settings.local.json`. You can also directly edit the `outputStyle` field in a settings file at a different level.

##

[​


](#create-a-custom-output-style)

Create a custom output style

Custom output styles are Markdown files with frontmatter and the text that will be added to the system prompt:

Report incorrect code

Copy

Ask AI
```
---
name: My Custom Style
description:
  A brief description of what this style does, to be displayed to the user
---

# Custom Style Instructions


You are an interactive CLI tool that helps users with software engineering
tasks. [Your custom instructions here...]

## Specific Behaviors


[Define how the assistant should behave in this style...]
```
You can save these files at the user level (`~/.claude/output-styles`) or project level (`.claude/output-styles`).

###

[​


](#frontmatter)

Frontmatter

Output style files support frontmatter, useful for specifying metadata about the command:

Frontmatter

Purpose

Default

`name`

Name of the output style, if not the file name

Inherits from file name

`description`

Description of the output style. Used only in the UI of `/output-style`

None

`keep-coding-instructions`

Whether to keep the parts of Claude Code’s system prompt related to coding.

false

##

[​


](#comparisons-to-related-features)

Comparisons to related features

###

[​


](#output-styles-vs-claude-md-vs-—append-system-prompt)

Output Styles vs. CLAUDE.md vs. —append-system-prompt

Output styles completely “turn off” the parts of Claude Code’s default system prompt specific to software engineering. Neither CLAUDE.md nor `--append-system-prompt` edit Claude Code’s default system prompt. CLAUDE.md adds the contents as a user message _following_ Claude Code’s default system prompt. `--append-system-prompt` appends the content to the system prompt.

###

[​


](#output-styles-vs-agents)

Output Styles vs. [Agents](/docs/en/sub-agents)

Output styles directly affect the main agent loop and only affect the system prompt. Agents are invoked to handle specific tasks and can include additional settings like the model to use, the tools they have available, and some context about when to use the agent.

###

[​


](#output-styles-vs-custom-slash-commands)

Output Styles vs. [Custom Slash Commands](/docs/en/slash-commands)

You can think of output styles as “stored system prompts” and custom slash commands as “stored prompts”.

Was this page helpful?

YesNo

[Agent Skills](/docs/en/skills)[Hooks](/docs/en/hooks-guide)

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