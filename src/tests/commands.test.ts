/**
 * Unit tests for the Commands Loader
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { readFile } from "fs/promises"

import {
  discoverCommands,
  convertCommandFrontmatter,
  convertCommandTemplate,
  generateOpenCodeCommand,
  writeOpenCodeCommands,
  syncCommandsToOpenCode,
} from "../loaders/commands"
import {
  createTestDirectory,
  createMockHomeDir,
  type TestDirectory,
} from "./utils"

describe("Commands Loader", () => {
  let testDir: TestDirectory
  let mockHome: { path: string; cleanup: () => Promise<void> }

  beforeAll(async () => {
    testDir = await createTestDirectory("commands", { copyCommands: true })
    mockHome = await createMockHomeDir()
  })

  afterAll(async () => {
    await testDir.cleanup()
    await mockHome.cleanup()
  })

  describe("discoverCommands", () => {
    it("should discover all commands from fixtures", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)

      expect(commands.length).toBe(2)
      const commandNames = commands.map(c => c.name)
      expect(commandNames).toContain("run-tests")
      expect(commandNames).toContain("lint-fix")
    })

    it("should parse command frontmatter correctly", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const runTests = commands.find(c => c.name === "run-tests")

      expect(runTests).toBeDefined()
      expect(runTests?.description).toBe("Run tests with optional filtering")
    })

    it("should preserve template content", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const runTests = commands.find(c => c.name === "run-tests")

      expect(runTests?.template).toContain("$ARGUMENTS")
      expect(runTests?.template).toContain("$1")
      expect(runTests?.template).toContain("@package.json")
      expect(runTests?.template).toContain("!`bun test`")
    })

    it("should extract name from filename", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)

      for (const command of commands) {
        expect(command.name).not.toContain(".md")
        expect(command.name).not.toContain("/")
      }
    })
  })

  describe("convertCommandFrontmatter", () => {
    it("should preserve description", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const command = commands.find(c => c.name === "run-tests")!

      const frontmatter = convertCommandFrontmatter(command)

      expect(frontmatter.description).toBe("Run tests with optional filtering")
    })

    it("should set default agent to build", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const command = commands[0]

      const frontmatter = convertCommandFrontmatter(command)

      expect(frontmatter.agent).toBe("build")
    })

    it("should generate description for commands without one", async () => {
      const dynamicDir = await createTestDirectory("no-desc-command")
      await dynamicDir.createCommand("no-description", {
        template: "Some template",
      })

      const commands = await discoverCommands(dynamicDir.claudeDir, mockHome.path)
      const command = commands[0]
      const frontmatter = convertCommandFrontmatter(command)

      expect(frontmatter.description).toContain("Claude Code command:")
      expect(frontmatter.description).toContain("no-description")

      await dynamicDir.cleanup()
    })
  })

  describe("convertCommandTemplate", () => {
    it("should preserve $ARGUMENTS placeholder", () => {
      const template = "Run with: $ARGUMENTS"
      const converted = convertCommandTemplate(template)

      expect(converted).toContain("$ARGUMENTS")
    })

    it("should preserve positional parameters", () => {
      const template = "First: $1, Second: $2, Third: $3"
      const converted = convertCommandTemplate(template)

      expect(converted).toContain("$1")
      expect(converted).toContain("$2")
      expect(converted).toContain("$3")
    })

    it("should preserve file references", () => {
      const template = "Check @src/index.ts and @package.json"
      const converted = convertCommandTemplate(template)

      expect(converted).toContain("@src/index.ts")
      expect(converted).toContain("@package.json")
    })

    it("should preserve shell injection syntax", () => {
      const template = "Output: !`ls -la` and !`git status`"
      const converted = convertCommandTemplate(template)

      expect(converted).toContain("!`ls -la`")
      expect(converted).toContain("!`git status`")
    })
  })

  describe("generateOpenCodeCommand", () => {
    it("should generate valid markdown with frontmatter", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const command = commands.find(c => c.name === "run-tests")!

      const markdown = generateOpenCodeCommand(command)

      expect(markdown).toContain("---")
      expect(markdown).toContain("description: Run tests with optional filtering")
      expect(markdown).toContain("agent: build")
    })

    it("should include source attribution", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const command = commands[0]

      const markdown = generateOpenCodeCommand(command)

      expect(markdown).toContain("[Loaded from Claude Code:")
    })

    it("should preserve template syntax in body", async () => {
      const commands = await discoverCommands(testDir.claudeDir, mockHome.path)
      const runTests = commands.find(c => c.name === "run-tests")!

      const markdown = generateOpenCodeCommand(runTests)

      expect(markdown).toContain("$ARGUMENTS")
      expect(markdown).toContain("@package.json")
    })
  })

  describe("writeOpenCodeCommands", () => {
    let writeDir: TestDirectory

    beforeEach(async () => {
      writeDir = await createTestDirectory("write-commands", { copyCommands: true })
    })

    afterEach(async () => {
      await writeDir.cleanup()
    })

    it("should write commands to opencode directory", async () => {
      const commands = await discoverCommands(writeDir.claudeDir, mockHome.path)
      await writeOpenCodeCommands(commands, writeDir.openCodeDir)

      expect(writeDir.commandExists("run-tests")).toBe(true)
      expect(writeDir.commandExists("lint-fix")).toBe(true)
    })

    it("should prefix command files with 'claude_'", async () => {
      const commands = await discoverCommands(writeDir.claudeDir, mockHome.path)
      await writeOpenCodeCommands(commands, writeDir.openCodeDir)

      const files = await writeDir.getGeneratedFiles()
      for (const file of files.commands) {
        expect(file.startsWith("claude_")).toBe(true)
      }
    })

    it("should write valid OpenCode command format", async () => {
      const commands = await discoverCommands(writeDir.claudeDir, mockHome.path)
      await writeOpenCodeCommands(commands, writeDir.openCodeDir)

      const commandPath = join(writeDir.openCodeDir, "command", "claude_run-tests.md")
      const content = await readFile(commandPath, "utf-8")

      expect(content).toContain("---")
      expect(content).toContain("description:")
      expect(content).toContain("agent:")
    })
  })

  describe("syncCommandsToOpenCode", () => {
    it("should discover and write commands in one call", async () => {
      const syncDir = await createTestDirectory("sync-commands", { copyCommands: true })

      const commands = await syncCommandsToOpenCode(
        syncDir.claudeDir,
        mockHome.path,
        syncDir.openCodeDir
      )

      expect(commands.length).toBe(2)
      expect(syncDir.commandExists("run-tests")).toBe(true)
      expect(syncDir.commandExists("lint-fix")).toBe(true)

      await syncDir.cleanup()
    })
  })

  describe("Dynamic command creation", () => {
    let dynamicDir: TestDirectory

    beforeEach(async () => {
      dynamicDir = await createTestDirectory("dynamic-commands")
    })

    afterEach(async () => {
      await dynamicDir.cleanup()
    })

    it("should discover dynamically created commands", async () => {
      await dynamicDir.createCommand("dynamic-cmd", {
        description: "A dynamic command",
        template: "Execute: $1",
      })

      const commands = await discoverCommands(dynamicDir.claudeDir, mockHome.path)
      const dynamicCmd = commands.find(c => c.name === "dynamic-cmd")

      expect(dynamicCmd).toBeDefined()
      expect(dynamicCmd?.description).toBe("A dynamic command")
    })

    it("should handle commands with complex templates", async () => {
      const complexTemplate = `
Analyze the codebase:

Files: $ARGUMENTS

1. Read main file: @$1
2. Check dependencies: @package.json
3. Run tests: !${"\\`bun test\\`"}
4. Show git status: !${"\\`git status\\`"}

Report findings.
`
      await dynamicDir.createCommand("complex-cmd", {
        description: "Complex template command",
        template: complexTemplate,
      })

      const commands = await discoverCommands(dynamicDir.claudeDir, mockHome.path)
      const complexCmd = commands.find(c => c.name === "complex-cmd")

      expect(complexCmd?.template).toContain("$ARGUMENTS")
      expect(complexCmd?.template).toContain("@$1")
      expect(complexCmd?.template).toContain("@package.json")
    })
  })
})
