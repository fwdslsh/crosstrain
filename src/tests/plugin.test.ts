/**
 * Plugin Integration Tests
 *
 * Tests the crosstrain OpenCode plugin which exposes CLI wrapper tools.
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test"
import { join } from "path"

import { CrosstrainPlugin } from "../index"
import { createTestDirectory, type TestDirectory } from "./utils"

describe("CrosstrainPlugin", () => {
  let testDir: TestDirectory

  beforeAll(async () => {
    testDir = await createTestDirectory("plugin-test", {
      copySkills: true,
      copyAgents: true,
      copyCommands: true,
      copySettings: true,
    })
  })

  afterAll(async () => {
    await testDir.cleanup()
  })

  describe("Plugin Initialization", () => {
    it("should initialize plugin and return tool definitions", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      expect(pluginResult).toBeDefined()
      expect(pluginResult.tool).toBeDefined()
    })

    it("should expose crosstrain CLI wrapper tools", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const tools = pluginResult.tool!
      const toolNames = Object.keys(tools)

      // Check that expected CLI wrapper tools are present
      expect(toolNames).toContain("crosstrain")
      expect(toolNames).toContain("crosstrain_convert_all")
      expect(toolNames).toContain("crosstrain_convert_plugin")
      expect(toolNames).toContain("crosstrain_list_marketplace")
      expect(toolNames).toContain("crosstrain_convert_command")
      expect(toolNames).toContain("crosstrain_convert_skill")
      expect(toolNames).toContain("crosstrain_convert_agent")
      expect(toolNames).toContain("crosstrain_convert_mcp")
      expect(toolNames).toContain("crosstrain_show_hooks")
      expect(toolNames).toContain("crosstrain_init")
      expect(toolNames).toContain("crosstrain_help")
    })

    it("should not fail when no project-level Claude assets exist", async () => {
      const emptyDir = await createTestDirectory("plugin-empty")

      const pluginResult = await CrosstrainPlugin({
        project: { path: emptyDir.root },
        directory: emptyDir.root,
        worktree: emptyDir.root,
        client: null,
        $: null,
        crosstrain: {
          loadUserAssets: false,
        },
      })

      expect(pluginResult).toBeDefined()
      expect(pluginResult.tool).toBeDefined()

      await emptyDir.cleanup()
    })
  })

  describe("Tool Descriptions", () => {
    it("should have meaningful descriptions for all tools", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const tools = pluginResult.tool!

      // Check that each tool has a description
      for (const [name, tool] of Object.entries(tools)) {
        expect(tool.description).toBeDefined()
        expect(tool.description.length).toBeGreaterThan(10)
      }
    })

    it("crosstrain tool should document available commands", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const crosstrain = pluginResult.tool!.crosstrain
      expect(crosstrain.description).toContain("command")
      expect(crosstrain.description).toContain("skill")
      expect(crosstrain.description).toContain("agent")
      expect(crosstrain.description).toContain("plugin")
      expect(crosstrain.description).toContain("list")
      expect(crosstrain.description).toContain("all")
    })
  })

  describe("Tool Execution", () => {
    it("crosstrain_help should return CLI help text", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const helpTool = pluginResult.tool!.crosstrain_help
      const result = await helpTool.execute(
        {},
        { agent: "test", sessionID: "test-session", messageID: "test-msg" }
      )

      expect(typeof result).toBe("string")
      expect(result).toContain("crosstrain")
      expect(result).toContain("COMMANDS")
    })

    it("crosstrain_show_hooks should display hooks info", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
      })

      const hooksTool = pluginResult.tool!.crosstrain_show_hooks
      const result = await hooksTool.execute(
        {},
        { agent: "test", sessionID: "test-session", messageID: "test-msg" }
      )

      expect(typeof result).toBe("string")
      // Should contain either hook info or "no hooks" message
      expect(
        result.includes("PreToolUse") ||
        result.includes("PostToolUse") ||
        result.includes("Hook") ||
        result.includes("No hooks") ||
        result.includes("hooks")
      ).toBe(true)
    })
  })

  describe("Plugin Configuration", () => {
    it("should be disabled when enabled is false", async () => {
      const pluginResult = await CrosstrainPlugin({
        project: { path: testDir.root },
        directory: testDir.root,
        worktree: testDir.root,
        client: null,
        $: null,
        crosstrain: {
          enabled: false,
        },
      })

      // Disabled plugin returns empty object
      expect(pluginResult).toEqual({})
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
        crosstrain: {
          loadUserAssets: false,
        },
      })

      expect(pluginResult).toBeDefined()
      expect(pluginResult.tool).toBeDefined()

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
        crosstrain: {
          loadUserAssets: false,
        },
      })

      expect(pluginResult).toBeDefined()
      expect(pluginResult.tool).toBeDefined()

      await testDir.cleanup()
    })
  })
})
