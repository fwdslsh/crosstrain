/**
 * Tests for plugin installer
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { join } from "path"
import { mkdir, writeFile, rm } from "fs/promises"
import { existsSync } from "fs"
import { homedir } from "os"
import {
  resolveInstallDir,
  isPluginInstalled,
  installPlugin,
  uninstallPlugin,
  listInstalledPlugins,
} from "../loaders/plugin-installer"
import type { ParsedPlugin, ClaudePluginManifest } from "../types"

describe("Plugin Installer", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(process.cwd(), `.test-installer-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  describe("resolveInstallDir", () => {
    it("should resolve 'project' to .claude directory", () => {
      const result = resolveInstallDir("project", testDir)
      expect(result).toBe(join(testDir, ".claude"))
    })

    it("should resolve undefined to .claude directory", () => {
      const result = resolveInstallDir(undefined, testDir)
      expect(result).toBe(join(testDir, ".claude"))
    })

    it("should resolve 'user' to home .claude directory", () => {
      const result = resolveInstallDir("user", testDir)
      expect(result).toBe(join(homedir(), ".claude"))
    })

    it("should resolve absolute paths directly", () => {
      const absolutePath = "/custom/path"
      const result = resolveInstallDir(absolutePath, testDir)
      expect(result).toBe(absolutePath)
    })

    it("should resolve relative paths relative to project", () => {
      const result = resolveInstallDir("./custom", testDir)
      expect(result).toContain("custom")
    })
  })

  describe("isPluginInstalled", () => {
    it("should return false for non-existent plugin", async () => {
      const installDir = join(testDir, "install")
      const installed = await isPluginInstalled("non-existent", installDir)
      expect(installed).toBe(false)
    })

    it("should return true for installed plugin", async () => {
      const installDir = join(testDir, "install")
      const pluginPath = join(installDir, "plugins", "test-plugin")
      await mkdir(join(pluginPath, ".claude-plugin"), { recursive: true })
      await writeFile(join(pluginPath, ".claude-plugin", "plugin.json"), "{}")

      const installed = await isPluginInstalled("test-plugin", installDir)
      expect(installed).toBe(true)
    })
  })

  describe("installPlugin", () => {
    it("should install a plugin successfully", async () => {
      // Create a source plugin
      const sourcePath = join(testDir, "source", "test-plugin")
      await mkdir(join(sourcePath, ".claude-plugin"), { recursive: true })
      await mkdir(join(sourcePath, "commands"), { recursive: true })

      const manifest: ClaudePluginManifest = {
        name: "test-plugin",
        description: "Test plugin",
        version: "1.0.0",
      }

      await writeFile(
        join(sourcePath, ".claude-plugin", "plugin.json"),
        JSON.stringify(manifest, null, 2)
      )
      await writeFile(join(sourcePath, "commands", "test.md"), "# Test command")

      const plugin: ParsedPlugin = {
        manifest,
        marketplace: "test",
        sourcePath,
        hasSkills: false,
        hasAgents: false,
        hasCommands: true,
        hasHooks: false,
        hasMCP: false,
      }

      // Install the plugin
      const installDir = join(testDir, "install")
      const result = await installPlugin(plugin, installDir)

      expect(result.success).toBe(true)
      expect(result.installedPath).toBe(join(installDir, "plugins", "test-plugin"))
      expect(existsSync(join(installDir, "plugins", "test-plugin", ".claude-plugin", "plugin.json"))).toBe(true)
      expect(existsSync(join(installDir, "plugins", "test-plugin", "commands", "test.md"))).toBe(true)
    })

    it("should fail if plugin already exists without force", async () => {
      // Create a source plugin
      const sourcePath = join(testDir, "source", "test-plugin")
      await mkdir(join(sourcePath, ".claude-plugin"), { recursive: true })

      const manifest: ClaudePluginManifest = {
        name: "test-plugin",
        version: "1.0.0",
      }

      await writeFile(
        join(sourcePath, ".claude-plugin", "plugin.json"),
        JSON.stringify(manifest, null, 2)
      )

      const plugin: ParsedPlugin = {
        manifest,
        marketplace: "test",
        sourcePath,
        hasSkills: false,
        hasAgents: false,
        hasCommands: false,
        hasHooks: false,
        hasMCP: false,
      }

      // Install the plugin first time
      const installDir = join(testDir, "install")
      const result1 = await installPlugin(plugin, installDir)
      expect(result1.success).toBe(true)

      // Try to install again without force
      const result2 = await installPlugin(plugin, installDir, { force: false })
      expect(result2.success).toBe(false)
      expect(result2.message).toContain("already installed")
    })

    it("should reinstall if force option is used", async () => {
      // Create a source plugin
      const sourcePath = join(testDir, "source", "test-plugin")
      await mkdir(join(sourcePath, ".claude-plugin"), { recursive: true })

      const manifest: ClaudePluginManifest = {
        name: "test-plugin",
        version: "1.0.0",
      }

      await writeFile(
        join(sourcePath, ".claude-plugin", "plugin.json"),
        JSON.stringify(manifest, null, 2)
      )

      const plugin: ParsedPlugin = {
        manifest,
        marketplace: "test",
        sourcePath,
        hasSkills: false,
        hasAgents: false,
        hasCommands: false,
        hasHooks: false,
        hasMCP: false,
      }

      // Install the plugin first time
      const installDir = join(testDir, "install")
      const result1 = await installPlugin(plugin, installDir)
      expect(result1.success).toBe(true)

      // Reinstall with force
      const result2 = await installPlugin(plugin, installDir, { force: true })
      expect(result2.success).toBe(true)
      expect(result2.message).toContain("Successfully installed")
    })
  })

  describe("uninstallPlugin", () => {
    it("should uninstall a plugin successfully", async () => {
      // Create an installed plugin
      const installDir = join(testDir, "install")
      const pluginPath = join(installDir, "plugins", "test-plugin")
      await mkdir(join(pluginPath, ".claude-plugin"), { recursive: true })
      await writeFile(join(pluginPath, ".claude-plugin", "plugin.json"), "{}")

      const result = await uninstallPlugin("test-plugin", installDir)
      expect(result.success).toBe(true)
      expect(existsSync(pluginPath)).toBe(false)
    })

    it("should fail if plugin is not installed", async () => {
      const installDir = join(testDir, "install")
      const result = await uninstallPlugin("non-existent", installDir)
      expect(result.success).toBe(false)
      expect(result.message).toContain("not installed")
    })
  })

  describe("listInstalledPlugins", () => {
    it("should list all installed plugins", async () => {
      const installDir = join(testDir, "install")
      const pluginsDir = join(installDir, "plugins")

      // Create multiple plugins
      for (const name of ["plugin1", "plugin2", "plugin3"]) {
        const pluginPath = join(pluginsDir, name)
        await mkdir(join(pluginPath, ".claude-plugin"), { recursive: true })
        await writeFile(join(pluginPath, ".claude-plugin", "plugin.json"), `{"name":"${name}"}`)
      }

      const plugins = await listInstalledPlugins(installDir)
      expect(plugins).toHaveLength(3)
      expect(plugins).toContain("plugin1")
      expect(plugins).toContain("plugin2")
      expect(plugins).toContain("plugin3")
    })

    it("should return empty array for no plugins directory", async () => {
      const installDir = join(testDir, "empty")
      const plugins = await listInstalledPlugins(installDir)
      expect(plugins).toHaveLength(0)
    })

    it("should ignore directories without plugin manifests", async () => {
      const installDir = join(testDir, "install")
      const pluginsDir = join(installDir, "plugins")

      // Create a valid plugin
      const validPath = join(pluginsDir, "valid-plugin")
      await mkdir(join(validPath, ".claude-plugin"), { recursive: true })
      await writeFile(join(validPath, ".claude-plugin", "plugin.json"), "{}")

      // Create an invalid directory (no manifest)
      const invalidPath = join(pluginsDir, "invalid-dir")
      await mkdir(invalidPath, { recursive: true })

      const plugins = await listInstalledPlugins(installDir)
      expect(plugins).toHaveLength(1)
      expect(plugins[0]).toBe("valid-plugin")
    })
  })
})
