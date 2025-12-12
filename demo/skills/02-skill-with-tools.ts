/**
 * Demo 02: Skill with Tool Restrictions
 * 
 * This demo shows how Claude Code Skills with specific tool restrictions
 * (allowed-tools) are converted and how these restrictions are communicated
 * to OpenCode.
 * 
 * In Claude Code, skills can specify which tools they're allowed to use.
 * In OpenCode, these restrictions are included in the tool description for
 * the LLM to follow, though they're not hard-enforced.
 */

import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"

const DEMO_DIR = join(process.cwd(), "temp-skill-demo-02")
const CLAUDE_DIR = join(DEMO_DIR, ".claude")

console.log("🎬 Demo 02: Skill with Tool Restrictions\n")
console.log("=" .repeat(70))
console.log()

// ============================================================================
// Create two skills with different tool restrictions
// ============================================================================

console.log("📝 Step 1: Creating Skills with Different Tool Restrictions")
console.log("-".repeat(70))

// Skill 1: Read-only skill (analysis only)
const analysisSkillDir = join(CLAUDE_DIR, "skills", "code-analyzer")
await mkdir(analysisSkillDir, { recursive: true })

const analysisSkillContent = `---
name: code-analyzer
description: Analyzes code structure and provides insights without making changes
allowed-tools: Read, Grep, Glob
---

# Code Analysis Skill

## Purpose
Analyze codebases to understand structure, patterns, and potential issues.

## Instructions

You are a READ-ONLY analyzer. Use only Read, Grep, and Glob tools to:

1. **Explore structure**: Use Glob to find files by pattern
2. **Search content**: Use Grep to find specific code patterns
3. **Read files**: Use Read to examine file contents
4. **Analyze patterns**: Identify common patterns, anti-patterns, and improvements

**IMPORTANT**: Never suggest or make changes. Only provide insights.

## Analysis Checklist

- [ ] Project structure and organization
- [ ] Code duplication and patterns
- [ ] Dependency usage
- [ ] Potential refactoring opportunities
- [ ] Documentation coverage
`

await writeFile(join(analysisSkillDir, "SKILL.md"), analysisSkillContent, "utf-8")
console.log("✅ Created read-only skill: code-analyzer")

// Skill 2: Refactoring skill (can make changes)
const refactorSkillDir = join(CLAUDE_DIR, "skills", "code-refactor")
await mkdir(refactorSkillDir, { recursive: true })

const refactorSkillContent = `---
name: code-refactor
description: Refactors code to improve quality and maintainability
allowed-tools: Read, Write, Edit, Bash, Grep
---

# Code Refactoring Skill

## Purpose
Perform safe code refactoring operations.

## Instructions

You can READ and WRITE code. Use these tools to:

1. **Read code**: Use Read and Grep to understand current implementation
2. **Edit files**: Use Edit to make targeted changes
3. **Run tests**: Use Bash to verify changes don't break functionality
4. **Verify**: Ensure all tests pass after refactoring

## Refactoring Patterns

### Extract Function
- Identify duplicated code
- Extract to a named function
- Update all call sites
- Run tests

### Rename Variables
- Choose descriptive names
- Update all references
- Ensure no conflicts
- Run tests

### Simplify Logic
- Remove nested conditionals
- Use early returns
- Apply guard clauses
- Run tests

**Always verify with tests!**
`

await writeFile(join(refactorSkillDir, "SKILL.md"), refactorSkillContent, "utf-8")
console.log("✅ Created read-write skill: code-refactor")
console.log()

// ============================================================================
// Show the conversion
// ============================================================================

console.log("🔄 Step 2: Tool Restriction Mapping")
console.log("-".repeat(70))

console.log("Skill 1: code-analyzer")
console.log("  Claude: allowed-tools: Read, Grep, Glob")
console.log("  OpenCode Tool: skill_code_analyzer")
console.log("  Description: 'Analyzes code structure and provides insights")
console.log("               without making changes (Restricted tools: Read, Grep, Glob)'")
console.log()

console.log("Skill 2: code-refactor")
console.log("  Claude: allowed-tools: Read, Write, Edit, Bash, Grep")
console.log("  OpenCode Tool: skill_code_refactor")
console.log("  Description: 'Refactors code to improve quality and maintainability")
console.log("               (Restricted tools: Read, Write, Edit, Bash, Grep)'")
console.log()

// ============================================================================
// Demonstrate usage scenarios
// ============================================================================

console.log("🎯 Step 3: Usage Scenarios")
console.log("-".repeat(70))

console.log("Scenario 1: Requesting code analysis")
console.log("  User: 'Analyze my codebase structure'")
console.log("  LLM:")
console.log("    1. Invokes skill_code_analyzer")
console.log("    2. Receives instructions about read-only analysis")
console.log("    3. Uses only Read, Grep, Glob tools (as instructed)")
console.log("    4. Provides insights without suggesting edits")
console.log()

console.log("Scenario 2: Requesting refactoring")
console.log("  User: 'Refactor the auth module'")
console.log("  LLM:")
console.log("    1. Invokes skill_code_refactor")
console.log("    2. Receives instructions about safe refactoring")
console.log("    3. Uses Read/Edit/Bash tools (as instructed)")
console.log("    4. Makes changes and runs tests")
console.log()

// ============================================================================
// Tool restriction behavior in OpenCode
// ============================================================================

console.log("⚙️  Step 4: How Tool Restrictions Work in OpenCode")
console.log("-".repeat(70))

console.log("Important differences from Claude Code:")
console.log()
console.log("Claude Code:")
console.log("  ❌ Hard enforcement - skill CANNOT use restricted tools")
console.log("  ❌ System prevents unauthorized tool usage")
console.log()
console.log("OpenCode (via crosstrain):")
console.log("  ✅ Soft guidance - restrictions shown in tool description")
console.log("  ✅ LLM follows instructions in skill content")
console.log("  ⚠️  No hard enforcement by OpenCode")
console.log()

console.log("Why this approach?")
console.log("  1. OpenCode custom tools don't support hard restrictions")
console.log("  2. LLMs are generally good at following instructions")
console.log("  3. Restrictions are clearly documented in two places:")
console.log("     - Tool description (visible to LLM)")
console.log("     - Skill instructions (loaded on invocation)")
console.log()

// ============================================================================
// Best practices
// ============================================================================

console.log("💡 Step 5: Best Practices")
console.log("-".repeat(70))

console.log("When defining tool restrictions in skills:")
console.log()
console.log("1. **Be explicit in instructions**")
console.log("   Don't just list allowed-tools, explain WHY")
console.log("   Example: 'You are READ-ONLY. Never modify files.'")
console.log()
console.log("2. **Reinforce in content**")
console.log("   Mention restrictions in the skill's markdown content")
console.log("   Example: '**IMPORTANT**: Never suggest or make changes.'")
console.log()
console.log("3. **Use descriptive skill names**")
console.log("   Name indicates capability: 'analyzer' vs 'refactor'")
console.log()
console.log("4. **Document expected behavior**")
console.log("   Explain what the skill should do step-by-step")
console.log()

// ============================================================================
// Tool name mapping reference
// ============================================================================

console.log("📋 Step 6: Claude ↔ OpenCode Tool Name Mapping")
console.log("-".repeat(70))

const toolMapping = {
  "Read": "read",
  "Write": "write",
  "Edit": "edit",
  "Bash": "bash",
  "Grep": "grep",
  "Glob": "glob",
  "WebFetch": "webfetch"
}

console.log("Claude Code Tool → OpenCode Tool")
for (const [claude, opencode] of Object.entries(toolMapping)) {
  console.log(`  ${claude.padEnd(10)} → ${opencode}`)
}
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
console.log("Claude Code Skills with allowed-tools:")
console.log("  📁 .claude/skills/*/SKILL.md (with allowed-tools in frontmatter)")
console.log()
console.log("OpenCode Conversion:")
console.log("  🔧 Custom tools with restrictions in description")
console.log("  📝 Instructions emphasize the restrictions")
console.log("  ⚠️  Soft guidance, not hard enforcement")
console.log()
console.log("Key Points:")
console.log("  • Tool restrictions are preserved and communicated")
console.log("  • LLM sees restrictions in tool description")
console.log("  • Skill content reinforces the restrictions")
console.log("  • Use clear naming and explicit instructions")
console.log()
console.log("✅ Demo Complete!")
console.log()

/**
 * Key Takeaways:
 * 
 * 1. allowed-tools restrictions are converted to tool descriptions
 * 2. OpenCode doesn't hard-enforce tool restrictions
 * 3. LLMs generally follow instruction-based restrictions
 * 4. Make restrictions explicit in both frontmatter and content
 * 5. Use descriptive skill names to indicate capability level
 * 
 * Next Steps:
 * - See 03-supporting-files.ts for skills with multiple files
 * - See ../agents/ for agent-level tool restrictions
 */
