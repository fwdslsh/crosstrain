/**
 * Demo 01: Basic Agent Conversion
 * 
 * This demo shows how a simple Claude Code Subagent is converted to an OpenCode
 * Agent with proper frontmatter mapping and system prompt preservation.
 * 
 * Agents in Claude Code are specialized AI assistants defined in markdown files
 * with YAML frontmatter. When converted by crosstrain, they become OpenCode
 * agents with mapped configuration.
 */

import { mkdir, writeFile, rm, readFile } from "fs/promises"
import { join } from "path"

const DEMO_DIR = join(process.cwd(), "temp-agent-demo-01")
const CLAUDE_DIR = join(DEMO_DIR, ".claude")
const OPENCODE_DIR = join(DEMO_DIR, ".opencode")
const AGENTS_DIR = join(CLAUDE_DIR, "agents")

console.log("🎬 Demo 01: Basic Agent Conversion\n")
console.log("=".repeat(70))
console.log()

// ============================================================================
// Step 1: Create a Claude Code Agent
// ============================================================================

console.log("📝 Step 1: Creating Claude Code Agent")
console.log("-".repeat(70))

await mkdir(AGENTS_DIR, { recursive: true })

const claudeAgentContent = `---
name: documentation
description: A specialized agent for writing and maintaining documentation
model: sonnet
tools: Read, Write, Grep
permissionMode: acceptEdits
---

# Documentation Agent

You are a documentation specialist with expertise in technical writing and knowledge management.

## Your Role

You help users create, improve, and maintain documentation for their projects. Your focus is on:

- **Clarity**: Write in clear, accessible language
- **Structure**: Organize information logically
- **Completeness**: Cover all necessary topics
- **Consistency**: Maintain consistent style and terminology

## Documentation Types

### API Documentation
- Document functions, classes, and modules
- Include parameters, return values, and examples
- Follow standard formats (JSDoc, TSDoc, etc.)

### User Guides
- Step-by-step instructions
- Common use cases and examples
- Troubleshooting sections

### README Files
- Project overview and purpose
- Installation instructions
- Quick start guide
- Links to detailed docs

## Writing Guidelines

1. **Use active voice**: "The function returns..." not "The value is returned..."
2. **Be concise**: Respect the reader's time
3. **Provide examples**: Show, don't just tell
4. **Update regularly**: Documentation should reflect current state

## Your Workflow

When asked to document something:

1. **Read** the code to understand functionality
2. **Analyze** the purpose and usage patterns
3. **Write** clear, structured documentation
4. **Review** for completeness and accuracy

Remember: Good documentation makes the difference between a project that's used and one that's ignored.
`

await writeFile(join(AGENTS_DIR, "documentation.md"), claudeAgentContent, "utf-8")
console.log("✅ Created Claude agent: .claude/agents/documentation.md")
console.log()

// ============================================================================
// Step 2: Show the frontmatter mapping
// ============================================================================

console.log("🔄 Step 2: Frontmatter Mapping")
console.log("-".repeat(70))

console.log("Claude Code Frontmatter:")
console.log("  name: documentation")
console.log("  description: A specialized agent for writing and maintaining documentation")
console.log("  model: sonnet")
console.log("  tools: Read, Write, Grep")
console.log("  permissionMode: acceptEdits")
console.log()

console.log("OpenCode Frontmatter (converted):")
console.log("  description: A specialized agent for writing and maintaining documentation")
console.log("  mode: subagent")
console.log("  model: anthropic/claude-sonnet-4-20250514")
console.log("  tools:")
console.log("    read: true")
console.log("    write: true")
console.log("    grep: true")
console.log("    edit: false")
console.log("    bash: false")
console.log("    glob: false")
console.log("    webfetch: false")
console.log("  permission:")
console.log("    edit: allow")
console.log()

// ============================================================================
// Step 3: Simulate the conversion
// ============================================================================

console.log("⚙️  Step 3: Conversion Process")
console.log("-".repeat(70))

console.log("What crosstrain does when it finds this agent:")
console.log()
console.log("1. Parse the markdown file and extract frontmatter")
console.log("2. Map 'name' to filename: claude_documentation.md")
console.log("3. Map 'model: sonnet' to full model path")
console.log("4. Convert tools from comma-separated to object format")
console.log("5. Map permissionMode to permission object")
console.log("6. Set mode to 'subagent' (all Claude agents are subagents)")
console.log("7. Preserve the system prompt content")
console.log("8. Write to .opencode/agent/claude_documentation.md")
console.log()

// Simulate the conversion
await mkdir(join(OPENCODE_DIR, "agent"), { recursive: true })

const openCodeAgentContent = `---
description: A specialized agent for writing and maintaining documentation
mode: subagent
model: anthropic/claude-sonnet-4-20250514
tools:
  read: true
  write: true
  grep: true
  edit: false
  bash: false
  glob: false
  webfetch: false
permission:
  edit: allow
---

# Documentation Agent

You are a documentation specialist with expertise in technical writing and knowledge management.

## Your Role

You help users create, improve, and maintain documentation for their projects. Your focus is on:

- **Clarity**: Write in clear, accessible language
- **Structure**: Organize information logically
- **Completeness**: Cover all necessary topics
- **Consistency**: Maintain consistent style and terminology

## Documentation Types

### API Documentation
- Document functions, classes, and modules
- Include parameters, return values, and examples
- Follow standard formats (JSDoc, TSDoc, etc.)

### User Guides
- Step-by-step instructions
- Common use cases and examples
- Troubleshooting sections

### README Files
- Project overview and purpose
- Installation instructions
- Quick start guide
- Links to detailed docs

## Writing Guidelines

1. **Use active voice**: "The function returns..." not "The value is returned..."
2. **Be concise**: Respect the reader's time
3. **Provide examples**: Show, don't just tell
4. **Update regularly**: Documentation should reflect current state

## Your Workflow

When asked to document something:

1. **Read** the code to understand functionality
2. **Analyze** the purpose and usage patterns
3. **Write** clear, structured documentation
4. **Review** for completeness and accuracy

Remember: Good documentation makes the difference between a project that's used and one that's ignored.

---
*[Loaded from Claude Code: .claude/agents/documentation.md]*
`

await writeFile(join(OPENCODE_DIR, "agent", "claude_documentation.md"), openCodeAgentContent, "utf-8")
console.log("✅ Converted agent written to: .opencode/agent/claude_documentation.md")
console.log()

// ============================================================================
// Step 4: Model mapping reference
// ============================================================================

console.log("🗺️  Step 4: Model Mapping Reference")
console.log("-".repeat(70))

const modelMapping = {
  "sonnet": "anthropic/claude-sonnet-4-20250514",
  "opus": "anthropic/claude-opus-4-20250514",
  "haiku": "anthropic/claude-haiku-4-20250514",
  "inherit": "(no model specified, inherits from parent)"
}

console.log("Claude Code Model Alias → OpenCode Full Path")
for (const [alias, path] of Object.entries(modelMapping)) {
  console.log(`  ${alias.padEnd(10)} → ${path}`)
}
console.log()

// ============================================================================
// Step 5: Permission mode mapping
// ============================================================================

console.log("🔐 Step 5: Permission Mode Mapping")
console.log("-".repeat(70))

const permissionMapping = {
  "default": "(no permission changes)",
  "acceptEdits": "{ edit: 'allow' }",
  "bypassPermissions": "{ edit: 'allow', bash: 'allow' }",
  "plan": "{ edit: 'deny', bash: 'deny' }"
}

console.log("Claude Code Mode → OpenCode Permission Object")
for (const [mode, perm] of Object.entries(permissionMapping)) {
  console.log(`  ${mode.padEnd(20)} → ${perm}`)
}
console.log()

// ============================================================================
// Step 6: Usage in OpenCode
// ============================================================================

console.log("💡 Step 6: Using the Converted Agent")
console.log("-".repeat(70))

console.log("In OpenCode, you can invoke this agent in several ways:")
console.log()
console.log("1. **@ Mention in conversation**:")
console.log("   User: '@claude_documentation please document the API module'")
console.log()
console.log("2. **Via OpenCode SDK**:")
console.log("   ```typescript")
console.log("   const response = await client.agent.send({")
console.log("     agent: 'claude_documentation',")
console.log("     message: 'Document the authentication system'")
console.log("   })")
console.log("   ```")
console.log()
console.log("3. **In commands**:")
console.log("   Commands can specify which agent to use:")
console.log("   ```yaml")
console.log("   ---")
console.log("   agent: claude_documentation")
console.log("   ---")
console.log("   ```")
console.log()

// ============================================================================
// Step 7: Benefits and differences
// ============================================================================

console.log("✨ Step 7: Benefits and Important Differences")
console.log("-".repeat(70))

console.log("Benefits:")
console.log("  ✅ Specialized agents work in OpenCode with no changes")
console.log("  ✅ System prompts are fully preserved")
console.log("  ✅ Model preferences are maintained")
console.log("  ✅ Tool restrictions are properly configured")
console.log("  ✅ Permission modes are respected")
console.log()

console.log("Important Differences:")
console.log("  ⚠️  All agents become 'subagents' in OpenCode")
console.log("     (Claude Code doesn't distinguish primary vs. subagent)")
console.log()
console.log("  ⚠️  Tool restrictions in OpenCode are hard-enforced")
console.log("     (Unlike skills which use soft guidance)")
console.log()
console.log("  ⚠️  File prefix 'claude_' prevents naming conflicts")
console.log("     (You can change this in crosstrain config)")
console.log()

// ============================================================================
// Cleanup
// ============================================================================

console.log("🧹 Cleanup")
console.log("-".repeat(70))
await rm(DEMO_DIR, { recursive: true, force: true })
console.log("✅ Temporary files removed")
console.log()

// ============================================================================
// Summary
// ============================================================================

console.log("=".repeat(70))
console.log("📊 Summary")
console.log("=".repeat(70))
console.log()
console.log("Claude Code Agent:")
console.log("  📁 .claude/agents/documentation.md")
console.log("  🎭 Model: sonnet")
console.log("  🔧 Tools: Read, Write, Grep")
console.log("  🔐 Permission: acceptEdits")
console.log()
console.log("OpenCode Agent:")
console.log("  📁 .opencode/agent/claude_documentation.md")
console.log("  🎭 Model: anthropic/claude-sonnet-4-20250514")
console.log("  🔧 Tools: read, write, grep (hard-enforced)")
console.log("  🔐 Permission: { edit: 'allow' }")
console.log("  📝 Mode: subagent")
console.log()
console.log("Key Mappings:")
console.log("  • Model aliases → Full model paths")
console.log("  • Tool names → Lowercase OpenCode names")
console.log("  • Permission modes → Permission objects")
console.log("  • System prompt → Preserved exactly")
console.log()
console.log("✅ Demo Complete!")
console.log()

/**
 * Key Takeaways:
 * 
 * 1. Agents are converted 1:1 from Claude to OpenCode format
 * 2. Frontmatter fields are intelligently mapped
 * 3. System prompts are preserved exactly
 * 4. All agents become subagents in OpenCode
 * 5. Tool restrictions are hard-enforced in OpenCode
 * 
 * Next Steps:
 * - See 02-agent-with-tools.ts for detailed tool configuration
 * - See 03-agent-with-permissions.ts for permission modes
 * - See 04-agent-with-skills.ts for agents that use skills
 */
