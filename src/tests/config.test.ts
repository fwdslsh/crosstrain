/**
 * Tests for the configuration system
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { writeFile, mkdir, rm } from "fs/promises"
import { existsSync } from "fs"

import {
  resolveConfig,
  loadConfig,
  validateConfig,
  createLogger,
  getResolvedPaths,
  loadEnvConfig,
  ConfigLogger,
} from "../utils/config"
import { DEFAULT_CONFIG, type CrosstrainConfig } from "../types"

describe("Configuration System", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(process.cwd(), `.test-config-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
    // Clean up environment variables
    delete process.env.CROSSTRAIN_ENABLED
    delete process.env.CROSSTRAIN_VERBOSE
    delete process.env.CROSSTRAIN_WATCH
    delete process.env.CROSSTRAIN_CLAUDE_DIR
    delete process.env.CROSSTRAIN_OPENCODE_DIR
    delete process.env.CROSSTRAIN_LOAD_USER_ASSETS
    delete process.env.CROSSTRAIN_LOAD_USER_SETTINGS
  })

  describe("DEFAULT_CONFIG", () => {
    it("should have all required default values", () => {
      expect(DEFAULT_CONFIG.enabled).toBe(true)
      expect(DEFAULT_CONFIG.claudeDir).toBe(".claude")
      expect(DEFAULT_CONFIG.openCodeDir).toBe(".opencode")
      expect(DEFAULT_CONFIG.loadUserAssets).toBe(true)
      expect(DEFAULT_CONFIG.loadUserSettings).toBe(true)
      expect(DEFAULT_CONFIG.watch).toBe(true)
      expect(DEFAULT_CONFIG.filePrefix).toBe("claude_")
      expect(DEFAULT_CONFIG.verbose).toBe(false)
    })

    it("should have all loaders enabled by default", () => {
      expect(DEFAULT_CONFIG.loaders.skills).toBe(true)
      expect(DEFAULT_CONFIG.loaders.agents).toBe(true)
      expect(DEFAULT_CONFIG.loaders.commands).toBe(true)
      expect(DEFAULT_CONFIG.loaders.hooks).toBe(true)
    })
  })

  describe("resolveConfig", () => {
    it("should return defaults when no config exists", async () => {
      const config = await resolveConfig(testDir)

      expect(config.enabled).toBe(true)
      expect(config.claudeDir).toBe(".claude")
      expect(config.openCodeDir).toBe(".opencode")
    })

    it("should load config from .crosstrainrc.json", async () => {
      await writeFile(
        join(testDir, ".crosstrainrc.json"),
        JSON.stringify({
          claudeDir: "custom-claude",
          verbose: true,
        })
      )

      const config = await resolveConfig(testDir)

      expect(config.claudeDir).toBe("custom-claude")
      expect(config.verbose).toBe(true)
      // Defaults should still apply
      expect(config.openCodeDir).toBe(".opencode")
    })

    it("should load config from crosstrain.config.json", async () => {
      await writeFile(
        join(testDir, "crosstrain.config.json"),
        JSON.stringify({
          filePrefix: "my_prefix_",
          watch: false,
        })
      )

      const config = await resolveConfig(testDir)

      expect(config.filePrefix).toBe("my_prefix_")
      expect(config.watch).toBe(false)
    })

    it("should prioritize .crosstrainrc.json over crosstrain.config.json", async () => {
      await writeFile(
        join(testDir, ".crosstrainrc.json"),
        JSON.stringify({ filePrefix: "rc_prefix_" })
      )
      await writeFile(
        join(testDir, "crosstrain.config.json"),
        JSON.stringify({ filePrefix: "config_prefix_" })
      )

      const config = await resolveConfig(testDir)

      // .crosstrainrc.json has higher priority
      expect(config.filePrefix).toBe("rc_prefix_")
    })

    it("should load config from opencode.json plugins.crosstrain", async () => {
      await writeFile(
        join(testDir, "opencode.json"),
        JSON.stringify({
          plugins: {
            crosstrain: {
              claudeDir: "from-opencode",
              verbose: true,
            },
          },
        })
      )

      const config = await resolveConfig(testDir)

      expect(config.claudeDir).toBe("from-opencode")
      expect(config.verbose).toBe(true)
    })

    it("should load config from opencode.json crosstrain key", async () => {
      await writeFile(
        join(testDir, "opencode.json"),
        JSON.stringify({
          crosstrain: {
            filePrefix: "opencode_",
          },
        })
      )

      const config = await resolveConfig(testDir)

      expect(config.filePrefix).toBe("opencode_")
    })

    it("should apply direct options with highest priority", async () => {
      await writeFile(
        join(testDir, ".crosstrainrc.json"),
        JSON.stringify({ claudeDir: "file-config" })
      )

      const config = await resolveConfig(testDir, {
        claudeDir: "direct-option",
      })

      expect(config.claudeDir).toBe("direct-option")
    })

    it("should deep merge loaders configuration", async () => {
      await writeFile(
        join(testDir, ".crosstrainrc.json"),
        JSON.stringify({
          loaders: {
            skills: false,
          },
        })
      )

      const config = await resolveConfig(testDir)

      expect(config.loaders.skills).toBe(false)
      expect(config.loaders.agents).toBe(true) // Still default
      expect(config.loaders.commands).toBe(true)
      expect(config.loaders.hooks).toBe(true)
    })

    it("should merge custom model mappings with defaults", async () => {
      await writeFile(
        join(testDir, ".crosstrainrc.json"),
        JSON.stringify({
          modelMappings: {
            "custom-model": "anthropic/custom-model-123",
          },
        })
      )

      const config = await resolveConfig(testDir)

      // Custom mapping should exist
      expect(config.modelMappings["custom-model"]).toBe("anthropic/custom-model-123")
      // Default mappings should still exist
      expect(config.modelMappings["sonnet"]).toBeDefined()
      expect(config.modelMappings["opus"]).toBeDefined()
    })
  })

  describe("loadConfig", () => {
    it("should load environment variables", async () => {
      process.env.CROSSTRAIN_VERBOSE = "true"
      process.env.CROSSTRAIN_WATCH = "false"

      const config = await loadConfig(testDir)

      expect(config.verbose).toBe(true)
      expect(config.watch).toBe(false)
    })

    it("should allow disabling via CROSSTRAIN_ENABLED=false", async () => {
      process.env.CROSSTRAIN_ENABLED = "false"

      const config = await loadConfig(testDir)

      expect(config.enabled).toBe(false)
    })

    it("should allow custom dirs via environment variables", async () => {
      process.env.CROSSTRAIN_CLAUDE_DIR = "env-claude"
      process.env.CROSSTRAIN_OPENCODE_DIR = "env-opencode"

      const config = await loadConfig(testDir)

      expect(config.claudeDir).toBe("env-claude")
      expect(config.openCodeDir).toBe("env-opencode")
    })

    it("should prioritize direct options over environment variables", async () => {
      process.env.CROSSTRAIN_CLAUDE_DIR = "env-dir"

      const config = await loadConfig(testDir, {
        claudeDir: "direct-dir",
      })

      expect(config.claudeDir).toBe("direct-dir")
    })
  })

  describe("loadEnvConfig", () => {
    it("should return empty config when no env vars set", () => {
      const config = loadEnvConfig()

      expect(config.enabled).toBeUndefined()
      expect(config.verbose).toBeUndefined()
    })

    it("should parse CROSSTRAIN_ENABLED correctly", () => {
      process.env.CROSSTRAIN_ENABLED = "0"
      expect(loadEnvConfig().enabled).toBe(false)

      process.env.CROSSTRAIN_ENABLED = "false"
      expect(loadEnvConfig().enabled).toBe(false)

      process.env.CROSSTRAIN_ENABLED = "true"
      expect(loadEnvConfig().enabled).toBe(true)

      process.env.CROSSTRAIN_ENABLED = "1"
      expect(loadEnvConfig().enabled).toBe(true)
    })

    it("should parse CROSSTRAIN_VERBOSE correctly", () => {
      process.env.CROSSTRAIN_VERBOSE = "true"
      expect(loadEnvConfig().verbose).toBe(true)

      process.env.CROSSTRAIN_VERBOSE = "1"
      expect(loadEnvConfig().verbose).toBe(true)

      process.env.CROSSTRAIN_VERBOSE = "false"
      expect(loadEnvConfig().verbose).toBe(false)
    })

    it("should parse CROSSTRAIN_LOAD_USER_ASSETS correctly", () => {
      process.env.CROSSTRAIN_LOAD_USER_ASSETS = "false"
      expect(loadEnvConfig().loadUserAssets).toBe(false)

      process.env.CROSSTRAIN_LOAD_USER_ASSETS = "true"
      expect(loadEnvConfig().loadUserAssets).toBe(true)
    })

    it("should parse CROSSTRAIN_LOAD_USER_SETTINGS correctly", () => {
      process.env.CROSSTRAIN_LOAD_USER_SETTINGS = "false"
      expect(loadEnvConfig().loadUserSettings).toBe(false)

      process.env.CROSSTRAIN_LOAD_USER_SETTINGS = "true"
      expect(loadEnvConfig().loadUserSettings).toBe(true)
    })
  })

  describe("validateConfig", () => {
    it("should return no warnings for valid config", () => {
      const warnings = validateConfig(DEFAULT_CONFIG)

      expect(warnings.length).toBe(0)
    })

    it("should warn about parent directory references in claudeDir", () => {
      const config = {
        ...DEFAULT_CONFIG,
        claudeDir: "../outside-project",
      }

      const warnings = validateConfig(config)

      expect(warnings.some(w => w.includes("claudeDir"))).toBe(true)
    })

    it("should warn about parent directory references in openCodeDir", () => {
      const config = {
        ...DEFAULT_CONFIG,
        openCodeDir: "../../escape",
      }

      const warnings = validateConfig(config)

      expect(warnings.some(w => w.includes("openCodeDir"))).toBe(true)
    })

    it("should warn about empty file prefix", () => {
      const config = {
        ...DEFAULT_CONFIG,
        filePrefix: "",
      }

      const warnings = validateConfig(config)

      expect(warnings.some(w => w.includes("filePrefix"))).toBe(true)
    })

    it("should warn when all loaders are disabled", () => {
      const config = {
        ...DEFAULT_CONFIG,
        loaders: {
          skills: false,
          agents: false,
          commands: false,
          hooks: false,
          mcp: false,
        },
      }

      const warnings = validateConfig(config)

      expect(warnings.some(w => w.includes("All loaders are disabled"))).toBe(true)
    })
  })

  describe("createLogger", () => {
    it("should create logger with verbose setting", () => {
      const verboseLogger = createLogger({ ...DEFAULT_CONFIG, verbose: true })
      const quietLogger = createLogger({ ...DEFAULT_CONFIG, verbose: false })

      expect(verboseLogger).toBeInstanceOf(ConfigLogger)
      expect(quietLogger).toBeInstanceOf(ConfigLogger)
    })
  })

  describe("getResolvedPaths", () => {
    it("should resolve paths relative to directory", () => {
      const paths = getResolvedPaths("/project/root", DEFAULT_CONFIG)

      expect(paths.claudeDir).toBe("/project/root/.claude")
      expect(paths.openCodeDir).toBe("/project/root/.opencode")
    })

    it("should resolve custom paths", () => {
      const config = {
        ...DEFAULT_CONFIG,
        claudeDir: "custom/claude",
        openCodeDir: "custom/opencode",
      }

      const paths = getResolvedPaths("/project", config)

      expect(paths.claudeDir).toBe("/project/custom/claude")
      expect(paths.openCodeDir).toBe("/project/custom/opencode")
    })
  })

  describe("Configuration with plugin", () => {
    it("should disable plugin when enabled is false", async () => {
      const { CrosstrainPlugin } = await import("../index")

      const result = await CrosstrainPlugin({
        directory: testDir,
        crosstrain: { enabled: false },
      })

      expect(result).toEqual({})
    })

    it("should use custom filePrefix", async () => {
      // Create fixtures
      await mkdir(join(testDir, ".claude", "agents"), { recursive: true })
      await mkdir(join(testDir, ".opencode"), { recursive: true })
      await writeFile(
        join(testDir, ".claude", "agents", "test.md"),
        "---\ndescription: Test agent\n---\nTest prompt"
      )

      const { CrosstrainPlugin } = await import("../index")

      await CrosstrainPlugin({
        directory: testDir,
        crosstrain: {
          filePrefix: "custom_",
          loadUserAssets: false,
        },
      })

      // Check if file was created with custom prefix
      const agentPath = join(testDir, ".opencode", "agent", "custom_test.md")
      expect(existsSync(agentPath)).toBe(true)
    })

    it("should disable specific loaders", async () => {
      // Create fixtures
      await mkdir(join(testDir, ".claude", "agents"), { recursive: true })
      await mkdir(join(testDir, ".claude", "commands"), { recursive: true })
      await mkdir(join(testDir, ".opencode"), { recursive: true })
      await writeFile(
        join(testDir, ".claude", "agents", "test.md"),
        "---\ndescription: Test agent\n---\nTest prompt"
      )
      await writeFile(
        join(testDir, ".claude", "commands", "test.md"),
        "---\ndescription: Test command\n---\nTest template"
      )

      const { CrosstrainPlugin } = await import("../index")

      await CrosstrainPlugin({
        directory: testDir,
        crosstrain: {
          loaders: {
            agents: false,
            commands: true,
          },
          loadUserAssets: false,
        },
      })

      // Agents should not be created
      const agentPath = join(testDir, ".opencode", "agent", "claude_test.md")
      expect(existsSync(agentPath)).toBe(false)

      // Commands should be created
      const commandPath = join(testDir, ".opencode", "command", "claude_test.md")
      expect(existsSync(commandPath)).toBe(true)
    })
  })
})

describe("ConfigLogger", () => {
  it("should log info messages always", () => {
    const logger = new ConfigLogger(false)
    // This test just verifies it doesn't throw
    logger.info("Test message")
  })

  it("should log verbose messages only when verbose is true", () => {
    const verboseLogger = new ConfigLogger(true)
    const quietLogger = new ConfigLogger(false)

    // These should not throw
    verboseLogger.log("Verbose message")
    quietLogger.log("Should not print but shouldn't throw")
  })

  it("should log warnings and errors", () => {
    const logger = new ConfigLogger(false)

    // These should not throw
    logger.warn("Warning message")
    logger.error("Error message")
  })
})
