/**
 * Demo 01: Basic Skill Loading
 *
 * This demo shows how the crosstrain plugin discovers and converts
 * Claude Code Skills into OpenCode custom tools.
 *
 * Run: bun run demo/skills/01-basic-skill.ts
 */

import { join } from "path"
import { discoverSkills, createToolsFromSkills } from "../../src/loaders/skills"

// Point to our fixtures directory (simulating a project with .claude assets)
const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures")
const CLAUDE_DIR = join(FIXTURES_DIR, ".claude")

console.log("Demo 01: Basic Skill Loading\n")
console.log("=".repeat(60))
console.log()

// ============================================================================
// Step 1: Discover Claude Code Skills
// ============================================================================

console.log("Step 1: Discovering Claude Code Skills")
console.log("-".repeat(60))
console.log(`Scanning: ${CLAUDE_DIR}/skills/`)
console.log()

const skills = await discoverSkills(CLAUDE_DIR, "")

console.log(`Found ${skills.length} skill(s):\n`)

for (const skill of skills) {
  console.log(`  Name: ${skill.name}`)
  console.log(`  Description: ${skill.description}`)
  console.log(`  Allowed Tools: ${skill.allowedTools?.join(", ") || "None specified"}`)
  console.log(`  Supporting Files: ${skill.supportingFiles.length}`)
  console.log(`  Path: ${skill.filePath}`)
  console.log()
}

// ============================================================================
// Step 2: Convert Skills to OpenCode Tools
// ============================================================================

console.log("Step 2: Converting to OpenCode Tools")
console.log("-".repeat(60))

const tools = await createToolsFromSkills(CLAUDE_DIR, "")

console.log(`Created ${Object.keys(tools).length} tool(s):\n`)

for (const [toolName, toolDef] of Object.entries(tools)) {
  console.log(`  Tool: ${toolName}`)
  console.log(`  Description: ${toolDef.description}`)
  console.log()
}

// ============================================================================
// Step 3: Execute a Skill Tool
// ============================================================================

console.log("Step 3: Executing a Skill Tool")
console.log("-".repeat(60))

const commitHelperTool = tools["skill_commit_helper"]
if (commitHelperTool) {
  console.log("Invoking: skill_commit_helper")
  console.log()

  // Simulate tool execution with a query
  const result = await commitHelperTool.execute(
    { query: "Help me write a commit for adding a login feature" },
    { agent: "test", sessionID: "demo", messageID: "1" }
  )

  console.log("Tool Response:")
  console.log("-".repeat(40))
  console.log(result)
}

// ============================================================================
// Step 4: Execute a Skill with Supporting Files
// ============================================================================

console.log()
console.log("Step 4: Executing Skill with Supporting Files")
console.log("-".repeat(60))

const codeReviewTool = tools["skill_code_review"]
if (codeReviewTool) {
  console.log("Invoking: skill_code_review")
  console.log()

  const result = await codeReviewTool.execute(
    { query: "Review the authentication module" },
    { agent: "test", sessionID: "demo", messageID: "2" }
  )

  console.log("Tool Response:")
  console.log("-".repeat(40))
  console.log(result)
}

// ============================================================================
// Summary
// ============================================================================

console.log()
console.log("=".repeat(60))
console.log("Summary")
console.log("=".repeat(60))
console.log()
console.log("What happened:")
console.log("  1. discoverSkills() scanned .claude/skills/ for SKILL.md files")
console.log("  2. Each skill was parsed: frontmatter + markdown content")
console.log("  3. createToolsFromSkills() converted skills to OpenCode tools")
console.log("  4. Tools are named: skill_<name> (e.g., skill_commit_helper)")
console.log("  5. Executing a tool returns the skill instructions")
console.log()
console.log("In a real OpenCode session:")
console.log("  - These tools are automatically available to the LLM")
console.log("  - The LLM can invoke them when relevant to the task")
console.log("  - Skill instructions guide the LLM's behavior")
console.log()
