/**
 * Integration tests for the crosstrain plugin
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { existsSync } from "fs"
import { mkdir, rm, writeFile } from "fs/promises"
import { homedir } from "os"

import { discoverSkills, convertSkillToTool } from "../loaders/skills"
import { discoverAgents, convertAgentFrontmatter, generateOpenCodeAgent } from "../loaders/agents"
import { discoverCommands, convertCommandFrontmatter, generateOpenCodeCommand } from "../loaders/commands"
import { loadClaudeHooksConfig } from "../loaders/hooks"

const TEST_DIR = join(process.cwd(), ".test-claude")
const HOME_DIR = homedir()

describe("Skills Loader", () => {
  beforeAll(async () => {
    // Create test skill directory
    await mkdir(join(TEST_DIR, "skills", "test-skill"), { recursive: true })
    await writeFile(
      join(TEST_DIR, "skills", "test-skill", "SKILL.md"),
      `---
name: test-skill
description: A test skill for unit testing
allowed-tools: Read, Grep
---

# Test Skill

This is a test skill for integration testing.
`
    )
  })

  afterAll(async () => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true })
    }
  })

  it("should discover skills from directory", async () => {
    const skills = await discoverSkills(TEST_DIR, HOME_DIR)

    expect(skills.length).toBeGreaterThanOrEqual(1)
    const testSkill = skills.find((s) => s.name === "test-skill")
    expect(testSkill).toBeDefined()
    expect(testSkill?.description).toBe("A test skill for unit testing")
    expect(testSkill?.allowedTools).toEqual(["Read", "Grep"])
  })

  it("should convert skill to tool", async () => {
    const skills = await discoverSkills(TEST_DIR, HOME_DIR)
    const testSkill = skills.find((s) => s.name === "test-skill")

    expect(testSkill).toBeDefined()
    if (testSkill) {
      const tool = convertSkillToTool(testSkill)
      expect(tool).toBeDefined()
    }
  })
})

describe("Agents Loader", () => {
  beforeAll(async () => {
    // Create test agent
    await mkdir(join(TEST_DIR, "agents"), { recursive: true })
    await writeFile(
      join(TEST_DIR, "agents", "test-agent.md"),
      `---
name: test-agent
description: A test agent for unit testing
tools: Read, Write, Bash
model: sonnet
permissionMode: plan
---

You are a test agent for integration testing.
`
    )
  })

  afterAll(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true })
    }
  })

  it("should discover agents from directory", async () => {
    const agents = await discoverAgents(TEST_DIR, HOME_DIR)

    expect(agents.length).toBeGreaterThanOrEqual(1)
    const testAgent = agents.find((a) => a.name === "test-agent")
    expect(testAgent).toBeDefined()
    expect(testAgent?.description).toBe("A test agent for unit testing")
    expect(testAgent?.tools).toEqual(["Read", "Write", "Bash"])
    expect(testAgent?.model).toBe("sonnet")
    expect(testAgent?.permissionMode).toBe("plan")
  })

  it("should convert agent frontmatter correctly", async () => {
    const agents = await discoverAgents(TEST_DIR, HOME_DIR)
    const testAgent = agents.find((a) => a.name === "test-agent")

    expect(testAgent).toBeDefined()
    if (testAgent) {
      const frontmatter = convertAgentFrontmatter(testAgent)

      expect(frontmatter.description).toBe("A test agent for unit testing")
      expect(frontmatter.mode).toBe("subagent")
      expect(frontmatter.model).toBe("anthropic/claude-sonnet-4-20250514")
      expect(frontmatter.permission).toEqual({ edit: "deny", bash: "deny" })
      expect(frontmatter.tools?.read).toBe(true)
      expect(frontmatter.tools?.write).toBe(true)
      expect(frontmatter.tools?.bash).toBe(true)
      expect(frontmatter.tools?.edit).toBe(false) // Not in original tools list
    }
  })

  it("should generate OpenCode agent markdown", async () => {
    const agents = await discoverAgents(TEST_DIR, HOME_DIR)
    const testAgent = agents.find((a) => a.name === "test-agent")

    expect(testAgent).toBeDefined()
    if (testAgent) {
      const markdown = generateOpenCodeAgent(testAgent)

      expect(markdown).toContain("description: A test agent for unit testing")
      expect(markdown).toContain("mode: subagent")
      expect(markdown).toContain("You are a test agent")
      expect(markdown).toContain("[Loaded from Claude Code:")
    }
  })
})

describe("Commands Loader", () => {
  beforeAll(async () => {
    // Create test command
    await mkdir(join(TEST_DIR, "commands"), { recursive: true })
    await writeFile(
      join(TEST_DIR, "commands", "test-command.md"),
      `---
description: A test command for unit testing
---

Run the test with argument: $ARGUMENTS

Use file: @src/test.ts
`
    )
  })

  afterAll(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true })
    }
  })

  it("should discover commands from directory", async () => {
    const commands = await discoverCommands(TEST_DIR, HOME_DIR)

    expect(commands.length).toBeGreaterThanOrEqual(1)
    const testCommand = commands.find((c) => c.name === "test-command")
    expect(testCommand).toBeDefined()
    expect(testCommand?.description).toBe("A test command for unit testing")
    expect(testCommand?.template).toContain("$ARGUMENTS")
    expect(testCommand?.template).toContain("@src/test.ts")
  })

  it("should convert command frontmatter correctly", async () => {
    const commands = await discoverCommands(TEST_DIR, HOME_DIR)
    const testCommand = commands.find((c) => c.name === "test-command")

    expect(testCommand).toBeDefined()
    if (testCommand) {
      const frontmatter = convertCommandFrontmatter(testCommand)

      expect(frontmatter.description).toBe("A test command for unit testing")
      expect(frontmatter.agent).toBe("build")
    }
  })

  it("should generate OpenCode command markdown", async () => {
    const commands = await discoverCommands(TEST_DIR, HOME_DIR)
    const testCommand = commands.find((c) => c.name === "test-command")

    expect(testCommand).toBeDefined()
    if (testCommand) {
      const markdown = generateOpenCodeCommand(testCommand)

      expect(markdown).toContain("description: A test command for unit testing")
      expect(markdown).toContain("$ARGUMENTS")
      expect(markdown).toContain("@src/test.ts")
    }
  })
})

describe("Hooks Loader", () => {
  beforeAll(async () => {
    // Create test settings.json with hooks
    await mkdir(TEST_DIR, { recursive: true })
    await writeFile(
      join(TEST_DIR, "settings.json"),
      JSON.stringify(
        {
          hooks: {
            PreToolUse: [
              {
                matcher: "Bash",
                hooks: [{ type: "command", command: "echo 'pre-tool'" }],
              },
            ],
            PostToolUse: [
              {
                matcher: "Edit|Write",
                hooks: [{ type: "command", command: "echo 'post-tool'" }],
              },
            ],
          },
        },
        null,
        2
      )
    )
  })

  afterAll(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true })
    }
  })

  it("should load hooks configuration", async () => {
    const config = await loadClaudeHooksConfig(TEST_DIR, HOME_DIR)

    expect(config).toBeDefined()
    expect(config?.PreToolUse).toHaveLength(1)
    expect(config?.PreToolUse?.[0].matcher).toBe("Bash")
    expect(config?.PostToolUse).toHaveLength(1)
    expect(config?.PostToolUse?.[0].matcher).toBe("Edit|Write")
  })
})
