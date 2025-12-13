/**
 * Demo 01: Basic Command Loading
 *
 * This demo shows how the crosstrain plugin discovers Claude Code commands
 * and syncs them to OpenCode's command format.
 *
 * Run: bun run demo/commands/01-basic-command.ts
 */

import { join } from "path"
import { mkdir, readFile, rm } from "fs/promises"
import { discoverCommands, syncCommandsToOpenCode } from "../../src/loaders/commands"

// Point to our fixtures directory
const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures")
const CLAUDE_DIR = join(FIXTURES_DIR, ".claude")
const OPENCODE_DIR = join(FIXTURES_DIR, ".opencode")

console.log("Demo 01: Basic Command Loading\n")
console.log("=".repeat(60))
console.log()

// ============================================================================
// Step 1: Discover Claude Code Commands
// ============================================================================

console.log("Step 1: Discovering Claude Code Commands")
console.log("-".repeat(60))
console.log(`Scanning: ${CLAUDE_DIR}/commands/`)
console.log()

const commands = await discoverCommands(CLAUDE_DIR, "")

console.log(`Found ${commands.length} command(s):\n`)

for (const cmd of commands) {
  console.log(`  Name: ${cmd.name}`)
  console.log(`  Description: ${cmd.description || "No description"}`)
  console.log(`  Template Preview: ${cmd.template.substring(0, 60).replace(/\n/g, " ")}...`)
  console.log()
}

// ============================================================================
// Step 2: Sync Commands to OpenCode Format
// ============================================================================

console.log("Step 2: Syncing to OpenCode Format")
console.log("-".repeat(60))

// Ensure OpenCode command directory exists
await mkdir(join(OPENCODE_DIR, "command"), { recursive: true })

const syncedCommands = await syncCommandsToOpenCode(
  CLAUDE_DIR,
  "",
  OPENCODE_DIR,
  { filePrefix: "claude_", verbose: false }
)

console.log(`Synced ${syncedCommands.length} command(s) to .opencode/command/\n`)

// ============================================================================
// Step 3: Show Converted Command Content
// ============================================================================

console.log("Step 3: Examining Converted Commands")
console.log("-".repeat(60))

const commandFiles = ["claude_test.md", "claude_component.md", "claude_review.md"]

for (const filename of commandFiles) {
  const commandPath = join(OPENCODE_DIR, "command", filename)
  try {
    const content = await readFile(commandPath, "utf-8")
    console.log(`\n${filename}:`)
    console.log("-".repeat(40))
    console.log(content)
  } catch {
    // File may not exist
  }
}

// ============================================================================
// Step 4: Template Syntax Reference
// ============================================================================

console.log()
console.log("Step 4: Template Syntax (100% Compatible)")
console.log("-".repeat(60))
console.log()
console.log("Both Claude Code and OpenCode support identical syntax:")
console.log()
console.log("  $ARGUMENTS    - All arguments as a single string")
console.log("                  /test src/ tests/  -> 'src/ tests/'")
console.log()
console.log("  $1, $2, $3... - Positional parameters")
console.log("                  /component Button  -> $1='Button'")
console.log()
console.log("  @filepath     - File content injection")
console.log("                  @src/index.ts -> (file contents)")
console.log()
console.log("  !`command`    - Shell output injection")
console.log("                  !`git branch`  -> 'main'")
console.log()

// ============================================================================
// Cleanup
// ============================================================================

console.log("Step 5: Cleanup")
console.log("-".repeat(60))

await rm(join(OPENCODE_DIR, "command"), { recursive: true, force: true })
console.log("Removed generated .opencode/command/ directory")
console.log()

// ============================================================================
// Summary
// ============================================================================

console.log("=".repeat(60))
console.log("Summary")
console.log("=".repeat(60))
console.log()
console.log("What happened:")
console.log("  1. discoverCommands() scanned .claude/commands/ for markdown files")
console.log("  2. Each command's frontmatter and template were parsed")
console.log("  3. syncCommandsToOpenCode() wrote converted commands to .opencode/command/")
console.log("  4. Commands are prefixed: claude_<name>.md")
console.log()
console.log("Key points:")
console.log("  - Template syntax is 100% compatible (no changes needed)")
console.log("  - Crosstrain adds 'agent: build' as default")
console.log("  - All template variables work identically")
console.log()
console.log("In a real OpenCode session:")
console.log("  - Commands appear in .opencode/command/ directory")
console.log("  - Users invoke them via /claude_test, /claude_component, etc.")
console.log("  - Arguments are substituted using the same syntax")
console.log()
