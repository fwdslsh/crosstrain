/**
 * Tests for the Claude Code settings loader
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { writeFile, mkdir, rm } from "fs/promises"
import { existsSync } from "fs"

import {
  loadClaudeSettings,
  convertSettingsToMarketplaces,
  convertSettingsToPlugins,
  loadMarketplaceAndPluginSettings,
  hasClaudeSettings,
} from "../utils/settings"
import type { ClaudeSettings } from "../types"

describe("Settings Loader", () => {
  let testDir: string
  let claudeDir: string

  beforeEach(async () => {
    testDir = join(process.cwd(), `.test-settings-${Date.now()}`)
    claudeDir = join(testDir, ".claude")
    await mkdir(claudeDir, { recursive: true })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  describe("loadClaudeSettings", () => {
    it("should return empty settings when no settings file exists", async () => {
      const settings = await loadClaudeSettings(claudeDir, false)

      expect(settings.enabledPlugins).toEqual({})
      expect(settings.extraKnownMarketplaces).toEqual({})
    })

    it("should load settings from settings.json", async () => {
      const settingsData: ClaudeSettings = {
        enabledPlugins: {
          "test-plugin@test-marketplace": true,
          "other-plugin@other-marketplace": false,
        },
        extraKnownMarketplaces: {
          "test-marketplace": {
            source: {
              source: "github",
              repo: "org/repo",
            },
          },
        },
      }

      await writeFile(
        join(claudeDir, "settings.json"),
        JSON.stringify(settingsData)
      )

      const settings = await loadClaudeSettings(claudeDir, false)

      expect(settings.enabledPlugins).toEqual(settingsData.enabledPlugins)
      expect(settings.extraKnownMarketplaces).toEqual(settingsData.extraKnownMarketplaces)
    })

    it("should merge settings.local.json over settings.json", async () => {
      await writeFile(
        join(claudeDir, "settings.json"),
        JSON.stringify({
          enabledPlugins: {
            "plugin-a@marketplace": true,
            "plugin-b@marketplace": true,
          },
          extraKnownMarketplaces: {
            "marketplace": {
              source: { source: "github", repo: "org/main" },
            },
          },
        })
      )

      await writeFile(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({
          enabledPlugins: {
            "plugin-b@marketplace": false, // Override
            "plugin-c@marketplace": true, // New
          },
          extraKnownMarketplaces: {
            "local-marketplace": {
              source: { source: "directory", path: "./local" },
            },
          },
        })
      )

      const settings = await loadClaudeSettings(claudeDir, false)

      // plugin-a from base settings
      expect(settings.enabledPlugins?.["plugin-a@marketplace"]).toBe(true)
      // plugin-b overridden by local
      expect(settings.enabledPlugins?.["plugin-b@marketplace"]).toBe(false)
      // plugin-c from local
      expect(settings.enabledPlugins?.["plugin-c@marketplace"]).toBe(true)
      // Both marketplaces should be present
      expect(settings.extraKnownMarketplaces?.["marketplace"]).toBeDefined()
      expect(settings.extraKnownMarketplaces?.["local-marketplace"]).toBeDefined()
    })

    it("should handle malformed settings.json gracefully", async () => {
      await writeFile(join(claudeDir, "settings.json"), "{ invalid json }")

      const settings = await loadClaudeSettings(claudeDir, false)

      expect(settings.enabledPlugins).toEqual({})
      expect(settings.extraKnownMarketplaces).toEqual({})
    })
  })

  describe("convertSettingsToMarketplaces", () => {
    it("should convert GitHub marketplace sources", () => {
      const settings: ClaudeSettings = {
        extraKnownMarketplaces: {
          "github-marketplace": {
            source: { source: "github", repo: "org/plugins" },
          },
        },
      }

      const marketplaces = convertSettingsToMarketplaces(settings)

      expect(marketplaces).toHaveLength(1)
      expect(marketplaces[0].name).toBe("github-marketplace")
      expect(marketplaces[0].source).toBe("org/plugins")
      expect(marketplaces[0].enabled).toBe(true)
    })

    it("should convert Git URL marketplace sources", () => {
      const settings: ClaudeSettings = {
        extraKnownMarketplaces: {
          "git-marketplace": {
            source: { source: "git", url: "https://git.company.com/plugins.git" },
          },
        },
      }

      const marketplaces = convertSettingsToMarketplaces(settings)

      expect(marketplaces).toHaveLength(1)
      expect(marketplaces[0].name).toBe("git-marketplace")
      expect(marketplaces[0].source).toBe("https://git.company.com/plugins.git")
    })

    it("should convert directory marketplace sources", () => {
      const settings: ClaudeSettings = {
        extraKnownMarketplaces: {
          "local-marketplace": {
            source: { source: "directory", path: "./plugins" },
          },
        },
      }

      const marketplaces = convertSettingsToMarketplaces(settings)

      expect(marketplaces).toHaveLength(1)
      expect(marketplaces[0].name).toBe("local-marketplace")
      expect(marketplaces[0].source).toBe("./plugins")
    })

    it("should convert multiple marketplaces", () => {
      const settings: ClaudeSettings = {
        extraKnownMarketplaces: {
          "marketplace-1": {
            source: { source: "github", repo: "org1/repo" },
          },
          "marketplace-2": {
            source: { source: "github", repo: "org2/repo" },
          },
        },
      }

      const marketplaces = convertSettingsToMarketplaces(settings)

      expect(marketplaces).toHaveLength(2)
    })

    it("should return empty array for empty settings", () => {
      const marketplaces = convertSettingsToMarketplaces({})

      expect(marketplaces).toEqual([])
    })
  })

  describe("convertSettingsToPlugins", () => {
    it("should convert enabled plugins", () => {
      const settings: ClaudeSettings = {
        enabledPlugins: {
          "my-plugin@my-marketplace": true,
        },
      }

      const plugins = convertSettingsToPlugins(settings)

      expect(plugins).toHaveLength(1)
      expect(plugins[0].name).toBe("my-plugin")
      expect(plugins[0].marketplace).toBe("my-marketplace")
      expect(plugins[0].enabled).toBe(true)
      expect(plugins[0].installDir).toBe("project")
    })

    it("should convert disabled plugins", () => {
      const settings: ClaudeSettings = {
        enabledPlugins: {
          "disabled-plugin@marketplace": false,
        },
      }

      const plugins = convertSettingsToPlugins(settings)

      expect(plugins).toHaveLength(1)
      expect(plugins[0].enabled).toBe(false)
    })

    it("should handle plugin names with @ in them", () => {
      const settings: ClaudeSettings = {
        enabledPlugins: {
          "@scope/plugin@marketplace": true,
        },
      }

      const plugins = convertSettingsToPlugins(settings)

      expect(plugins).toHaveLength(1)
      expect(plugins[0].name).toBe("@scope/plugin")
      expect(plugins[0].marketplace).toBe("marketplace")
    })

    it("should skip entries without marketplace separator", () => {
      const settings: ClaudeSettings = {
        enabledPlugins: {
          "invalid-entry": true,
          "valid@marketplace": true,
        },
      }

      const plugins = convertSettingsToPlugins(settings)

      expect(plugins).toHaveLength(1)
      expect(plugins[0].name).toBe("valid")
    })

    it("should return empty array for empty settings", () => {
      const plugins = convertSettingsToPlugins({})

      expect(plugins).toEqual([])
    })
  })

  describe("loadMarketplaceAndPluginSettings", () => {
    it("should load and convert both marketplaces and plugins", async () => {
      await writeFile(
        join(claudeDir, "settings.json"),
        JSON.stringify({
          enabledPlugins: {
            "test-plugin@test-marketplace": true,
          },
          extraKnownMarketplaces: {
            "test-marketplace": {
              source: { source: "github", repo: "org/repo" },
            },
          },
        })
      )

      const { marketplaces, plugins } = await loadMarketplaceAndPluginSettings(
        claudeDir,
        false
      )

      expect(marketplaces).toHaveLength(1)
      expect(marketplaces[0].name).toBe("test-marketplace")
      expect(plugins).toHaveLength(1)
      expect(plugins[0].name).toBe("test-plugin")
    })
  })

  describe("hasClaudeSettings", () => {
    it("should return false when no settings exist", () => {
      expect(hasClaudeSettings(claudeDir, false)).toBe(false)
    })

    it("should return true when settings.json exists", async () => {
      await writeFile(join(claudeDir, "settings.json"), "{}")

      expect(hasClaudeSettings(claudeDir, false)).toBe(true)
    })

    it("should return true when settings.local.json exists", async () => {
      await writeFile(join(claudeDir, "settings.local.json"), "{}")

      expect(hasClaudeSettings(claudeDir, false)).toBe(true)
    })
  })

  describe("Integration with config loading", () => {
    let settingsDir: string

    beforeEach(async () => {
      settingsDir = join(testDir, ".opencode", "plugin", "crosstrain")
      await mkdir(settingsDir, { recursive: true })
    })

    it("should merge Claude Code settings with crosstrain config", async () => {
      // Create Claude Code settings
      await writeFile(
        join(claudeDir, "settings.json"),
        JSON.stringify({
          enabledPlugins: {
            "plugin-from-claude@claude-marketplace": true,
          },
          extraKnownMarketplaces: {
            "claude-marketplace": {
              source: { source: "github", repo: "claude/plugins" },
            },
          },
        })
      )

      // Create crosstrain config that should add additional marketplaces
      await writeFile(
        join(settingsDir, "settings.json"),
        JSON.stringify({
          marketplaces: [
            {
              name: "crosstrain-marketplace",
              source: "crosstrain/plugins",
            },
          ],
          plugins: [
            {
              name: "plugin-from-crosstrain",
              marketplace: "crosstrain-marketplace",
            },
          ],
        })
      )

      const { resolveConfig } = await import("../utils/config")
      const config = await resolveConfig(testDir)

      // Should have marketplaces from both sources
      expect(config.marketplaces.some(m => m.name === "claude-marketplace")).toBe(true)
      expect(config.marketplaces.some(m => m.name === "crosstrain-marketplace")).toBe(true)

      // Should have plugins from both sources
      expect(config.plugins.some(p => p.name === "plugin-from-claude")).toBe(true)
      expect(config.plugins.some(p => p.name === "plugin-from-crosstrain")).toBe(true)
    })

    it("should allow crosstrain config to override Claude Code settings", async () => {
      // Create Claude Code settings
      await writeFile(
        join(claudeDir, "settings.json"),
        JSON.stringify({
          extraKnownMarketplaces: {
            "shared-marketplace": {
              source: { source: "github", repo: "original/repo" },
            },
          },
        })
      )

      // Create crosstrain config that overrides the marketplace
      await writeFile(
        join(settingsDir, "settings.json"),
        JSON.stringify({
          marketplaces: [
            {
              name: "shared-marketplace",
              source: "overridden/repo",
            },
          ],
        })
      )

      const { resolveConfig } = await import("../utils/config")
      const config = await resolveConfig(testDir)

      // Should only have one marketplace with the name
      const sharedMarketplaces = config.marketplaces.filter(
        m => m.name === "shared-marketplace"
      )
      expect(sharedMarketplaces).toHaveLength(1)
      // Crosstrain config should take priority
      expect(sharedMarketplaces[0].source).toBe("overridden/repo")
    })

    it("should respect loadUserSettings=false", async () => {
      // This test would require mocking homedir(), so we just verify the config is passed
      const { resolveConfig } = await import("../utils/config")
      const config = await resolveConfig(testDir, { loadUserSettings: false })

      expect(config.loadUserSettings).toBe(false)
    })
  })
})
