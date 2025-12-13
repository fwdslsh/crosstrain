/**
 * Unit tests for the Crosstrain CLI
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { existsSync } from "fs"
import { readFile, mkdir, writeFile } from "fs/promises"
import { $ } from "bun"
import {
  createTestDirectory,
  createMockHomeDir,
  type TestDirectory,
} from "./utils"

// Path to the CLI
const CLI_PATH = join(__dirname, "..", "cli.ts")

/**
 * Run the CLI with arguments
 */
async function runCLI(args: string[], cwd?: string): Promise<{
  stdout: string
  stderr: string
  exitCode: number
}> {
  try {
    const result = await $`bun run ${CLI_PATH} ${args}`.cwd(cwd || process.cwd()).quiet()
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    }
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || "",
      exitCode: error.exitCode || 1,
    }
  }
}

describe("Crosstrain CLI", () => {
  describe("Help and Version", () => {
    it("should display help with --help flag", async () => {
      const result = await runCLI(["--help"])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("crosstrain")
      expect(result.stdout).toContain("COMMANDS:")
      expect(result.stdout).toContain("command")
      expect(result.stdout).toContain("skill")
      expect(result.stdout).toContain("agent")
      expect(result.stdout).toContain("mcp")
      expect(result.stdout).toContain("plugin")
      expect(result.stdout).toContain("all")
    })

    it("should display help with -h flag", async () => {
      const result = await runCLI(["-h"])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("crosstrain")
    })

    it("should display version with --version flag", async () => {
      const result = await runCLI(["--version"])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("crosstrain v")
    })

    it("should display help when no arguments provided", async () => {
      const result = await runCLI([])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("crosstrain")
    })
  })

  describe("Command Conversion", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-command")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should convert a single command", async () => {
      await testDir.createCommand("test-cmd", {
        description: "A test command",
        template: "Run with: $ARGUMENTS",
      })

      const cmdPath = join(testDir.claudeDir, "commands", "test-cmd.md")
      const result = await runCLI([
        "command", cmdPath,
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting Command")
      expect(result.stdout).toContain("test-cmd")

      // Check the output file exists
      expect(testDir.commandExists("test-cmd")).toBe(true)
    })

    it("should show dry-run output without writing", async () => {
      await testDir.createCommand("dry-cmd", {
        description: "Dry run test",
        template: "Execute: $1",
      })

      const cmdPath = join(testDir.claudeDir, "commands", "dry-cmd.md")
      const result = await runCLI([
        "command", cmdPath,
        "-o", testDir.openCodeDir,
        "--dry-run",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("dry-run")
      expect(result.stdout).toContain("Would write to:")

      // File should NOT exist
      expect(testDir.commandExists("dry-cmd")).toBe(false)
    })

    it("should error when command path not provided", async () => {
      const result = await runCLI(["command"], testDir.root)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain("Please provide a path")
    })

    it("should error when command file not found", async () => {
      const result = await runCLI([
        "command", "/nonexistent/path.md",
      ], testDir.root)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain("not found")
    })
  })

  describe("Agent Conversion", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-agent")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should convert a single agent", async () => {
      await testDir.createAgent("test-agent", {
        description: "A test agent",
        model: "sonnet",
        tools: ["Read", "Write"],
        systemPrompt: "You are a test agent.",
      })

      const agentPath = join(testDir.claudeDir, "agents", "test-agent.md")
      const result = await runCLI([
        "agent", agentPath,
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting Agent")
      expect(result.stdout).toContain("test-agent")

      // Check the output file exists
      expect(testDir.agentExists("test-agent")).toBe(true)

      // Verify content
      const outputPath = join(testDir.openCodeDir, "agent", "claude_test-agent.md")
      const content = await readFile(outputPath, "utf-8")
      expect(content).toContain("mode: subagent")
      expect(content).toContain("model: anthropic/claude-sonnet")
    })

    it("should show verbose output with -v flag", async () => {
      await testDir.createAgent("verbose-agent", {
        description: "Verbose test",
        model: "opus",
        permissionMode: "acceptEdits",
        systemPrompt: "Test prompt.",
      })

      const agentPath = join(testDir.claudeDir, "agents", "verbose-agent.md")
      const result = await runCLI([
        "agent", agentPath,
        "-o", testDir.openCodeDir,
        "-v",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Model:")
      expect(result.stdout).toContain("Permission mode:")
    })
  })

  describe("Skill Conversion", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-skill")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should convert a skill to a plugin tool", async () => {
      await testDir.createSkill("test-skill", {
        description: "A test skill",
        instructions: "Do something useful.",
      })

      const skillPath = join(testDir.claudeDir, "skills", "test-skill")
      const result = await runCLI([
        "skill", skillPath,
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting Skill")
      expect(result.stdout).toContain("test-skill")

      // Check the plugin files exist
      const pluginDir = join(testDir.openCodeDir, "plugin", "crosstrain-skills")
      expect(existsSync(join(pluginDir, "index.ts"))).toBe(true)
      expect(existsSync(join(pluginDir, "tools", "skill_test_skill.ts"))).toBe(true)

      // Verify tool content
      const toolContent = await readFile(join(pluginDir, "tools", "skill_test_skill.ts"), "utf-8")
      expect(toolContent).toContain("skill_test_skill")
      expect(toolContent).toContain("A test skill")
      expect(toolContent).toContain("Do something useful")
    })

    it("should convert skill from SKILL.md path", async () => {
      await testDir.createSkill("another-skill", {
        description: "Another skill",
        instructions: "More instructions.",
      })

      const skillMdPath = join(testDir.claudeDir, "skills", "another-skill", "SKILL.md")
      const result = await runCLI([
        "skill", skillMdPath,
        "-o", testDir.openCodeDir,
        "--dry-run",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("another-skill")
    })
  })

  describe("MCP Conversion", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-mcp")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should convert a specific .mcp.json file", async () => {
      await testDir.createMCPConfig({
        "my-server": {
          command: "npx",
          args: ["-y", "@mcp/server"],
          env: { API_KEY: "test" },
        },
      })

      const mcpPath = join(testDir.root, ".mcp.json")
      const result = await runCLI([
        "mcp", mcpPath,
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting MCP")

      // Check opencode.json was updated
      const configPath = join(testDir.root, "opencode.json")
      expect(existsSync(configPath)).toBe(true)

      const config = JSON.parse(await readFile(configPath, "utf-8"))
      expect(config.mcp).toBeDefined()
      expect(config.mcp["claude_my-server"]).toBeDefined()
      expect(config.mcp["claude_my-server"].type).toBe("local")
    })

    it("should discover all MCP servers without path", async () => {
      await testDir.createMCPConfig({
        "server-1": { command: "node", args: ["server1.js"] },
        "server-2": { command: "python", args: ["server2.py"] },
      })

      const result = await runCLI([
        "mcp",
        "-o", testDir.openCodeDir,
        "--dry-run",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("server-1")
      expect(result.stdout).toContain("server-2")
    })
  })

  describe("Hook Display", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-hook")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should display hooks configuration", async () => {
      await testDir.createSettings({
        PreToolUse: [
          {
            matcher: "Edit",
            hooks: [{ type: "command", command: "echo 'pre-edit'" }],
          },
        ],
        PostToolUse: [
          {
            matcher: "Write",
            hooks: [{ type: "command", command: "echo 'post-write'" }],
          },
        ],
      })

      const result = await runCLI([
        "hook",
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("PreToolUse")
      expect(result.stdout).toContain("PostToolUse")
      expect(result.stdout).toContain("Edit")
      expect(result.stdout).toContain("Write")
    })

    it("should show no hooks found message", async () => {
      const result = await runCLI([
        "hook",
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("No hooks configuration found")
    })
  })

  describe("All/Sync Command", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-all")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should convert all asset types", async () => {
      // Create various assets
      await testDir.createCommand("all-cmd", {
        description: "Test command",
        template: "Run: $1",
      })
      await testDir.createAgent("all-agent", {
        description: "Test agent",
        systemPrompt: "Agent prompt.",
      })
      await testDir.createSkill("all-skill", {
        description: "Test skill",
        instructions: "Skill instructions.",
      })
      await testDir.createMCPConfig({
        "all-server": { command: "node", args: ["server.js"] },
      })

      const result = await runCLI([
        "all",
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Commands")
      expect(result.stdout).toContain("Agents")
      expect(result.stdout).toContain("Skills")
      expect(result.stdout).toContain("MCP Servers")

      // Verify files were created
      expect(testDir.commandExists("all-cmd")).toBe(true)
      expect(testDir.agentExists("all-agent")).toBe(true)
      expect(existsSync(join(testDir.openCodeDir, "plugin", "crosstrain-skills", "index.ts"))).toBe(true)
    })

    it("should work with sync alias", async () => {
      await testDir.createCommand("sync-cmd", {
        description: "Sync test",
        template: "Sync: $1",
      })

      const result = await runCLI([
        "sync",
        "-o", testDir.openCodeDir,
        "--dry-run",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting All")
    })

    it("should respect --no-user flag", async () => {
      const result = await runCLI([
        "all",
        "-o", testDir.openCodeDir,
        "--no-user",
        "--dry-run",
        "-v",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      // Should complete without loading user assets
    })
  })

  describe("Init Command", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-init")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should initialize a new plugin", async () => {
      const result = await runCLI([
        "init",
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Initializing")

      const pluginDir = join(testDir.openCodeDir, "plugin", "crosstrain-skills")
      expect(existsSync(join(pluginDir, "index.ts"))).toBe(true)
      expect(existsSync(join(pluginDir, "package.json"))).toBe(true)
      expect(existsSync(join(pluginDir, "tools"))).toBe(true)
    })

    it("should warn if plugin already exists", async () => {
      // First init
      await runCLI(["init", "-o", testDir.openCodeDir], testDir.root)

      // Second init should warn
      const result = await runCLI([
        "init",
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("already exists")
    })
  })

  describe("Custom Options", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-options")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should use custom prefix with -p flag", async () => {
      await testDir.createCommand("prefix-cmd", {
        description: "Prefix test",
        template: "Test",
      })

      const cmdPath = join(testDir.claudeDir, "commands", "prefix-cmd.md")
      const result = await runCLI([
        "command", cmdPath,
        "-o", testDir.openCodeDir,
        "-p", "custom_",
      ], testDir.root)

      expect(result.exitCode).toBe(0)

      // Check file with custom prefix exists
      const customPath = join(testDir.openCodeDir, "command", "custom_prefix-cmd.md")
      expect(existsSync(customPath)).toBe(true)
    })

    it("should use custom output directory with -o flag", async () => {
      await testDir.createAgent("output-agent", {
        description: "Output test",
        systemPrompt: "Test",
      })

      const customOutput = join(testDir.root, "custom-output")
      const agentPath = join(testDir.claudeDir, "agents", "output-agent.md")

      const result = await runCLI([
        "agent", agentPath,
        "-o", customOutput,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(existsSync(join(customOutput, "agent", "claude_output-agent.md"))).toBe(true)
    })
  })

  describe("Plugin Conversion", () => {
    let testDir: TestDirectory

    beforeEach(async () => {
      testDir = await createTestDirectory("cli-plugin")
    })

    afterEach(async () => {
      await testDir.cleanup()
    })

    it("should convert a plugin directory with all asset types", async () => {
      // Create a mock plugin directory
      const pluginDir = join(testDir.root, "my-plugin")
      await mkdir(join(pluginDir, "commands"), { recursive: true })
      await mkdir(join(pluginDir, "agents"), { recursive: true })
      await mkdir(join(pluginDir, "skills", "test-skill"), { recursive: true })

      // Create command
      await writeFile(
        join(pluginDir, "commands", "plugin-cmd.md"),
        "---\ndescription: Plugin command\n---\n\nRun: $1"
      )

      // Create agent
      await writeFile(
        join(pluginDir, "agents", "plugin-agent.md"),
        "---\ndescription: Plugin agent\n---\n\nYou are a plugin agent."
      )

      // Create skill
      await writeFile(
        join(pluginDir, "skills", "test-skill", "SKILL.md"),
        "---\nname: test-skill\ndescription: Test skill\n---\n\nDo something."
      )

      // Create MCP config
      await writeFile(
        join(pluginDir, ".mcp.json"),
        JSON.stringify({
          mcpServers: {
            "plugin-server": { command: "node", args: ["server.js"] },
          },
        })
      )

      const result = await runCLI([
        "plugin", pluginDir,
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting Plugin: my-plugin")
      expect(result.stdout).toContain("Commands")
      expect(result.stdout).toContain("Agents")
      expect(result.stdout).toContain("Skills")
      expect(result.stdout).toContain("MCP Servers")

      // Check outputs
      expect(existsSync(join(testDir.openCodeDir, "command", "claude_my_plugin_plugin-cmd.md"))).toBe(true)
      expect(existsSync(join(testDir.openCodeDir, "agent", "claude_my_plugin_plugin-agent.md"))).toBe(true)
      expect(existsSync(join(testDir.openCodeDir, "plugin", "crosstrain-my-plugin", "index.ts"))).toBe(true)
    })

    it("should use plugin name from plugin.json if available", async () => {
      const pluginDir = join(testDir.root, "unnamed-plugin")
      await mkdir(join(pluginDir, ".claude-plugin"), { recursive: true })
      await mkdir(join(pluginDir, "commands"), { recursive: true })

      // Create plugin.json with custom name
      await writeFile(
        join(pluginDir, ".claude-plugin", "plugin.json"),
        JSON.stringify({ name: "custom-name", description: "A custom plugin" })
      )

      // Create a command
      await writeFile(
        join(pluginDir, "commands", "cmd.md"),
        "---\ndescription: Test\n---\n\nTest"
      )

      const result = await runCLI([
        "plugin", pluginDir,
        "-o", testDir.openCodeDir,
        "--dry-run",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Converting Plugin: custom-name")
    })

    it("should handle plugin with only skills", async () => {
      const pluginDir = join(testDir.root, "skills-only")
      await mkdir(join(pluginDir, "skills", "my-skill"), { recursive: true })

      await writeFile(
        join(pluginDir, "skills", "my-skill", "SKILL.md"),
        "---\nname: my-skill\ndescription: A skill\n---\n\nInstructions here."
      )

      const result = await runCLI([
        "plugin", pluginDir,
        "-o", testDir.openCodeDir,
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("No commands/ directory found")
      expect(result.stdout).toContain("No agents/ directory found")
      expect(result.stdout).toContain("skill(s)")

      // Check plugin was created
      const skillPluginDir = join(testDir.openCodeDir, "plugin", "crosstrain-skills-only")
      expect(existsSync(join(skillPluginDir, "index.ts"))).toBe(true)
      expect(existsSync(join(skillPluginDir, "tools", "skill_skills_only_my_skill.ts"))).toBe(true)
    })

    it("should error when plugin path not provided", async () => {
      const result = await runCLI(["plugin"], testDir.root)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain("Please provide a path")
    })

    it("should error when plugin directory not found", async () => {
      const result = await runCLI([
        "plugin", "/nonexistent/plugin",
      ], testDir.root)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain("not found")
    })

    it("should show dry-run output without writing", async () => {
      const pluginDir = join(testDir.root, "dry-plugin")
      await mkdir(join(pluginDir, "commands"), { recursive: true })

      await writeFile(
        join(pluginDir, "commands", "dry-cmd.md"),
        "---\ndescription: Dry test\n---\n\nTest"
      )

      const result = await runCLI([
        "plugin", pluginDir,
        "-o", testDir.openCodeDir,
        "--dry-run",
      ], testDir.root)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("dry-run")
      expect(result.stdout).toContain("Would convert")

      // Files should NOT exist
      expect(existsSync(join(testDir.openCodeDir, "command"))).toBe(false)
    })
  })

  describe("Error Handling", () => {
    it("should error on unknown command", async () => {
      const result = await runCLI(["unknown-command"])

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain("Unknown command")
    })
  })
})
