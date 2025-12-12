/**
 * Full Plugin Integration Tests
 *
 * Tests the complete plugin flow including:
 * - Plugin initialization
 * - Asset discovery and conversion
 * - File watching
 * - Tool execution
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { existsSync } from "fs"
import { readFile, readdir } from "fs/promises"

import { CrosstrainPlugin, crosstrainInfoTool } from "../index"
import { createTestDirectory, createMockHomeDir, type TestDirectory } from "./utils"

describe("CrosstrainPlugin", () => {
  let testDir: TestDirectory
  let mockHome: { path: string; cleanup: () => Promise<void> }

  beforeAll(async () => {
    // Create test directory with all fixtures
    testDir = await createTestDirectory("plugin-full", {
      copySkills: true,
      copyAgents: true,
      copyCommands: true,
      copySettings: true,
    })
    mockHome = await createMockHomeDir()
  })

  afterAll(async () => {
    await testDir.cleanup()
    await mockHome.cleanup()
  })

  describe("Plugin Initialization", () => {
    it("should initialize plugin with all asset types", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult).toBeDefined()
    })

    it("should return tools from skills", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult.tool).toBeDefined()
      const toolNames = Object.keys(pluginResult.tool || {})
      expect(toolNames.length).toBeGreaterThan(0)
      expect(toolNames.some(n => n.startsWith("skill_"))).toBe(true)
    })

    it("should sync agents to OpenCode directory", async () => {
      await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const agentDir = join(testDir.openCodeDir, "agent")
      expect(existsSync(agentDir)).toBe(true)

      const files = await readdir(agentDir)
      const claudeAgents = files.filter(f => f.startsWith("claude_"))
      expect(claudeAgents.length).toBeGreaterThan(0)
    })

    it("should sync commands to OpenCode directory", async () => {
      await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const commandDir = join(testDir.openCodeDir, "command")
      expect(existsSync(commandDir)).toBe(true)

      const files = await readdir(commandDir)
      const claudeCommands = files.filter(f => f.startsWith("claude_"))
      expect(claudeCommands.length).toBeGreaterThan(0)
    })

    it("should build hook handlers", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      // Check that hook handlers exist (they should since we have settings.json)
      expect(
        pluginResult["tool.execute.before"] !== undefined ||
        pluginResult["tool.execute.after"] !== undefined
      ).toBe(true)
    })

    it("should not fail when no project-level Claude assets exist", async () => {
      // Note: The plugin may still pick up user-level assets from ~/.claude/
      // This test verifies the plugin handles an empty project gracefully
      const emptyDir = await createTestDirectory("plugin-empty")

      const pluginResult = await CrosstrainPlugin({
        project: { path: emptyDir.root },
        directory: emptyDir.root,
        worktree: emptyDir.root,
        client: null,
        $: null,
      })

      // Plugin should initialize without error
      // If user has assets in ~/.claude, they will be loaded (expected behavior)
      expect(pluginResult).toBeDefined()

      await emptyDir.cleanup()
    })
  })

  describe("Generated Agent Files", () => {
    it("should create valid OpenCode agent format", async () => {
      await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const agentPath = join(testDir.openCodeDir, "agent", "claude_test-reviewer.md")
      expect(existsSync(agentPath)).toBe(true)

      const content = await readFile(agentPath, "utf-8")

      // Check frontmatter structure
      expect(content.startsWith("---")).toBe(true)
      expect(content).toContain("description:")
      expect(content).toContain("mode: subagent")

      // Check model mapping
      expect(content).toContain("anthropic/claude-sonnet")

      // Check permission mapping
      expect(content).toContain("permission:")

      // Check system prompt preserved
      expect(content).toContain("test review specialist")
    })

    it("should include skill references in agent prompts", async () => {
      await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const agentPath = join(testDir.openCodeDir, "agent", "claude_test-reviewer.md")
      const content = await readFile(agentPath, "utf-8")

      // Should reference the code-helper skill as a tool
      expect(content).toContain("Available Skills")
      expect(content).toContain("skill_code_helper")
    })
  })

  describe("Generated Command Files", () => {
    it("should create valid OpenCode command format", async () => {
      await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const commandPath = join(testDir.openCodeDir, "command", "claude_run-tests.md")
      expect(existsSync(commandPath)).toBe(true)

      const content = await readFile(commandPath, "utf-8")

      // Check frontmatter structure
      expect(content.startsWith("---")).toBe(true)
      expect(content).toContain("description:")
      expect(content).toContain("agent:")

      // Check template preserved
      expect(content).toContain("$ARGUMENTS")
    })
  })

  describe("Tool Execution", () => {
    it("should execute skill tools successfully", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const tools = pluginResult.tool!
      const skillTool = tools["skill_code_helper"]
      expect(skillTool).toBeDefined()

      const result = await skillTool.execute(
        {},
        { agent: "test", sessionID: "test-session", messageID: "test-msg" }
      )

      expect(typeof result).toBe("string")
      expect(result).toContain("Skill: code-helper")
      expect(result).toContain("Instructions")
    })

    it("should include query in skill tool output", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const tools = pluginResult.tool!
      const skillTool = tools["skill_code_helper"]

      const result = await skillTool.execute(
        { query: "Analyze my code" },
        { agent: "test", sessionID: "test-session", messageID: "test-msg" }
      )

      expect(result).toContain("Query: Analyze my code")
    })
  })

  describe("crosstrainInfoTool", () => {
    it("should return status information", async () => {
      const result = await crosstrainInfoTool.execute(
        {},
        { agent: "test", sessionID: "test-session", messageID: "test-msg" }
      )

      expect(typeof result).toBe("string")
      expect(result).toContain("Crosstrain Plugin Status")
      expect(result).toContain("Loaded Claude Code Assets")
    })
  })
})

describe("Plugin Edge Cases", () => {
  describe("Missing Directories", () => {
    it("should handle missing skills directory gracefully", async () => {
      const testDir = await createTestDirectory("no-skills-dir", {
        copyAgents: true,
      })

      // Should not throw
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult).toBeDefined()
      await testDir.cleanup()
    })

    it("should handle missing agents directory gracefully", async () => {
      const testDir = await createTestDirectory("no-agents-dir", {
        copySkills: true,
      })

      // Should not throw
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult).toBeDefined()
      await testDir.cleanup()
    })
  })

  describe("Malformed Assets", () => {
    it("should skip skills without SKILL.md", async () => {
      const testDir = await createTestDirectory("invalid-skill")
      const { mkdir, writeFile } = await import("fs/promises")

      // Create skill directory without SKILL.md
      await mkdir(join(testDir.claudeDir, "skills", "broken-skill"), {
        recursive: true,
      })
      await writeFile(
        join(testDir.claudeDir, "skills", "broken-skill", "other.txt"),
        "not a skill file"
      )

      // Create a valid skill too so we can verify only valid ones are loaded
      await mkdir(join(testDir.claudeDir, "skills", "valid-skill"), {
        recursive: true,
      })
      await writeFile(
        join(testDir.claudeDir, "skills", "valid-skill", "SKILL.md"),
        "---\nname: valid-skill\ndescription: A valid skill\n---\n\nValid skill content"
      )

      // Use a mock home directory to isolate from user's actual home
      const isolatedHome = await createMockHomeDir()

      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      // Should only load the valid skill, not the broken one
      // Note: We check that valid skills load and broken ones don't
      const tools = pluginResult.tool || {}
      const toolNames = Object.keys(tools)
      expect(toolNames.some(n => n === "skill_valid_skill")).toBe(true)
      expect(toolNames.some(n => n === "skill_broken_skill")).toBe(false)

      await testDir.cleanup()
      await isolatedHome.cleanup()
    })

    it("should skip agents with invalid frontmatter", async () => {
      const testDir = await createTestDirectory("invalid-agent")
      const { mkdir, writeFile } = await import("fs/promises")

      // Create agent with invalid YAML
      await mkdir(join(testDir.claudeDir, "agents"), { recursive: true })
      await writeFile(
        join(testDir.claudeDir, "agents", "broken-agent.md"),
        "This has no frontmatter at all, just content"
      )

      // Should not throw
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult).toBeDefined()
      await testDir.cleanup()
    })

    it("should skip commands with invalid format", async () => {
      const testDir = await createTestDirectory("invalid-command")
      const { mkdir, writeFile } = await import("fs/promises")

      // Create command without proper frontmatter
      await mkdir(join(testDir.claudeDir, "commands"), { recursive: true })
      await writeFile(
        join(testDir.claudeDir, "commands", "broken-command.md"),
        "No frontmatter here"
      )

      // Should not throw
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult).toBeDefined()
      await testDir.cleanup()
    })
  })
})
