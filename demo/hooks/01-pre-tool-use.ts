/**
 * Demo 01: PreToolUse Hook Conversion
 * 
 * This demo shows how Claude Code PreToolUse hooks are converted to OpenCode
 * tool.execute.before event handlers.
 * 
 * Hooks in Claude Code are shell commands that execute at various lifecycle
 * points. PreToolUse hooks run before tools are executed and can block
 * execution if needed.
 */

import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"

const DEMO_DIR = join(process.cwd(), "temp-hook-demo-01")
const CLAUDE_DIR = join(DEMO_DIR, ".claude")

console.log("🎬 Demo 01: PreToolUse Hook Conversion\n")
console.log("=".repeat(70))
console.log()

// ============================================================================
// Step 1: Create Claude Code Hooks Configuration
// ============================================================================

console.log("📝 Step 1: Creating Claude Code Hooks")
console.log("-".repeat(70))

await mkdir(CLAUDE_DIR, { recursive: true })

// Create a settings.json with hooks
const settingsContent = {
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'About to modify files' | tee -a /tmp/crosstrain-hook.log"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'About to execute shell command' | tee -a /tmp/crosstrain-hook.log"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Tool execution completed' | tee -a /tmp/crosstrain-hook.log"
          }
        ]
      }
    ]
  }
}

await writeFile(
  join(CLAUDE_DIR, "settings.json"),
  JSON.stringify(settingsContent, null, 2),
  "utf-8"
)

console.log("✅ Created hooks configuration in settings.json")
console.log()

// ============================================================================
// Step 2: Explain hook structure
// ============================================================================

console.log("📋 Step 2: Hook Structure")
console.log("-".repeat(70))

console.log("Claude Code Hook Configuration:")
console.log()
console.log("PreToolUse:")
console.log("  - matcher: 'Edit|Write'  ← Pipe-separated tool names")
console.log("    hooks:")
console.log("      - type: command")
console.log("        command: 'echo ...'  ← Shell command to run")
console.log()

console.log("Matcher Patterns:")
console.log("  • 'Edit'        - Matches only Edit tool")
console.log("  • 'Edit|Write'  - Matches Edit OR Write")
console.log("  • '*' or ''     - Matches all tools")
console.log()

// ============================================================================
// Step 3: Show the conversion
// ============================================================================

console.log("🔄 Step 3: Conversion to OpenCode")
console.log("-".repeat(70))

console.log("Claude Code Hook → OpenCode Event Handler:")
console.log()
console.log("PreToolUse      → tool.execute.before")
console.log("PostToolUse     → tool.execute.after")
console.log("SessionStart    → session.created event")
console.log("SessionEnd      → session.idle event")
console.log("Notification    → tui.toast.show event")
console.log()

console.log("How it works in OpenCode:")
console.log()
console.log("1. Crosstrain reads settings.json hooks")
console.log("2. For PreToolUse, creates tool.execute.before handler")
console.log("3. Handler checks tool name against matchers")
console.log("4. If match found, executes shell command")
console.log("5. Command receives JSON input via stdin")
console.log("6. Exit code 2 blocks tool execution")
console.log()

// ============================================================================
// Step 4: Hook input format
// ============================================================================

console.log("📥 Step 4: Hook Input Format")
console.log("-".repeat(70))

console.log("When a hook runs, it receives JSON via stdin:")
console.log()

const hookInput = {
  tool_name: "Edit",
  tool_input: {
    path: "src/index.ts",
    content: "console.log('Hello')"
  },
  session_id: "sess_123",
  message_id: "msg_456"
}

console.log("PreToolUse input:")
console.log(JSON.stringify(hookInput, null, 2))
console.log()

console.log("Your hook script can:")
console.log("  • Parse this JSON to make decisions")
console.log("  • Log tool usage")
console.log("  • Validate tool arguments")
console.log("  • Block execution by exiting with code 2")
console.log()

// ============================================================================
// Step 5: Blocking execution example
// ============================================================================

console.log("🛑 Step 5: Blocking Tool Execution")
console.log("-".repeat(70))

console.log("Create a validation hook:")
console.log()

const validationHook = `#!/bin/bash

# Read JSON input
INPUT=$(cat)

# Parse tool name
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

# Check if trying to edit protected files
if [ "$TOOL" = "Edit" ]; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.path')
  
  if [[ "$FILE" == *"package.json"* ]]; then
    echo "ERROR: Cannot edit package.json without approval" >&2
    exit 2  # Exit code 2 blocks execution
  fi
fi

exit 0  # Allow execution
`

console.log(validationHook)
console.log()

console.log("When this hook runs:")
console.log("  1. Receives tool information as JSON")
console.log("  2. Checks if editing package.json")
console.log("  3. If yes, exits with code 2 (blocks)")
console.log("  4. OpenCode shows error to user")
console.log("  5. Tool execution is prevented")
console.log()

// ============================================================================
// Step 6: Common use cases
// ============================================================================

console.log("💡 Step 6: Common Hook Use Cases")
console.log("-".repeat(70))

console.log("1. **Audit Logging**")
console.log("   Log all tool usage to a file or service")
console.log("   Example: Track file modifications for compliance")
console.log()

console.log("2. **Validation**")
console.log("   Validate tool arguments before execution")
console.log("   Example: Ensure bash commands are safe")
console.log()

console.log("3. **Notifications**")
console.log("   Send alerts when certain tools are used")
console.log("   Example: Slack notification for production changes")
console.log()

console.log("4. **Rate Limiting**")
console.log("   Track tool usage and enforce limits")
console.log("   Example: Prevent too many API calls")
console.log()

console.log("5. **Environment Setup**")
console.log("   Prepare environment before tool execution")
console.log("   Example: Ensure docker containers are running")
console.log()

// ============================================================================
// Step 7: Hook execution behavior
// ============================================================================

console.log("⚙️  Step 7: Hook Execution Behavior")
console.log("-".repeat(70))

console.log("Exit Code Behavior:")
console.log("  • 0  - Success, allow tool execution")
console.log("  • 2  - Block execution, show error")
console.log("  • Other - Error logged, execution continues")
console.log()

console.log("Hook Output:")
console.log("  • stdout - Visible to user in OpenCode")
console.log("  • stderr - Shown as error message if blocking")
console.log()

console.log("Performance:")
console.log("  • Hooks execute synchronously")
console.log("  • Tool execution waits for hook completion")
console.log("  • Keep hooks fast to avoid delays")
console.log()

// ============================================================================
// Step 8: Differences from Claude Code
// ============================================================================

console.log("⚠️  Step 8: Important Differences")
console.log("-".repeat(70))

console.log("OpenCode Limitations:")
console.log()
console.log("  • Some hook types not supported:")
console.log("    ❌ PermissionRequest")
console.log("    ❌ UserPromptSubmit")
console.log("    ❌ PreCompact")
console.log()
console.log("  • Session hooks map approximately:")
console.log("    ⚠️  SessionEnd → session.idle")
console.log("    ⚠️  Stop → session.idle")
console.log("    ⚠️  SubagentStop → session.idle")
console.log()
console.log("  • Hook input format differs slightly:")
console.log("    ⚠️  Some context fields may not be available")
console.log()

console.log("What IS Supported:")
console.log("  ✅ PreToolUse → tool.execute.before")
console.log("  ✅ PostToolUse → tool.execute.after")
console.log("  ✅ Tool matchers (pipe-separated)")
console.log("  ✅ Blocking execution (exit code 2)")
console.log("  ✅ JSON input via stdin")
console.log()

// ============================================================================
// Step 9: Example hook scripts
// ============================================================================

console.log("📜 Step 9: Example Hook Scripts")
console.log("-".repeat(70))

console.log("Simple logging hook:")
console.log()

const loggingHook = `#!/bin/bash
# Log all tool usage
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "[$TIMESTAMP] Tool: $TOOL" >> /var/log/opencode-tools.log
exit 0
`

console.log(loggingHook)
console.log()

console.log("File modification protection:")
console.log()

const protectionHook = `#!/bin/bash
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

if [[ "$TOOL" == "Edit" || "$TOOL" == "Write" ]]; then
  FILE=$(echo "$INPUT" | jq -r '.tool_input.path')
  
  # Protect critical files
  PROTECTED=("package.json" "tsconfig.json" ".gitignore")
  
  for protected in "\${PROTECTED[@]}"; do
    if [[ "$FILE" == *"$protected"* ]]; then
      echo "Cannot modify protected file: $FILE" >&2
      exit 2
    fi
  done
fi

exit 0
`

console.log(protectionHook)
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
console.log("Claude Code Hooks:")
console.log("  📁 Configured in .claude/settings.json")
console.log("  🎯 PreToolUse, PostToolUse, SessionStart, etc.")
console.log("  🔧 Shell commands with JSON input")
console.log()
console.log("OpenCode Event Handlers:")
console.log("  📁 Created by crosstrain plugin dynamically")
console.log("  🎯 tool.execute.before, tool.execute.after")
console.log("  🔧 Same JSON input format")
console.log()
console.log("Key Features:")
console.log("  ✅ Tool matchers (pipe-separated patterns)")
console.log("  ✅ Blocking execution (exit code 2)")
console.log("  ✅ JSON input via stdin")
console.log("  ✅ stdout/stderr output")
console.log()
console.log("Common Uses:")
console.log("  • Audit logging")
console.log("  • Input validation")
console.log("  • Notifications")
console.log("  • Rate limiting")
console.log("  • Environment setup")
console.log()
console.log("✅ Demo Complete!")
console.log()

/**
 * Key Takeaways:
 * 
 * 1. PreToolUse hooks become tool.execute.before handlers
 * 2. Hooks receive JSON input via stdin
 * 3. Exit code 2 blocks tool execution
 * 4. Matchers support pipe-separated patterns
 * 5. Some Claude hook types don't have OpenCode equivalents
 * 
 * Next Steps:
 * - See 02-post-tool-use.ts for PostToolUse hooks
 * - See 03-session-events.ts for session lifecycle hooks
 * - Create your own validation or logging hooks!
 */
