/**
 * Demo 01: Basic Agent Loading
 *
 * This demo shows how the crosstrain plugin discovers Claude Code agents
 * and syncs them to OpenCode's agent format.
 *
 * Run: bun run demo/agents/01-basic-agent.ts
 */

import { join } from "path"
import { mkdir, readFile, rm } from "fs/promises"
import { discoverAgents, syncAgentsToOpenCode } from "../../src/loaders/agents"

// Point to our fixtures directory
const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures")
const CLAUDE_DIR = join(FIXTURES_DIR, ".claude")
const OPENCODE_DIR = join(FIXTURES_DIR, ".opencode")

console.log("Demo 01: Basic Agent Loading\n")
console.log("=".repeat(60))
console.log()

// ============================================================================
// Step 1: Discover Claude Code Agents
// ============================================================================

console.log("Step 1: Discovering Claude Code Agents")
console.log("-".repeat(60))
console.log(`Scanning: ${CLAUDE_DIR}/agents/`)
console.log()

const agents = await discoverAgents(CLAUDE_DIR, "")

console.log(`Found ${agents.length} agent(s):\n`)

for (const agent of agents) {
  console.log(`  Name: ${agent.name}`)
  console.log(`  Description: ${agent.description}`)
  console.log(`  Model: ${agent.model || "inherit"}`)
  console.log(`  Tools: ${agent.tools?.join(", ") || "All"}`)
  console.log(`  Permission Mode: ${agent.permissionMode || "default"}`)
  console.log(`  System Prompt: ${agent.systemPrompt.substring(0, 80)}...`)
  console.log()
}

// ============================================================================
// Step 2: Sync Agents to OpenCode Format
// ============================================================================

console.log("Step 2: Syncing to OpenCode Format")
console.log("-".repeat(60))

// Ensure OpenCode agent directory exists
await mkdir(join(OPENCODE_DIR, "agent"), { recursive: true })

const syncedAgents = await syncAgentsToOpenCode(
  CLAUDE_DIR,
  "",
  OPENCODE_DIR,
  { filePrefix: "claude_", verbose: false }
)

console.log(`Synced ${syncedAgents.length} agent(s) to .opencode/agent/\n`)

for (const agentPath of syncedAgents) {
  console.log(`  Created: ${agentPath}`)
}
console.log()

// ============================================================================
// Step 3: Show Converted Agent Content
// ============================================================================

console.log("Step 3: Examining Converted Agent")
console.log("-".repeat(60))

const convertedAgentPath = join(OPENCODE_DIR, "agent", "claude_documentation.md")
try {
  const content = await readFile(convertedAgentPath, "utf-8")
  console.log(`Contents of ${convertedAgentPath}:\n`)
  console.log(content)
} catch (error) {
  console.log("Could not read converted agent file")
}

// ============================================================================
// Step 4: Show Frontmatter Mapping
// ============================================================================

console.log()
console.log("Step 4: Frontmatter Mapping Reference")
console.log("-".repeat(60))
console.log()
console.log("Claude Code Frontmatter -> OpenCode Frontmatter:")
console.log()
console.log("  name               -> (used for filename)")
console.log("  description        -> description")
console.log("  model: sonnet      -> model: anthropic/claude-sonnet-4-20250514")
console.log("  model: opus        -> model: anthropic/claude-opus-4-20250514")
console.log("  model: haiku       -> model: anthropic/claude-haiku-4-20250514")
console.log("  tools: Read,Write  -> tools: { read: true, write: true, ... }")
console.log("  permissionMode     -> permission: { edit: allow/deny, ... }")
console.log("  (all agents)       -> mode: subagent")
console.log()

// ============================================================================
// Cleanup
// ============================================================================

console.log("Step 5: Cleanup")
console.log("-".repeat(60))

await rm(join(OPENCODE_DIR, "agent"), { recursive: true, force: true })
console.log("Removed generated .opencode/agent/ directory")
console.log()

// ============================================================================
// Summary
// ============================================================================

console.log("=".repeat(60))
console.log("Summary")
console.log("=".repeat(60))
console.log()
console.log("What happened:")
console.log("  1. discoverAgents() scanned .claude/agents/ for markdown files")
console.log("  2. Each agent's frontmatter was parsed and mapped")
console.log("  3. syncAgentsToOpenCode() wrote converted agents to .opencode/agent/")
console.log("  4. Agents are prefixed: claude_<name>.md")
console.log()
console.log("Key conversions:")
console.log("  - Model aliases (sonnet/opus/haiku) -> Full model paths")
console.log("  - Comma-separated tools -> Object with boolean values")
console.log("  - Permission modes -> Permission objects")
console.log("  - All agents become 'subagent' mode")
console.log()
console.log("In a real OpenCode session:")
console.log("  - Agents appear in .opencode/agent/ directory")
console.log("  - Users can invoke them via @agent_name")
console.log("  - System prompts and tool restrictions are preserved")
console.log()
