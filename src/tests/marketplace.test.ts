/**
 * Tests for marketplace loader
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { mkdir, writeFile, rm } from "fs/promises"
import { existsSync } from "fs"
import {
  parseMarketplaceManifest,
  parsePluginManifest,
  resolveMarketplaceSource,
  discoverPluginsInMarketplace,
  loadMarketplace,
  listAvailablePlugins,
  findPlugin,
  clearGitMarketplaceCache,
  getGitCacheDirectory,
} from "../loaders/marketplace"
import type { MarketplaceConfig, ClaudeMarketplaceManifest, ClaudePluginManifest } from "../types"

describe("Marketplace Loader", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(process.cwd(), `.test-marketplace-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  describe("parseMarketplaceManifest", () => {
    it("should parse a valid marketplace manifest", async () => {
      const marketplacePath = join(testDir, "marketplace")
      await mkdir(join(marketplacePath, ".claude-plugin"), { recursive: true })

      const manifest: ClaudeMarketplaceManifest = {
        name: "test-marketplace",
        owner: { name: "Test Owner" },
        plugins: [
          { name: "plugin1", source: "./plugin1" },
          { name: "plugin2", source: "./plugin2" },
        ],
      }

      await writeFile(
        join(marketplacePath, ".claude-plugin", "marketplace.json"),
        JSON.stringify(manifest, null, 2)
      )

      const parsed = await parseMarketplaceManifest(marketplacePath)
      expect(parsed).toEqual(manifest)
    })

    it("should return null for missing manifest", async () => {
      const marketplacePath = join(testDir, "no-manifest")
      await mkdir(marketplacePath, { recursive: true })

      const parsed = await parseMarketplaceManifest(marketplacePath)
      expect(parsed).toBeNull()
    })

    it("should return null for invalid JSON", async () => {
      const marketplacePath = join(testDir, "invalid")
      await mkdir(join(marketplacePath, ".claude-plugin"), { recursive: true })
      await writeFile(
        join(marketplacePath, ".claude-plugin", "marketplace.json"),
        "invalid json"
      )

      const parsed = await parseMarketplaceManifest(marketplacePath)
      expect(parsed).toBeNull()
    })
  })

  describe("parsePluginManifest", () => {
    it("should parse a valid plugin manifest", async () => {
      const pluginPath = join(testDir, "plugin")
      await mkdir(join(pluginPath, ".claude-plugin"), { recursive: true })

      const manifest: ClaudePluginManifest = {
        name: "test-plugin",
        description: "A test plugin",
        version: "1.0.0",
        author: { name: "Test Author" },
      }

      await writeFile(
        join(pluginPath, ".claude-plugin", "plugin.json"),
        JSON.stringify(manifest, null, 2)
      )

      const parsed = await parsePluginManifest(pluginPath)
      expect(parsed).toEqual(manifest)
    })

    it("should return null for missing manifest", async () => {
      const pluginPath = join(testDir, "no-manifest")
      await mkdir(pluginPath, { recursive: true })

      const parsed = await parsePluginManifest(pluginPath)
      expect(parsed).toBeNull()
    })
  })

  describe("resolveMarketplaceSource", () => {
    it("should resolve local relative paths", () => {
      const result = resolveMarketplaceSource("./marketplaces/local", testDir)
      expect(result.type).toBe("local")
      expect(result.path).toContain("marketplaces/local")
    })

    it("should resolve absolute paths", () => {
      const result = resolveMarketplaceSource("/absolute/path", testDir)
      expect(result.type).toBe("local")
      expect(result.path).toBe("/absolute/path")
    })

    it("should recognize Git URLs", () => {
      const result = resolveMarketplaceSource("https://github.com/org/repo", testDir)
      expect(result.type).toBe("git")
      expect(result.url).toBe("https://github.com/org/repo")
    })

    it("should recognize GitHub shorthands", () => {
      const result = resolveMarketplaceSource("org/repo", testDir)
      expect(result.type).toBe("git")
      expect(result.url).toBe("https://github.com/org/repo")
    })
  })

  describe("discoverPluginsInMarketplace", () => {
    it("should discover plugins in a marketplace", async () => {
      const marketplacePath = join(testDir, "marketplace")
      await mkdir(join(marketplacePath, ".claude-plugin"), { recursive: true })

      // Create marketplace manifest
      const marketplaceManifest: ClaudeMarketplaceManifest = {
        name: "test-marketplace",
        plugins: [
          { name: "plugin1", source: "./plugin1" },
          { name: "plugin2", source: "./plugin2" },
        ],
      }

      await writeFile(
        join(marketplacePath, ".claude-plugin", "marketplace.json"),
        JSON.stringify(marketplaceManifest, null, 2)
      )

      // Create plugin 1
      const plugin1Path = join(marketplacePath, "plugin1")
      await mkdir(join(plugin1Path, ".claude-plugin"), { recursive: true })
      await mkdir(join(plugin1Path, "skills"), { recursive: true })
      await mkdir(join(plugin1Path, "agents"), { recursive: true })

      const plugin1Manifest: ClaudePluginManifest = {
        name: "plugin1",
        description: "First plugin",
        version: "1.0.0",
      }

      await writeFile(
        join(plugin1Path, ".claude-plugin", "plugin.json"),
        JSON.stringify(plugin1Manifest, null, 2)
      )

      // Create plugin 2
      const plugin2Path = join(marketplacePath, "plugin2")
      await mkdir(join(plugin2Path, ".claude-plugin"), { recursive: true })
      await mkdir(join(plugin2Path, "commands"), { recursive: true })

      const plugin2Manifest: ClaudePluginManifest = {
        name: "plugin2",
        description: "Second plugin",
        version: "2.0.0",
      }

      await writeFile(
        join(plugin2Path, ".claude-plugin", "plugin.json"),
        JSON.stringify(plugin2Manifest, null, 2)
      )

      // Discover plugins
      const plugins = await discoverPluginsInMarketplace(marketplacePath, "test-marketplace")

      expect(plugins).toHaveLength(2)
      expect(plugins[0].manifest.name).toBe("plugin1")
      expect(plugins[0].hasSkills).toBe(true)
      expect(plugins[0].hasAgents).toBe(true)
      expect(plugins[0].hasCommands).toBe(false)
      expect(plugins[1].manifest.name).toBe("plugin2")
      expect(plugins[1].hasCommands).toBe(true)
    })

    it("should return empty array for marketplace without plugins", async () => {
      const marketplacePath = join(testDir, "empty-marketplace")
      await mkdir(join(marketplacePath, ".claude-plugin"), { recursive: true })

      const marketplaceManifest: ClaudeMarketplaceManifest = {
        name: "empty-marketplace",
        plugins: [],
      }

      await writeFile(
        join(marketplacePath, ".claude-plugin", "marketplace.json"),
        JSON.stringify(marketplaceManifest, null, 2)
      )

      const plugins = await discoverPluginsInMarketplace(marketplacePath, "empty-marketplace")
      expect(plugins).toHaveLength(0)
    })
  })

  describe("loadMarketplace", () => {
    it("should load a local marketplace", async () => {
      const marketplacePath = join(testDir, "local-marketplace")
      await mkdir(join(marketplacePath, ".claude-plugin"), { recursive: true })

      const manifest: ClaudeMarketplaceManifest = {
        name: "local-marketplace",
        plugins: [],
      }

      await writeFile(
        join(marketplacePath, ".claude-plugin", "marketplace.json"),
        JSON.stringify(manifest, null, 2)
      )

      const config: MarketplaceConfig = {
        name: "local-marketplace",
        source: "./local-marketplace",
        enabled: true,
      }

      const result = await loadMarketplace(config, testDir)
      expect(result).not.toBeNull()
      expect(result?.manifest).toEqual(manifest)
    })

    it("should return null for disabled marketplace", async () => {
      const config: MarketplaceConfig = {
        name: "disabled",
        source: "./disabled",
        enabled: false,
      }

      const result = await loadMarketplace(config, testDir)
      expect(result).toBeNull()
    })

    it("should return null for non-existent path", async () => {
      const config: MarketplaceConfig = {
        name: "missing",
        source: "./missing",
        enabled: true,
      }

      const result = await loadMarketplace(config, testDir)
      expect(result).toBeNull()
    })
  })

  describe("findPlugin", () => {
    it("should find a plugin in a marketplace", async () => {
      const marketplacePath = join(testDir, "marketplace")
      await mkdir(join(marketplacePath, ".claude-plugin"), { recursive: true })

      const marketplaceManifest: ClaudeMarketplaceManifest = {
        name: "test-marketplace",
        plugins: [{ name: "target-plugin", source: "./target-plugin" }],
      }

      await writeFile(
        join(marketplacePath, ".claude-plugin", "marketplace.json"),
        JSON.stringify(marketplaceManifest, null, 2)
      )

      const pluginPath = join(marketplacePath, "target-plugin")
      await mkdir(join(pluginPath, ".claude-plugin"), { recursive: true })

      const pluginManifest: ClaudePluginManifest = {
        name: "target-plugin",
        description: "Target plugin",
      }

      await writeFile(
        join(pluginPath, ".claude-plugin", "plugin.json"),
        JSON.stringify(pluginManifest, null, 2)
      )

      const marketplaces: MarketplaceConfig[] = [
        { name: "test-marketplace", source: "./marketplace", enabled: true },
      ]

      const found = await findPlugin("target-plugin", "test-marketplace", marketplaces, testDir)
      expect(found).not.toBeNull()
      expect(found?.manifest.name).toBe("target-plugin")
    })

    it("should return null for non-existent plugin", async () => {
      const marketplaces: MarketplaceConfig[] = [
        { name: "test-marketplace", source: "./marketplace", enabled: true },
      ]

      const found = await findPlugin("non-existent", "test-marketplace", marketplaces, testDir)
      expect(found).toBeNull()
    })
  })

  describe("Git Marketplace Support", () => {
    it("should recognize Git HTTPS URLs", () => {
      const result = resolveMarketplaceSource("https://github.com/org/repo", testDir)
      expect(result.type).toBe("git")
      expect(result.url).toBe("https://github.com/org/repo")
    })

    it("should recognize Git SSH URLs", () => {
      const result = resolveMarketplaceSource("git@github.com:org/repo.git", testDir)
      expect(result.type).toBe("git")
      expect(result.url).toBe("git@github.com:org/repo.git")
    })

    it("should convert GitHub shorthand to HTTPS URL", () => {
      const result = resolveMarketplaceSource("org/repo", testDir)
      expect(result.type).toBe("git")
      expect(result.url).toBe("https://github.com/org/repo")
    })

    it("should support ref parameter in marketplace config", () => {
      const config: MarketplaceConfig = {
        name: "test-marketplace",
        source: "org/repo",
        ref: "v1.0.0",
        enabled: true,
      }
      expect(config.ref).toBe("v1.0.0")
    })
  })
})
