/**
 * Unit tests for the Agents Loader
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { readFile } from "fs/promises"

import {
  discoverAgents,
  convertAgentFrontmatter,
  generateOpenCodeAgent,
  writeOpenCodeAgents,
  syncAgentsToOpenCode,
} from "../loaders/agents"
import { MODEL_MAPPING, PERMISSION_MODE_MAPPING } from "../types"
import {
  createTestDirectory,
  createMockHomeDir,
  type TestDirectory,
} from "./utils"

describe("Agents Loader", () => {
  let testDir: TestDirectory
  let mockHome: { path: string; cleanup: () => Promise<void> }

  beforeAll(async () => {
    testDir = await createTestDirectory("agents", { copyAgents: true })
    mockHome = await createMockHomeDir()
  })

  afterAll(async () => {
    await testDir.cleanup()
    await mockHome.cleanup()
  })

  describe("discoverAgents", () => {
    it("should discover all agents from fixtures", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)

      expect(agents.length).toBe(3)
      const agentNames = agents.map(a => a.name)
      expect(agentNames).toContain("test-reviewer")
      expect(agentNames).toContain("minimal-agent")
      expect(agentNames).toContain("full-config-agent")
    })

    it("should parse agent frontmatter correctly", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const testReviewer = agents.find(a => a.name === "test-reviewer")

      expect(testReviewer).toBeDefined()
      expect(testReviewer?.description).toBe("Reviews and improves test coverage")
      expect(testReviewer?.tools).toEqual(["Read", "Grep", "Edit", "Bash"])
      expect(testReviewer?.model).toBe("sonnet")
      expect(testReviewer?.permissionMode).toBe("acceptEdits")
      expect(testReviewer?.skills).toEqual(["code-helper"])
    })

    it("should handle minimal agent configuration", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const minimal = agents.find(a => a.name === "minimal-agent")

      expect(minimal).toBeDefined()
      expect(minimal?.description).toBe("A minimal agent with no extra config")
      expect(minimal?.tools).toEqual([])
      expect(minimal?.model).toBeUndefined()
      expect(minimal?.permissionMode).toBeUndefined()
    })

    it("should include system prompt without frontmatter", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const testReviewer = agents.find(a => a.name === "test-reviewer")

      expect(testReviewer?.systemPrompt).toContain("test review specialist")
      expect(testReviewer?.systemPrompt).toContain("## Responsibilities")
    })
  })

  describe("convertAgentFrontmatter", () => {
    it("should map model alias to full path", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)

      // Test sonnet mapping
      const testReviewer = agents.find(a => a.name === "test-reviewer")!
      const sonnetFrontmatter = convertAgentFrontmatter(testReviewer)
      expect(sonnetFrontmatter.model).toBe(MODEL_MAPPING.sonnet)

      // Test opus mapping
      const fullConfig = agents.find(a => a.name === "full-config-agent")!
      const opusFrontmatter = convertAgentFrontmatter(fullConfig)
      expect(opusFrontmatter.model).toBe(MODEL_MAPPING.opus)
    })

    it("should set mode to subagent", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const agent = agents[0]

      const frontmatter = convertAgentFrontmatter(agent)

      expect(frontmatter.mode).toBe("subagent")
    })

    it("should map tools to boolean object", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const testReviewer = agents.find(a => a.name === "test-reviewer")!

      const frontmatter = convertAgentFrontmatter(testReviewer)

      expect(frontmatter.tools?.read).toBe(true)
      expect(frontmatter.tools?.grep).toBe(true)
      expect(frontmatter.tools?.edit).toBe(true)
      expect(frontmatter.tools?.bash).toBe(true)
      // Not listed = false
      expect(frontmatter.tools?.write).toBe(false)
      expect(frontmatter.tools?.webfetch).toBe(false)
    })

    it("should map permission modes correctly", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)

      // Test acceptEdits
      const testReviewer = agents.find(a => a.name === "test-reviewer")!
      const acceptEditsFrontmatter = convertAgentFrontmatter(testReviewer)
      expect(acceptEditsFrontmatter.permission).toEqual(
        PERMISSION_MODE_MAPPING.acceptEdits
      )

      // Test bypassPermissions
      const fullConfig = agents.find(a => a.name === "full-config-agent")!
      const bypassFrontmatter = convertAgentFrontmatter(fullConfig)
      expect(bypassFrontmatter.permission).toEqual(
        PERMISSION_MODE_MAPPING.bypassPermissions
      )
    })

    it("should not set model when inherit", async () => {
      const dynamicDir = await createTestDirectory("inherit-agent")
      await dynamicDir.createAgent("inherit-agent", {
        description: "Inherits model",
        model: "inherit",
        systemPrompt: "Inherit model agent",
      })

      const agents = await discoverAgents(dynamicDir.claudeDir, mockHome.path)
      const inheritAgent = agents.find(a => a.name === "inherit-agent")!
      const frontmatter = convertAgentFrontmatter(inheritAgent)

      expect(frontmatter.model).toBeUndefined()
      await dynamicDir.cleanup()
    })
  })

  describe("generateOpenCodeAgent", () => {
    it("should generate valid markdown with frontmatter", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const agent = agents.find(a => a.name === "test-reviewer")!

      const markdown = generateOpenCodeAgent(agent)

      expect(markdown).toContain("---")
      expect(markdown).toContain("description: Reviews and improves test coverage")
      expect(markdown).toContain("mode: subagent")
      expect(markdown).toContain("test review specialist")
    })

    it("should include skill references in system prompt", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const agent = agents.find(a => a.name === "test-reviewer")!

      const markdown = generateOpenCodeAgent(agent)

      expect(markdown).toContain("## Available Skills")
      expect(markdown).toContain("skill_code_helper")
    })

    it("should include source attribution", async () => {
      const agents = await discoverAgents(testDir.claudeDir, mockHome.path)
      const agent = agents[0]

      const markdown = generateOpenCodeAgent(agent)

      expect(markdown).toContain("[Loaded from Claude Code:")
    })
  })

  describe("writeOpenCodeAgents", () => {
    let writeDir: TestDirectory

    beforeEach(async () => {
      writeDir = await createTestDirectory("write-agents", { copyAgents: true })
    })

    afterEach(async () => {
      await writeDir.cleanup()
    })

    it("should write agents to opencode directory", async () => {
      const agents = await discoverAgents(writeDir.claudeDir, mockHome.path)
      await writeOpenCodeAgents(agents, writeDir.openCodeDir)

      expect(writeDir.agentExists("test-reviewer")).toBe(true)
      expect(writeDir.agentExists("minimal-agent")).toBe(true)
      expect(writeDir.agentExists("full-config-agent")).toBe(true)
    })

    it("should prefix agent files with 'claude_'", async () => {
      const agents = await discoverAgents(writeDir.claudeDir, mockHome.path)
      await writeOpenCodeAgents(agents, writeDir.openCodeDir)

      const files = await writeDir.getGeneratedFiles()
      for (const file of files.agents) {
        expect(file.startsWith("claude_")).toBe(true)
      }
    })

    it("should write valid OpenCode agent format", async () => {
      const agents = await discoverAgents(writeDir.claudeDir, mockHome.path)
      await writeOpenCodeAgents(agents, writeDir.openCodeDir)

      const agentPath = join(writeDir.openCodeDir, "agent", "claude_test-reviewer.md")
      const content = await readFile(agentPath, "utf-8")

      expect(content).toContain("---")
      expect(content).toContain("description:")
      expect(content).toContain("mode: subagent")
    })
  })

  describe("syncAgentsToOpenCode", () => {
    it("should discover and write agents in one call", async () => {
      const syncDir = await createTestDirectory("sync-agents", { copyAgents: true })

      const agents = await syncAgentsToOpenCode(
        syncDir.claudeDir,
        mockHome.path,
        syncDir.openCodeDir
      )

      expect(agents.length).toBe(3)
      expect(syncDir.agentExists("test-reviewer")).toBe(true)

      await syncDir.cleanup()
    })
  })
})
