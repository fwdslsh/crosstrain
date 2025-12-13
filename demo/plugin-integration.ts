/**
 * Full Plugin Integration Demo
 *
 * This demo shows how to initialize the complete crosstrain plugin
 * and demonstrates all loaders working together.
 *
 * Run: bun run demo/plugin-integration.ts
 */

import { join } from "path"
import { mkdir, rm, readdir } from "fs/promises"
import { createCrossstrainPlugin } from "../src/index"
import type { CrosstrainConfig } from "../src/types"

// Point to our fixtures directory
const FIXTURES_DIR = join(import.meta.dir, "fixtures")
const CLAUDE_DIR = join(FIXTURES_DIR, ".claude")
const OPENCODE_DIR = join(FIXTURES_DIR, ".opencode")

console.log("Crosstrain Plugin Integration Demo\n")
console.log("=".repeat(60))
console.log()

// ============================================================================
// Step 1: Show the fixtures structure
// ============================================================================

console.log("Step 1: Fixtures Structure")
console.log("-".repeat(60))
console.log()
console.log("demo/fixtures/.claude/")
console.log("├── skills/")
console.log("│   ├── commit-helper/SKILL.md")
console.log("│   └── code-review/SKILL.md")
console.log("├── agents/")
console.log("│   ├── documentation.md")
console.log("│   └── security-reviewer.md")
console.log("├── commands/")
console.log("│   ├── test.md")
console.log("│   ├── component.md")
console.log("│   └── review.md")
console.log("└── settings.json (hooks)")
console.log()

// ============================================================================
// Step 2: Configure the plugin
// ============================================================================

console.log("Step 2: Plugin Configuration")
console.log("-".repeat(60))

const pluginConfig: CrosstrainConfig = {
  enabled: true,
  claudeDir: ".claude",
  openCodeDir: ".opencode",
  loadUserAssets: false, // Only load from fixtures
  watch: false, // Disable for demo
  verbose: true,
  filePrefix: "claude_",
}

console.log("Configuration:")
console.log(JSON.stringify(pluginConfig, null, 2))
console.log()

// ============================================================================
// Step 3: Initialize the plugin
// ============================================================================

console.log("Step 3: Initializing Plugin")
console.log("-".repeat(60))

// Ensure OpenCode directories exist
await mkdir(join(OPENCODE_DIR, "agent"), { recursive: true })
await mkdir(join(OPENCODE_DIR, "command"), { recursive: true })
await mkdir(join(OPENCODE_DIR, "tool"), { recursive: true })

// Create plugin instance
const plugin = createCrossstrainPlugin(pluginConfig)

// Simulate OpenCode plugin context
const pluginContext = {
  directory: FIXTURES_DIR,
  worktree: FIXTURES_DIR,
}

console.log("Calling plugin initialization...")
console.log()

const pluginInterface = await plugin(pluginContext)

console.log()
console.log("Plugin interface returned:")
console.log(`  tool: ${pluginInterface.tool ? `${Object.keys(pluginInterface.tool).length} tools` : "none"}`)
console.log(`  tool.execute.before: ${pluginInterface["tool.execute.before"] ? "yes" : "no"}`)
console.log(`  tool.execute.after: ${pluginInterface["tool.execute.after"] ? "yes" : "no"}`)
console.log(`  event: ${pluginInterface.event ? "yes" : "no"}`)
console.log()

// ============================================================================
// Step 4: List loaded tools
// ============================================================================

console.log("Step 4: Loaded Tools (from Skills)")
console.log("-".repeat(60))

if (pluginInterface.tool) {
  for (const [name, def] of Object.entries(pluginInterface.tool)) {
    console.log(`  ${name}`)
    console.log(`    ${def.description?.substring(0, 60)}...`)
    console.log()
  }
}

// ============================================================================
// Step 5: List synced agents
// ============================================================================

console.log("Step 5: Synced Agents")
console.log("-".repeat(60))

try {
  const agentFiles = await readdir(join(OPENCODE_DIR, "agent"))
  console.log(`Found ${agentFiles.length} agent file(s) in .opencode/agent/:`)
  for (const file of agentFiles) {
    console.log(`  - ${file}`)
  }
} catch {
  console.log("No agent files found")
}
console.log()

// ============================================================================
// Step 6: List synced commands
// ============================================================================

console.log("Step 6: Synced Commands")
console.log("-".repeat(60))

try {
  const commandFiles = await readdir(join(OPENCODE_DIR, "command"))
  console.log(`Found ${commandFiles.length} command file(s) in .opencode/command/:`)
  for (const file of commandFiles) {
    console.log(`  - ${file}`)
  }
} catch {
  console.log("No command files found")
}
console.log()

// ============================================================================
// Step 7: Execute a skill tool
// ============================================================================

console.log("Step 7: Execute a Skill Tool")
console.log("-".repeat(60))

if (pluginInterface.tool?.["skill_commit_helper"]) {
  console.log("Invoking: skill_commit_helper")
  const result = await pluginInterface.tool["skill_commit_helper"].execute(
    { query: "Help with a feature commit" },
    { agent: "demo", sessionID: "demo-session", messageID: "1" }
  )
  console.log()
  console.log("Result preview (first 500 chars):")
  console.log(result.substring(0, 500))
  console.log("...")
}
console.log()

// ============================================================================
// Cleanup
// ============================================================================

console.log("Step 8: Cleanup")
console.log("-".repeat(60))

await rm(join(OPENCODE_DIR, "agent"), { recursive: true, force: true })
await rm(join(OPENCODE_DIR, "command"), { recursive: true, force: true })
await rm(join(OPENCODE_DIR, "tool"), { recursive: true, force: true })
console.log("Removed generated .opencode/ directories")
console.log()

// ============================================================================
// Summary
// ============================================================================

console.log("=".repeat(60))
console.log("Summary")
console.log("=".repeat(60))
console.log()
console.log("The crosstrain plugin successfully:")
console.log()
console.log("  1. Discovered Claude Code assets in .claude/")
console.log("     - Skills (SKILL.md files)")
console.log("     - Agents (markdown files)")
console.log("     - Commands (markdown files)")
console.log("     - Hooks (settings.json)")
console.log()
console.log("  2. Converted assets to OpenCode format")
console.log("     - Skills -> Custom tools (returned in plugin.tool)")
console.log("     - Agents -> Synced to .opencode/agent/")
console.log("     - Commands -> Synced to .opencode/command/")
console.log("     - Hooks -> Event handlers (plugin hooks)")
console.log()
console.log("  3. Made them available to OpenCode")
console.log("     - Tools are callable by the LLM")
console.log("     - Agents can be invoked via @name")
console.log("     - Commands can be run via /name")
console.log("     - Hooks execute on tool use")
console.log()
console.log("In production, OpenCode loads this plugin automatically")
console.log("and all Claude Code assets just work!")
console.log()
