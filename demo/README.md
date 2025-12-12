# Crosstrain Demo Examples

This directory contains working examples demonstrating how to use the crosstrain plugin with the OpenCode SDK to leverage Claude Code assets in OpenCode.

## Directory Structure

```
demo/
├── README.md           # This file
├── skills/             # Skills → Tools examples
├── agents/             # Agents → Agents examples
├── commands/           # Commands → Commands examples
├── hooks/              # Hooks → Event Handlers examples
└── package.json        # Shared dependencies for all demos
```

## Prerequisites

Before running these demos, ensure you have:

1. **Node.js 18+** or **Bun** installed
2. **OpenCode** installed and configured
3. **Crosstrain plugin** installed in your OpenCode plugin directory

## Setup

Install dependencies for all demos:

```bash
cd demo
npm install
# or
bun install
```

## Demo Categories

### 1. Skills → Tools (`./skills/`)

Demonstrates how Claude Code Skills are converted to OpenCode custom tools that can be invoked by the LLM or programmatically via the SDK.

**Examples:**
- `01-basic-skill.ts` - Basic skill conversion and invocation
- `02-skill-with-tools.ts` - Skill with tool restrictions
- `03-supporting-files.ts` - Skill with supporting files

### 2. Agents → Agents (`./agents/`)

Shows how Claude Code Subagents are converted to OpenCode Agents with different configurations.

**Examples:**
- `01-basic-agent.ts` - Simple agent conversion
- `02-agent-with-tools.ts` - Agent with specific tools enabled
- `03-agent-with-permissions.ts` - Agent with permission modes
- `04-agent-with-skills.ts` - Agent that uses skills

### 3. Commands → Commands (`./commands/`)

Demonstrates slash command conversion and invocation.

**Examples:**
- `01-basic-command.ts` - Simple command with arguments
- `02-command-with-files.ts` - Command with file references
- `03-command-with-shell.ts` - Command with shell output injection

### 4. Hooks → Event Handlers (`./hooks/`)

Shows how Claude Code hooks are converted to OpenCode plugin event handlers.

**Examples:**
- `01-pre-tool-use.ts` - PreToolUse hook example
- `02-post-tool-use.ts` - PostToolUse hook example
- `03-session-events.ts` - Session start/end hooks

## Running the Demos

Each demo is a standalone TypeScript file that can be executed with Node.js or Bun:

```bash
# Using Node.js with tsx
npm run demo:skills:01

# Using Bun (recommended)
bun run demo/skills/01-basic-skill.ts
```

Or run them directly:

```bash
npx tsx demo/skills/01-basic-skill.ts
```

## Demo Structure

Each demo follows this pattern:

1. **Setup** - Import required modules and create test fixtures
2. **Asset Creation** - Create Claude Code assets in `.claude/` directory
3. **Plugin Initialization** - Initialize the crosstrain plugin
4. **Demonstration** - Show the converted assets in action
5. **Verification** - Verify the conversion worked correctly
6. **Cleanup** - Clean up temporary files

## Learning Path

We recommend following the demos in this order:

1. Start with **Skills** (`./skills/01-basic-skill.ts`)
   - Understand how Skills become Tools
   - Learn the basic conversion flow

2. Move to **Commands** (`./commands/01-basic-command.ts`)
   - See how slash commands work
   - Understand template variables

3. Explore **Agents** (`./agents/01-basic-agent.ts`)
   - Learn about agent configuration
   - Understand frontmatter mapping

4. Finish with **Hooks** (`./hooks/01-pre-tool-use.ts`)
   - See event handlers in action
   - Understand lifecycle hooks

## SDK Usage Patterns

All demos use the OpenCode SDK (`@opencode-ai/sdk`) to interact with OpenCode programmatically. Key patterns demonstrated:

### Creating a Client

```typescript
import { OpenCode } from "@opencode-ai/sdk"

const client = await OpenCode.create({
  apiKey: process.env.OPENCODE_API_KEY,
  directory: "/path/to/project"
})
```

### Invoking Tools

```typescript
const result = await client.tool.execute({
  name: "skill_code_helper",
  args: { query: "Help me refactor this code" }
})
```

### Invoking Agents

```typescript
const response = await client.agent.send({
  agent: "claude_helper",
  message: "Analyze this codebase"
})
```

### Executing Commands

```typescript
const result = await client.command.execute({
  name: "claude_test",
  args: ["src/"]
})
```

## Configuration

Demos use a shared configuration file at `demo/.opencode/`:

```
demo/.opencode/
├── agent/      # Converted agents
├── command/    # Converted commands
└── plugin/     # Crosstrain plugin (symlinked)
```

The crosstrain plugin is configured via `demo/crosstrain.config.json`:

```json
{
  "enabled": true,
  "claudeDir": ".claude",
  "openCodeDir": ".opencode",
  "watch": true,
  "verbose": true
}
```

## Troubleshooting

### Plugin Not Loading

Ensure the crosstrain plugin is installed:

```bash
# Check plugin directory
ls ~/.config/opencode/plugin/crosstrain
# or
ls .opencode/plugin/crosstrain
```

### Assets Not Converting

Enable verbose logging in `crosstrain.config.json`:

```json
{
  "verbose": true
}
```

Check OpenCode logs:

```bash
opencode --log-level debug
```

### SDK Connection Issues

Verify OpenCode is running:

```bash
opencode server status
```

Check your API key:

```bash
echo $OPENCODE_API_KEY
```

## Additional Resources

- **Crosstrain Plugin:** `../README.md`
- **Feature Coverage:** `../FEATURES.md`
- **OpenCode SDK Docs:** https://opencode.ai/docs/sdk
- **Claude Code Docs:** https://docs.claude.com/docs/en/overview
- **OpenCode Docs:** https://opencode.ai/docs

## Contributing

Found an issue or want to add more examples? Please:

1. Check existing examples for similar patterns
2. Follow the established demo structure
3. Include clear comments and documentation
4. Test your demo thoroughly
5. Submit a pull request

## License

MIT - Same as the crosstrain plugin
