/**
 * Demo 01: Hook Loading and Conversion
 *
 * This demo shows how the crosstrain plugin discovers Claude Code hooks
 * from settings.json and converts them to OpenCode event handlers.
 *
 * Run: bun run demo/hooks/01-pre-tool-use.ts
 */

import { join } from "path"
import { readFile } from "fs/promises"
import { loadClaudeHooksConfig, buildHookHandlers } from "../../src/loaders/hooks"
import { HOOK_EVENT_MAPPING } from "../../src/types"

// Point to our fixtures directory
const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures")
const CLAUDE_DIR = join(FIXTURES_DIR, ".claude")

console.log("Demo 01: Hook Loading and Conversion\n")
console.log("=".repeat(60))
console.log()

// ============================================================================
// Step 1: Show Claude Code Hook Configuration
// ============================================================================

console.log("Step 1: Claude Code Hook Configuration")
console.log("-".repeat(60))
console.log(`Reading: ${CLAUDE_DIR}/settings.json`)
console.log()

const settingsContent = await readFile(join(CLAUDE_DIR, "settings.json"), "utf-8")
console.log("settings.json content:")
console.log(settingsContent)

// ============================================================================
// Step 2: Load Hook Configuration
// ============================================================================

console.log("Step 2: Loading Hook Configuration")
console.log("-".repeat(60))

const hooksConfig = await loadClaudeHooksConfig(CLAUDE_DIR, "")

if (hooksConfig) {
  console.log("Parsed hooks configuration:\n")

  if (hooksConfig.PreToolUse) {
    console.log("  PreToolUse hooks:")
    for (const matcher of hooksConfig.PreToolUse) {
      console.log(`    - Matcher: "${matcher.matcher}"`)
      for (const hook of matcher.hooks) {
        console.log(`      Command: ${hook.command}`)
      }
    }
    console.log()
  }

  if (hooksConfig.PostToolUse) {
    console.log("  PostToolUse hooks:")
    for (const matcher of hooksConfig.PostToolUse) {
      console.log(`    - Matcher: "${matcher.matcher}"`)
      for (const hook of matcher.hooks) {
        console.log(`      Command: ${hook.command}`)
      }
    }
    console.log()
  }
} else {
  console.log("No hooks configuration found")
}

// ============================================================================
// Step 3: Build OpenCode Event Handlers
// ============================================================================

console.log("Step 3: Building OpenCode Event Handlers")
console.log("-".repeat(60))

const handlers = await buildHookHandlers(CLAUDE_DIR, "")

console.log("Built handlers:")
console.log(`  tool.execute.before: ${handlers.toolExecuteBefore ? "Yes" : "No"}`)
console.log(`  tool.execute.after: ${handlers.toolExecuteAfter ? "Yes" : "No"}`)
console.log(`  event handler: ${handlers.event ? "Yes" : "No"}`)
console.log()

// ============================================================================
// Step 4: Simulate Hook Execution
// ============================================================================

console.log("Step 4: Simulating Hook Execution")
console.log("-".repeat(60))

if (handlers.toolExecuteBefore) {
  console.log("Simulating PreToolUse hook for Edit tool...")
  console.log()

  // Create mock tool execution input
  const mockInput = {
    tool: { name: "Edit" },
    args: { path: "src/index.ts", content: "console.log('hello')" },
  }

  try {
    await handlers.toolExecuteBefore(mockInput, {})
    console.log("Hook executed successfully (exit code 0)")
  } catch (error) {
    console.log(`Hook blocked execution: ${error}`)
  }
  console.log()
}

// ============================================================================
// Step 5: Hook Event Mapping Reference
// ============================================================================

console.log("Step 5: Hook Event Mapping Reference")
console.log("-".repeat(60))
console.log()
console.log("Claude Code Hook -> OpenCode Handler:")
console.log()

for (const [claudeHook, openCodeEvent] of Object.entries(HOOK_EVENT_MAPPING)) {
  console.log(`  ${claudeHook.padEnd(20)} -> ${openCodeEvent}`)
}
console.log()

console.log("Exit Code Behavior:")
console.log("  0    -> Success, allow execution")
console.log("  2    -> Block execution (PreToolUse only)")
console.log("  Other -> Error logged, execution continues")
console.log()

// ============================================================================
// Step 6: Matcher Patterns
// ============================================================================

console.log("Step 6: Matcher Patterns")
console.log("-".repeat(60))
console.log()
console.log("Matchers support pipe-separated patterns:")
console.log()
console.log("  'Edit'        - Matches only Edit tool")
console.log("  'Edit|Write'  - Matches Edit OR Write")
console.log("  '*'           - Matches all tools")
console.log("  ''            - Also matches all tools")
console.log()

// ============================================================================
// Summary
// ============================================================================

console.log("=".repeat(60))
console.log("Summary")
console.log("=".repeat(60))
console.log()
console.log("What happened:")
console.log("  1. loadClaudeHooksConfig() read .claude/settings.json")
console.log("  2. Hooks were parsed from the 'hooks' key")
console.log("  3. buildHookHandlers() created OpenCode event handlers")
console.log("  4. Handlers execute shell commands when tools are used")
console.log()
console.log("Key conversions:")
console.log("  - PreToolUse  -> tool.execute.before")
console.log("  - PostToolUse -> tool.execute.after")
console.log("  - SessionStart/End -> session events")
console.log()
console.log("In a real OpenCode session:")
console.log("  - Hooks run automatically when matching tools execute")
console.log("  - Exit code 2 blocks tool execution")
console.log("  - Hooks receive JSON input via stdin")
console.log()
