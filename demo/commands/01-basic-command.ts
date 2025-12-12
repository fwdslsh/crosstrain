/**
 * Demo 01: Basic Command Conversion
 * 
 * This demo shows how Claude Code slash commands are converted to OpenCode
 * commands with full template compatibility.
 * 
 * Commands are user-invoked prompts that can include variables, file references,
 * and shell output. The template syntax is largely compatible between Claude
 * Code and OpenCode.
 */

import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"

const DEMO_DIR = join(process.cwd(), "temp-command-demo-01")
const CLAUDE_DIR = join(DEMO_DIR, ".claude")
const OPENCODE_DIR = join(DEMO_DIR, ".opencode")
const COMMANDS_DIR = join(CLAUDE_DIR, "commands")

console.log("🎬 Demo 01: Basic Command Conversion\n")
console.log("=" .repeat(70))
console.log()

// ============================================================================
// Step 1: Create Claude Code Commands
// ============================================================================

console.log("📝 Step 1: Creating Claude Code Commands")
console.log("-".repeat(70))

await mkdir(COMMANDS_DIR, { recursive: true })

// Command 1: Simple command with $ARGUMENTS
const testCommand = `---
description: Run tests with coverage reporting
---

Run the test suite for $ARGUMENTS.

If no arguments provided, run all tests.
Show any failing tests and suggest fixes.
Generate a coverage report.
`

await writeFile(join(COMMANDS_DIR, "test.md"), testCommand, "utf-8")
console.log("✅ Created command: test.md")

// Command 2: Command with positional parameters
const componentCommand = `---
description: Create a new React component
---

Create a new React component with the following specifications:

- Component name: $1
- Component type: $2 (default to "functional" if not specified)
- Include TypeScript types: yes
- Include basic props interface
- Include example usage in comments

Place the component in src/components/$1.tsx
`

await writeFile(join(COMMANDS_DIR, "component.md"), componentCommand, "utf-8")
console.log("✅ Created command: component.md")

// Command 3: Command with file reference
const refactorCommand = `---
description: Refactor a specific file
---

Refactor @$1 to improve code quality:

1. Extract repeated logic into helper functions
2. Improve variable names for clarity
3. Add JSDoc comments
4. Simplify complex conditionals
5. Run tests to verify no breakage

Focus on maintainability and readability.
`

await writeFile(join(COMMANDS_DIR, "refactor.md"), refactorCommand, "utf-8")
console.log("✅ Created command: refactor.md")

console.log()

// ============================================================================
// Step 2: Show template syntax compatibility
// ============================================================================

console.log("📋 Step 2: Template Syntax Compatibility")
console.log("-".repeat(70))

console.log("Both Claude Code and OpenCode support:")
console.log()

console.log("1. **$ARGUMENTS** - All arguments as a single string")
console.log("   Example: /test src/ tests/")
console.log("   Expands to: 'src/ tests/'")
console.log()

console.log("2. **$1, $2, $3...** - Individual positional arguments")
console.log("   Example: /component Button functional")
console.log("   $1 = 'Button'")
console.log("   $2 = 'functional'")
console.log()

console.log("3. **@filepath** - File path references")
console.log("   Example: /refactor src/auth.ts")
console.log("   @$1 loads the content of src/auth.ts")
console.log()

console.log("4. **!`command`** - Shell command output injection")
console.log("   Example: Current git branch is !`git branch --show-current`")
console.log("   Expands to: 'Current git branch is main'")
console.log()

console.log("✅ 100% syntax compatibility - no conversion needed!")
console.log()

// ============================================================================
// Step 3: Show the conversion
// ============================================================================

console.log("🔄 Step 3: Conversion Process")
console.log("-".repeat(70))

await mkdir(join(OPENCODE_DIR, "command"), { recursive: true })

console.log("Crosstrain converts commands by:")
console.log()
console.log("1. Reading from: .claude/commands/*.md")
console.log("2. Parsing frontmatter and template content")
console.log("3. Adding 'agent: build' to frontmatter (default)")
console.log("4. Preserving template content exactly")
console.log("5. Writing to: .opencode/command/claude_*.md")
console.log()

// Simulate conversion
const convertedTestCommand = `---
description: Run tests with coverage reporting
agent: build
---

Run the test suite for $ARGUMENTS.

If no arguments provided, run all tests.
Show any failing tests and suggest fixes.
Generate a coverage report.

---
*[Loaded from Claude Code: .claude/commands/test.md]*
`

await writeFile(join(OPENCODE_DIR, "command", "claude_test.md"), convertedTestCommand, "utf-8")
console.log("✅ Converted: claude_test.md")

const convertedComponentCommand = `---
description: Create a new React component
agent: build
---

Create a new React component with the following specifications:

- Component name: $1
- Component type: $2 (default to "functional" if not specified)
- Include TypeScript types: yes
- Include basic props interface
- Include example usage in comments

Place the component in src/components/$1.tsx

---
*[Loaded from Claude Code: .claude/commands/component.md]*
`

await writeFile(join(OPENCODE_DIR, "command", "claude_component.md"), convertedComponentCommand, "utf-8")
console.log("✅ Converted: claude_component.md")

console.log()

// ============================================================================
// Step 4: Usage examples
// ============================================================================

console.log("💡 Step 4: Using Converted Commands")
console.log("-".repeat(70))

console.log("Command 1: /claude_test")
console.log("  Usage: /claude_test src/ tests/integration/")
console.log("  Result: Runs tests for specified directories")
console.log()

console.log("Command 2: /claude_component")
console.log("  Usage: /claude_component LoginButton functional")
console.log("  Result: Creates src/components/LoginButton.tsx")
console.log()

console.log("Command 3: /claude_refactor")
console.log("  Usage: /claude_refactor src/utils/auth.ts")
console.log("  Result: Refactors the specified file")
console.log()

// ============================================================================
// Step 5: Advanced template features
// ============================================================================

console.log("🚀 Step 5: Advanced Template Features")
console.log("-".repeat(70))

console.log("Combining multiple features in one command:")
console.log()

const advancedCommand = `---
description: Review changes and create commit
---

Review the staged changes and create a commit:

Current branch: !`git branch --show-current`

Staged files:
!`git diff --staged --name-only`

Staged changes:
@!`git diff --staged`

Based on these changes:
1. Analyze the modifications
2. Generate a conventional commit message
3. Include the commit message in your response
4. Ask for confirmation before committing
`

console.log("Example command template:")
console.log(advancedCommand)

console.log("This command:")
console.log("  • Captures current git branch")
console.log("  • Lists staged files")
console.log("  • Loads full diff content")
console.log("  • Generates appropriate commit message")
console.log()

// ============================================================================
// Step 6: Command configuration options
// ============================================================================

console.log("⚙️  Step 6: Command Configuration Options")
console.log("-".repeat(70))

console.log("Additional frontmatter options in OpenCode:")
console.log()

const configuredCommand = `---
description: Review pull request
agent: plan         # Use the 'plan' agent (read-only)
model: anthropic/claude-opus-4-20250514  # Use specific model
subtask: true       # Run as a subagent task
---

Review the pull request and provide feedback...
`

console.log(configuredCommand)

console.log("Options explained:")
console.log("  • agent: Which agent to use (default: build)")
console.log("  • model: Override model for this command")
console.log("  • subtask: Run as a subagent task")
console.log()

console.log("Note: Claude Code commands don't have these options,")
console.log("      so crosstrain uses sensible defaults:")
console.log("      - agent: build")
console.log("      - model: (inherited)")
console.log("      - subtask: false")
console.log()

// ============================================================================
// Step 7: Benefits
// ============================================================================

console.log("✨ Step 7: Benefits of Command Conversion")
console.log("-".repeat(70))

console.log("✅ 100% template syntax compatibility")
console.log("✅ All variables work exactly the same")
console.log("✅ File references (@filepath) preserved")
console.log("✅ Shell output injection (!`cmd`) preserved")
console.log("✅ No learning curve - same syntax")
console.log("✅ Commands work immediately after conversion")
console.log()

console.log("Additional benefits in OpenCode:")
console.log("  • Can specify which agent to use")
console.log("  • Can override model per command")
console.log("  • Can run commands as subtasks")
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

console.log("=" .repeat(70))
console.log("📊 Summary")
console.log("=" .repeat(70))
console.log()
console.log("Claude Code Commands:")
console.log("  📁 .claude/commands/*.md")
console.log("  📝 Template syntax: $ARGUMENTS, $1, @file, !`cmd`")
console.log()
console.log("OpenCode Commands:")
console.log("  📁 .opencode/command/claude_*.md")
console.log("  📝 Same template syntax (100% compatible)")
console.log("  ⚙️  Additional config: agent, model, subtask")
console.log()
console.log("Conversion Process:")
console.log("  1. Read Claude command markdown")
console.log("  2. Parse frontmatter and template")
console.log("  3. Add 'agent: build' to frontmatter")
console.log("  4. Preserve template exactly (no changes)")
console.log("  5. Write to OpenCode command directory")
console.log()
console.log("Template Features (Compatible):")
console.log("  • $ARGUMENTS - All arguments as string ✅")
console.log("  • $1, $2, ... - Positional parameters ✅")
console.log("  • @filepath - File content injection ✅")
console.log("  • !`command` - Shell output injection ✅")
console.log()
console.log("✅ Demo Complete!")
console.log()

/**
 * Key Takeaways:
 * 
 * 1. Command template syntax is 100% compatible
 * 2. No changes needed to template content
 * 3. Crosstrain adds sensible defaults (agent: build)
 * 4. All variable types work identically
 * 5. OpenCode adds optional configuration features
 * 
 * Next Steps:
 * - See 02-command-with-files.ts for file reference details
 * - See 03-command-with-shell.ts for shell injection examples
 * - Try creating your own commands!
 */
