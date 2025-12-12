/**
 * Demo 01: Basic Skill Conversion
 * 
 * This demo shows how a simple Claude Code Skill is converted to an OpenCode
 * custom tool and how to invoke it programmatically using the OpenCode SDK.
 * 
 * Claude Code Skills are markdown files with YAML frontmatter that provide
 * instructions to the AI. When converted by crosstrain, they become custom
 * tools that can be invoked by the LLM or programmatically.
 */

import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"

// ============================================================================
// Setup: Create a temporary project directory
// ============================================================================

const DEMO_DIR = join(process.cwd(), "temp-skill-demo-01")
const CLAUDE_DIR = join(DEMO_DIR, ".claude")
const SKILL_DIR = join(CLAUDE_DIR, "skills", "commit-helper")

console.log("🎬 Demo 01: Basic Skill Conversion\n")
console.log("=".repeat(70))
console.log()

// ============================================================================
// Step 1: Create a Claude Code Skill
// ============================================================================

console.log("📝 Step 1: Creating Claude Code Skill")
console.log("-".repeat(70))

// Create the skill directory structure
await mkdir(SKILL_DIR, { recursive: true })

// Create the SKILL.md file
const skillContent = `---
name: commit-helper
description: Generates clear, conventional commit messages from git diffs
allowed-tools: Bash, Read
---

# Commit Message Generator Skill

## Purpose
Generate conventional commit messages that follow best practices.

## Instructions

When invoked, you should:

1. **Analyze the changes**: Run \`git diff --staged\` to see what files have changed
2. **Identify the type**: Determine if this is a feat, fix, docs, refactor, etc.
3. **Write the message**: Create a commit message with:
   - Type and scope: \`type(scope): subject\`
   - Subject line: Clear, imperative mood, no period, < 72 chars
   - Body (optional): Explain the "what" and "why", not the "how"
   - Footer (optional): Breaking changes or issue references

## Examples

\`\`\`
feat(auth): add JWT token validation

Implement middleware to validate JWT tokens on protected routes.
Tokens are verified using the HS256 algorithm with a secret key.

Closes #123
\`\`\`

\`\`\`
fix(api): handle null response in user endpoint

Add null check before accessing user properties to prevent
TypeError when user is not found.
\`\`\`

## Conventional Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code restructuring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependencies
`

await writeFile(join(SKILL_DIR, "SKILL.md"), skillContent, "utf-8")

console.log(`✅ Created skill: ${SKILL_DIR}/SKILL.md`)
console.log()

// ============================================================================
// Step 2: Show how crosstrain would convert this
// ============================================================================

console.log("🔄 Step 2: Crosstrain Conversion Process")
console.log("-".repeat(70))

console.log("When crosstrain plugin loads this skill, it:")
console.log("  1. Discovers: .claude/skills/commit-helper/SKILL.md")
console.log("  2. Parses frontmatter to extract metadata")
console.log("  3. Creates OpenCode tool: 'skill_commit_helper'")
console.log("  4. Tool description: 'Generates clear, conventional commit messages from git diffs'")
console.log("  5. Tool includes restriction info: (Restricted tools: Bash, Read)")
console.log()

// ============================================================================
// Step 3: Simulate tool invocation
// ============================================================================

console.log("🚀 Step 3: Tool Invocation (Simulated)")
console.log("-".repeat(70))

// This is what would happen when the tool is invoked
const toolName = "skill_commit_helper"
const toolDescription = "Generates clear, conventional commit messages from git diffs (Restricted tools: Bash, Read)"

console.log(`Tool Name: ${toolName}`)
console.log(`Description: ${toolDescription}`)
console.log()

// Simulate tool execution
console.log("When the LLM invokes this tool, it receives:")
console.log()
console.log("```markdown")
console.log("## Skill: commit-helper")
console.log()
console.log("### Instructions")
console.log()
console.log(skillContent.split('---')[2].trim())
console.log("```")
console.log()

// ============================================================================
// Step 4: Usage in OpenCode
// ============================================================================

console.log("💡 Step 4: How to Use in OpenCode")
console.log("-".repeat(70))

console.log("The LLM can invoke this skill in several ways:")
console.log()
console.log("1. **Automatic invocation** (when relevant):")
console.log("   User: 'Help me write a commit message'")
console.log("   LLM: [invokes skill_commit_helper tool]")
console.log()
console.log("2. **With a specific query**:")
console.log("   User: 'Generate commit message for auth changes'")
console.log("   LLM: [invokes skill_commit_helper with query]")
console.log()
console.log("3. **Programmatic invocation** (via SDK):")
console.log("   ```typescript")
console.log("   const result = await client.tool.execute({")
console.log("     name: 'skill_commit_helper',")
console.log("     args: { query: 'Focus on breaking changes' }")
console.log("   })")
console.log("   ```")
console.log()

// ============================================================================
// Step 5: Benefits of this conversion
// ============================================================================

console.log("✨ Step 5: Benefits of Skill → Tool Conversion")
console.log("-".repeat(70))

console.log("✅ Claude Code Skills automatically work in OpenCode")
console.log("✅ No code changes needed - just install crosstrain plugin")
console.log("✅ Skills are discovered and loaded dynamically")
console.log("✅ Tool restrictions are documented in the description")
console.log("✅ Supporting files in skill directory are accessible")
console.log("✅ Works with both user-level (~/.claude) and project-level (.claude) skills")
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
console.log("Claude Code Asset:")
console.log("  📁 .claude/skills/commit-helper/SKILL.md")
console.log()
console.log("OpenCode Equivalent:")
console.log("  🔧 Custom Tool: skill_commit_helper")
console.log("  📝 Available to LLM as a tool it can invoke")
console.log("  🎯 Instructions loaded on demand")
console.log()
console.log("Key Mapping:")
console.log("  • Skill name → Tool name (skill_commit_helper)")
console.log("  • Description → Tool description")
console.log("  • Allowed-tools → Included in description")
console.log("  • Markdown content → Returned when tool is invoked")
console.log()
console.log("✅ Demo Complete!")
console.log()

/**
 * Key Takeaways:
 * 
 * 1. Skills become custom tools with 'skill_' prefix
 * 2. Tool description comes from skill frontmatter
 * 3. Instructions are returned when the tool is invoked
 * 4. Tool restrictions are documented but not enforced
 * 5. No manual conversion needed - crosstrain handles it all
 * 
 * Next Steps:
 * - See 02-skill-with-tools.ts for advanced tool restrictions
 * - See 03-supporting-files.ts for skills with multiple files
 */
