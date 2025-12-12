/**
 * Unit tests for the Skills Loader
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { join } from "path"

import {
  discoverSkills,
  convertSkillToTool,
  createToolsFromSkills,
} from "../loaders/skills"
import {
  createTestDirectory,
  createMockHomeDir,
  FIXTURES_DIR,
  type TestDirectory,
} from "./utils"

describe("Skills Loader", () => {
  let testDir: TestDirectory
  let mockHome: { path: string; cleanup: () => Promise<void> }

  beforeAll(async () => {
    testDir = await createTestDirectory("skills", { copySkills: true })
    mockHome = await createMockHomeDir()
  })

  afterAll(async () => {
    await testDir.cleanup()
    await mockHome.cleanup()
  })

  describe("discoverSkills", () => {
    it("should discover all skills from fixtures", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)

      expect(skills.length).toBe(2)
      const skillNames = skills.map(s => s.name)
      expect(skillNames).toContain("code-helper")
      expect(skillNames).toContain("doc-writer")
    })

    it("should parse skill frontmatter correctly", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const codeHelper = skills.find(s => s.name === "code-helper")

      expect(codeHelper).toBeDefined()
      expect(codeHelper?.description).toBe("Helps with code analysis and refactoring tasks")
      expect(codeHelper?.allowedTools).toEqual(["Read", "Grep", "Edit"])
    })

    it("should include content without frontmatter", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const codeHelper = skills.find(s => s.name === "code-helper")

      expect(codeHelper?.content).toContain("# Code Helper")
      expect(codeHelper?.content).toContain("## Capabilities")
    })

    it("should discover supporting files", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const codeHelper = skills.find(s => s.name === "code-helper")

      expect(codeHelper?.supportingFiles.length).toBeGreaterThan(0)
      const hasPatterns = codeHelper?.supportingFiles.some(f =>
        f.endsWith("patterns.json")
      )
      expect(hasPatterns).toBe(true)
    })

    it("should handle skills without allowed-tools", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const docWriter = skills.find(s => s.name === "doc-writer")

      expect(docWriter).toBeDefined()
      expect(docWriter?.allowedTools).toEqual([])
    })

    it("should not discover project skills from empty directories", async () => {
      const emptyDir = await createTestDirectory("empty-skills")
      // Use a mock home directory that has no skills
      const isolatedHome = await createMockHomeDir()
      const skills = await discoverSkills(emptyDir.claudeDir, isolatedHome.path)

      expect(skills.length).toBe(0)
      await emptyDir.cleanup()
      await isolatedHome.cleanup()
    })
  })

  describe("convertSkillToTool", () => {
    it("should convert skill to valid tool definition", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const skill = skills.find(s => s.name === "code-helper")!

      const tool = convertSkillToTool(skill)

      expect(tool).toBeDefined()
      expect(tool.description).toContain("Helps with code analysis")
      expect(tool.args).toHaveProperty("query")
      expect(typeof tool.execute).toBe("function")
    })

    it("should include allowed tools in description when restricted", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const skill = skills.find(s => s.name === "code-helper")!

      const tool = convertSkillToTool(skill)

      expect(tool.description).toContain("Restricted tools:")
      expect(tool.description).toContain("Read")
      expect(tool.description).toContain("Grep")
      expect(tool.description).toContain("Edit")
    })

    it("should execute and return skill instructions", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const skill = skills.find(s => s.name === "code-helper")!

      const tool = convertSkillToTool(skill)
      const result = await tool.execute({}, { agent: "", sessionID: "", messageID: "" })

      expect(result).toContain("## Skill: code-helper")
      expect(result).toContain("### Instructions")
      expect(result).toContain("# Code Helper")
    })

    it("should include query in output when provided", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const skill = skills.find(s => s.name === "code-helper")!

      const tool = convertSkillToTool(skill)
      const result = await tool.execute(
        { query: "Analyze this function" },
        { agent: "", sessionID: "", messageID: "" }
      )

      expect(result).toContain("### Query: Analyze this function")
    })

    it("should list supporting files in output", async () => {
      const skills = await discoverSkills(testDir.claudeDir, mockHome.path)
      const skill = skills.find(s => s.name === "code-helper")!

      const tool = convertSkillToTool(skill)
      const result = await tool.execute({}, { agent: "", sessionID: "", messageID: "" })

      expect(result).toContain("### Supporting Files Available")
      expect(result).toContain("patterns.json")
    })
  })

  describe("createToolsFromSkills", () => {
    it("should create tools map from all skills", async () => {
      const tools = await createToolsFromSkills(testDir.claudeDir, mockHome.path)

      expect(Object.keys(tools).length).toBe(2)
      expect(tools).toHaveProperty("skill_code_helper")
      expect(tools).toHaveProperty("skill_doc_writer")
    })

    it("should convert skill names to valid tool names", async () => {
      const tools = await createToolsFromSkills(testDir.claudeDir, mockHome.path)

      // Should be lowercase with underscores
      const toolNames = Object.keys(tools)
      for (const name of toolNames) {
        expect(name.startsWith("skill_")).toBe(true)
        expect(name).toBe(name.toLowerCase())
        expect(name).not.toContain("-")
      }
    })

    it("should return empty object when no skills exist", async () => {
      const emptyDir = await createTestDirectory("no-skills")
      // Use a mock home directory that has no skills
      const isolatedHome = await createMockHomeDir()
      const tools = await createToolsFromSkills(emptyDir.claudeDir, isolatedHome.path)

      expect(Object.keys(tools).length).toBe(0)
      await emptyDir.cleanup()
      await isolatedHome.cleanup()
    })
  })

  describe("Dynamic skill creation", () => {
    let dynamicDir: TestDirectory

    beforeEach(async () => {
      dynamicDir = await createTestDirectory("dynamic-skills")
    })

    afterEach(async () => {
      await dynamicDir.cleanup()
    })

    it("should discover dynamically created skills", async () => {
      // Create a skill dynamically
      await dynamicDir.createSkill("dynamic-skill", {
        description: "A dynamically created skill",
        allowedTools: ["Read"],
        instructions: "# Dynamic Skill\n\nThis is dynamic.",
      })

      const skills = await discoverSkills(dynamicDir.claudeDir, mockHome.path)
      const dynamicSkill = skills.find(s => s.name === "dynamic-skill")

      expect(dynamicSkill).toBeDefined()
      expect(dynamicSkill?.description).toBe("A dynamically created skill")
    })

    it("should prioritize project skills over user skills", async () => {
      // Create project skill
      await dynamicDir.createSkill("conflicting-skill", {
        description: "Project version",
        instructions: "Project instructions",
      })

      // Create user skill with same name
      const userSkillDir = join(mockHome.path, ".claude", "skills", "conflicting-skill")
      const { mkdir, writeFile } = await import("fs/promises")
      await mkdir(userSkillDir, { recursive: true })
      await writeFile(
        join(userSkillDir, "SKILL.md"),
        "---\nname: conflicting-skill\ndescription: User version\n---\n\nUser instructions"
      )

      const skills = await discoverSkills(dynamicDir.claudeDir, mockHome.path)
      const conflictingSkill = skills.find(s => s.name === "conflicting-skill")

      expect(conflictingSkill?.description).toBe("Project version")
    })
  })
})
