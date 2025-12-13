/**
 * Unit tests for the MCP Server Loader
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { join, dirname } from "path"
import { existsSync } from "fs"
import { readFile, mkdir, writeFile, rm } from "fs/promises"

import {
  parseMCPConfig,
  discoverMCPConfigs,
  discoverPluginMCPConfigs,
  convertMCPServer,
  convertMCPServers,
  mergeMCPConfigs,
  getAllMCPServers,
  syncMCPToOpenCode,
  hasMCPConfigs,
  getMCPSummary,
} from "../loaders/mcp"
import {
  createTestDirectory,
  createMockHomeDir,
  type TestDirectory,
} from "./utils"
import type { ClaudeMCPServer, OpenCodeMCPLocalServer, OpenCodeMCPServer } from "../types"

describe("MCP Loader", () => {
  let testDir: TestDirectory
  let mockHome: { path: string; cleanup: () => Promise<void> }

  beforeAll(async () => {
    testDir = await createTestDirectory("mcp")
    mockHome = await createMockHomeDir()
  })

  afterAll(async () => {
    await testDir.cleanup()
    await mockHome.cleanup()
  })

  describe("parseMCPConfig", () => {
    it("should parse valid .mcp.json file", async () => {
      await testDir.createMCPConfig({
        "test-server": {
          command: "npx",
          args: ["-y", "@test/server"],
          env: { API_KEY: "test-key" },
        },
      })

      const config = await parseMCPConfig(join(testDir.root, ".mcp.json"))

      expect(config).not.toBeNull()
      expect(config?.mcpServers).toBeDefined()
      expect(config?.mcpServers["test-server"]).toBeDefined()
      expect(config?.mcpServers["test-server"].command).toBe("npx")
      expect(config?.mcpServers["test-server"].args).toEqual(["-y", "@test/server"])
      expect(config?.mcpServers["test-server"].env).toEqual({ API_KEY: "test-key" })
    })

    it("should return null for non-existent file", async () => {
      const config = await parseMCPConfig(join(testDir.root, "nonexistent.json"))
      expect(config).toBeNull()
    })

    it("should return null for invalid JSON", async () => {
      const invalidPath = join(testDir.root, "invalid.mcp.json")
      await writeFile(invalidPath, "not valid json", "utf-8")

      const config = await parseMCPConfig(invalidPath)
      expect(config).toBeNull()
    })

    it("should return null for missing mcpServers field", async () => {
      const invalidPath = join(testDir.root, "no-servers.mcp.json")
      await writeFile(invalidPath, JSON.stringify({ foo: "bar" }), "utf-8")

      const config = await parseMCPConfig(invalidPath)
      expect(config).toBeNull()
    })
  })

  describe("discoverMCPConfigs", () => {
    it("should discover project-level .mcp.json", async () => {
      await testDir.createMCPConfig({
        "project-server": {
          command: "node",
          args: ["server.js"],
        },
      })

      const servers = await discoverMCPConfigs(testDir.claudeDir, mockHome.path)

      expect(servers.length).toBeGreaterThanOrEqual(1)
      const projectServer = servers.find(s => s.name === "project-server")
      expect(projectServer).toBeDefined()
      expect(projectServer?.source).toBe("project")
    })

    it("should discover user-level .mcp.json", async () => {
      // Create user-level config
      const userMcpPath = join(mockHome.path, ".claude", ".mcp.json")
      await mkdir(dirname(userMcpPath), { recursive: true })
      await writeFile(
        userMcpPath,
        JSON.stringify({
          mcpServers: {
            "user-server": {
              command: "bun",
              args: ["run", "user-server.ts"],
            },
          },
        }),
        "utf-8"
      )

      const servers = await discoverMCPConfigs(testDir.claudeDir, mockHome.path)

      const userServer = servers.find(s => s.name === "user-server")
      expect(userServer).toBeDefined()
      expect(userServer?.source).toBe("user")
    })

    it("should prefer project-level over user-level for same name", async () => {
      await testDir.createMCPConfig({
        "shared-server": {
          command: "project-cmd",
          args: ["--project"],
        },
      })

      const userMcpPath = join(mockHome.path, ".claude", ".mcp.json")
      await mkdir(dirname(userMcpPath), { recursive: true })
      await writeFile(
        userMcpPath,
        JSON.stringify({
          mcpServers: {
            "shared-server": {
              command: "user-cmd",
              args: ["--user"],
            },
          },
        }),
        "utf-8"
      )

      const servers = await discoverMCPConfigs(testDir.claudeDir, mockHome.path)

      const sharedServer = servers.find(s => s.name === "shared-server")
      expect(sharedServer).toBeDefined()
      expect(sharedServer?.source).toBe("project")
      expect(sharedServer?.server.command).toBe("project-cmd")
    })
  })

  describe("discoverPluginMCPConfigs", () => {
    it("should discover MCP configs from plugins directory", async () => {
      await testDir.createPluginMCPConfig("test-plugin", {
        "plugin-server": {
          command: "plugin-cmd",
          args: ["--plugin"],
        },
      })

      const servers = await discoverPluginMCPConfigs(testDir.claudeDir)

      expect(servers.length).toBe(1)
      expect(servers[0].name).toBe("plugin-server")
      expect(servers[0].source).toBe("plugin")
    })

    it("should return empty array when no plugins directory exists", async () => {
      const emptyDir = await createTestDirectory("empty-mcp-plugins")
      const servers = await discoverPluginMCPConfigs(emptyDir.claudeDir)

      expect(servers).toEqual([])
      await emptyDir.cleanup()
    })
  })

  describe("convertMCPServer", () => {
    it("should convert Claude MCP server to OpenCode format", () => {
      const claudeServer: ClaudeMCPServer = {
        command: "npx",
        args: ["-y", "@package/server"],
        env: { KEY: "value" },
      }

      const openCodeServer = convertMCPServer(claudeServer)

      expect(openCodeServer.type).toBe("local")
      expect(openCodeServer.command).toEqual(["npx", "-y", "@package/server"])
      expect(openCodeServer.environment).toEqual({ KEY: "value" })
      expect(openCodeServer.enabled).toBe(true)
    })

    it("should handle server without args", () => {
      const claudeServer: ClaudeMCPServer = {
        command: "my-server",
      }

      const openCodeServer = convertMCPServer(claudeServer)

      expect(openCodeServer.command).toEqual(["my-server"])
      expect(openCodeServer.environment).toBeUndefined()
    })

    it("should handle server without env", () => {
      const claudeServer: ClaudeMCPServer = {
        command: "server",
        args: ["--arg"],
      }

      const openCodeServer = convertMCPServer(claudeServer)

      expect(openCodeServer.environment).toBeUndefined()
    })

    it("should respect enableByDefault option", () => {
      const claudeServer: ClaudeMCPServer = {
        command: "server",
      }

      const enabled = convertMCPServer(claudeServer, { enableByDefault: true })
      const disabled = convertMCPServer(claudeServer, { enableByDefault: false })

      expect(enabled.enabled).toBe(true)
      expect(disabled.enabled).toBe(false)
    })
  })

  describe("convertMCPServers", () => {
    it("should convert multiple servers with prefix", () => {
      const servers = [
        {
          name: "server1",
          server: { command: "cmd1" } as ClaudeMCPServer,
          source: "project" as const,
          sourcePath: "/path/to/.mcp.json",
        },
        {
          name: "server2",
          server: { command: "cmd2", args: ["--flag"] } as ClaudeMCPServer,
          source: "user" as const,
          sourcePath: "~/.mcp.json",
        },
      ]

      const converted = convertMCPServers(servers, { filePrefix: "claude_" })

      expect(converted["claude_server1"]).toBeDefined()
      expect(converted["claude_server2"]).toBeDefined()
      const server1 = converted["claude_server1"] as OpenCodeMCPLocalServer
      const server2 = converted["claude_server2"] as OpenCodeMCPLocalServer
      expect(server1.command).toEqual(["cmd1"])
      expect(server2.command).toEqual(["cmd2", "--flag"])
    })

    it("should convert without prefix when not specified", () => {
      const servers = [
        {
          name: "server1",
          server: { command: "cmd1" } as ClaudeMCPServer,
          source: "project" as const,
          sourcePath: "/path",
        },
      ]

      const converted = convertMCPServers(servers, { filePrefix: "" })

      expect(converted["server1"]).toBeDefined()
    })
  })

  describe("mergeMCPConfigs", () => {
    it("should merge multiple configs with later taking precedence", () => {
      const config1 = {
        server1: { type: "local" as const, command: ["cmd1"], enabled: true },
        server2: { type: "local" as const, command: ["cmd2"], enabled: true },
      }

      const config2 = {
        server2: { type: "local" as const, command: ["cmd2-updated"], enabled: false },
        server3: { type: "local" as const, command: ["cmd3"], enabled: true },
      }

      const merged = mergeMCPConfigs(config1, config2)

      expect(merged["server1"]).toBeDefined()
      const server2 = merged["server2"] as OpenCodeMCPLocalServer
      expect(server2.command).toEqual(["cmd2-updated"])
      expect(server2.enabled).toBe(false)
      expect(merged["server3"]).toBeDefined()
    })
  })

  describe("getAllMCPServers", () => {
    it("should combine all sources and remove duplicates", async () => {
      // Create configs in different locations
      await testDir.createMCPConfig({
        "project-only": { command: "project" },
        "shared": { command: "project-shared" },
      })

      await testDir.createPluginMCPConfig("test-plugin", {
        "plugin-only": { command: "plugin" },
      })

      const { discovered, converted } = await getAllMCPServers(
        testDir.claudeDir,
        mockHome.path,
        { filePrefix: "" }
      )

      expect(discovered.length).toBeGreaterThanOrEqual(3)
      expect(converted["project-only"]).toBeDefined()
      expect(converted["plugin-only"]).toBeDefined()
    })
  })

  describe("syncMCPToOpenCode", () => {
    it("should create opencode.json with MCP config", async () => {
      const freshDir = await createTestDirectory("mcp-sync")
      const isolatedHome = await createMockHomeDir()

      await freshDir.createMCPConfig({
        "sync-server": {
          command: "npx",
          args: ["-y", "@sync/server"],
        },
      })

      const { serverCount, configPath } = await syncMCPToOpenCode(
        freshDir.claudeDir,
        isolatedHome.path,
        freshDir.openCodeDir,
        { filePrefix: "claude_" }
      )

      expect(serverCount).toBe(1)
      expect(existsSync(configPath)).toBe(true)

      // Read and verify the config
      const configContent = await readFile(configPath, "utf-8")
      const config = JSON.parse(configContent)

      expect(config.$schema).toBe("https://opencode.ai/config.json")
      expect(config.mcp).toBeDefined()
      expect(config.mcp["claude_sync-server"]).toBeDefined()
      expect(config.mcp["claude_sync-server"].type).toBe("local")
      expect(config.mcp["claude_sync-server"].command).toEqual(["npx", "-y", "@sync/server"])

      await freshDir.cleanup()
      await isolatedHome.cleanup()
    })

    it("should merge with existing opencode.json", async () => {
      const freshDir = await createTestDirectory("mcp-merge")
      const isolatedHome = await createMockHomeDir()

      // Create existing config
      const existingConfigPath = join(freshDir.root, "opencode.json")
      await writeFile(
        existingConfigPath,
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          theme: "dark",
          mcp: {
            "existing-server": {
              type: "local",
              command: ["existing"],
            },
          },
        }),
        "utf-8"
      )

      await freshDir.createMCPConfig({
        "new-server": { command: "new" },
      })

      const { serverCount, configPath } = await syncMCPToOpenCode(
        freshDir.claudeDir,
        isolatedHome.path,
        freshDir.openCodeDir,
        { filePrefix: "" }
      )

      expect(serverCount).toBe(1)

      const configContent = await readFile(configPath, "utf-8")
      const config = JSON.parse(configContent)

      // Should preserve existing settings
      expect(config.theme).toBe("dark")
      // Should have both servers
      expect(config.mcp["existing-server"]).toBeDefined()
      expect(config.mcp["new-server"]).toBeDefined()

      await freshDir.cleanup()
      await isolatedHome.cleanup()
    })

    it("should return zero count when no servers found", async () => {
      const emptyDir = await createTestDirectory("mcp-empty")
      const emptyHome = await createMockHomeDir()

      const { serverCount, configPath } = await syncMCPToOpenCode(
        emptyDir.claudeDir,
        emptyHome.path,
        emptyDir.openCodeDir
      )

      expect(serverCount).toBe(0)
      expect(configPath).toBe("")

      await emptyDir.cleanup()
      await emptyHome.cleanup()
    })
  })

  describe("hasMCPConfigs", () => {
    it("should return true when .mcp.json exists", async () => {
      const freshDir = await createTestDirectory("mcp-has")
      await freshDir.createMCPConfig({ "test": { command: "test" } })

      const result = hasMCPConfigs(freshDir.claudeDir, mockHome.path)
      expect(result).toBe(true)

      await freshDir.cleanup()
    })

    it("should return false when no MCP configs exist", async () => {
      const emptyDir = await createTestDirectory("mcp-no-has")
      const emptyHome = await createMockHomeDir()

      const result = hasMCPConfigs(emptyDir.claudeDir, emptyHome.path)
      expect(result).toBe(false)

      await emptyDir.cleanup()
      await emptyHome.cleanup()
    })
  })

  describe("getMCPSummary", () => {
    it("should return summary message when no servers", () => {
      const summary = getMCPSummary([])
      expect(summary).toBe("No MCP servers configured")
    })

    it("should group servers by source", () => {
      const servers = [
        {
          name: "project-server",
          server: { command: "project" } as ClaudeMCPServer,
          source: "project" as const,
          sourcePath: "/path/.mcp.json",
        },
        {
          name: "user-server",
          server: { command: "user" } as ClaudeMCPServer,
          source: "user" as const,
          sourcePath: "~/.mcp.json",
        },
        {
          name: "plugin-server",
          server: { command: "plugin" } as ClaudeMCPServer,
          source: "plugin" as const,
          sourcePath: "/plugin/.mcp.json",
        },
      ]

      const summary = getMCPSummary(servers)

      expect(summary).toContain("3 MCP server(s)")
      expect(summary).toContain("Project-level")
      expect(summary).toContain("User-level")
      expect(summary).toContain("From plugins")
      expect(summary).toContain("project-server")
      expect(summary).toContain("user-server")
      expect(summary).toContain("plugin-server")
    })
  })
})
