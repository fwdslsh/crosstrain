/**
 * Claude Code Settings Loader
 *
 * Reads marketplace and plugin settings directly from Claude Code's settings.json files.
 * This allows crosstrain to use the same settings as Claude Code without needing copies.
 *
 * Settings are read from (in priority order):
 * 1. Project settings: .claude/settings.json
 * 2. Project local settings: .claude/settings.local.json
 * 3. User settings: ~/.claude/settings.json
 * 4. User local settings: ~/.claude/settings.local.json
 */

import { join } from "path"
import { existsSync } from "fs"
import { homedir } from "os"
import type {
  ClaudeSettings,
  ClaudeExtraKnownMarketplace,
  MarketplaceConfig,
  PluginInstallConfig,
} from "../types"
import { readTextFile } from "./parser"

/**
 * Load a single settings.json file
 */
async function loadSettingsFile(filePath: string): Promise<ClaudeSettings | null> {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await readTextFile(filePath)
    return JSON.parse(content) as ClaudeSettings
  } catch (error) {
    // Silently ignore parse errors - file may be malformed
    return null
  }
}

/**
 * Load all Claude Code settings files from a directory
 * Merges settings.json and settings.local.json
 */
async function loadSettingsFromDir(dir: string): Promise<ClaudeSettings | null> {
  const settingsPath = join(dir, "settings.json")
  const localSettingsPath = join(dir, "settings.local.json")

  const settings = await loadSettingsFile(settingsPath)
  const localSettings = await loadSettingsFile(localSettingsPath)

  if (!settings && !localSettings) {
    return null
  }

  // Merge settings - local settings override base settings
  return {
    enabledPlugins: {
      ...settings?.enabledPlugins,
      ...localSettings?.enabledPlugins,
    },
    extraKnownMarketplaces: {
      ...settings?.extraKnownMarketplaces,
      ...localSettings?.extraKnownMarketplaces,
    },
    hooks: localSettings?.hooks ?? settings?.hooks,
  }
}

/**
 * Load and merge Claude Code settings from all locations
 *
 * @param claudeDir - Project's .claude directory path
 * @param loadUserSettings - Whether to load from ~/.claude
 * @returns Merged settings from all sources
 */
export async function loadClaudeSettings(
  claudeDir: string,
  loadUserSettings: boolean = true
): Promise<ClaudeSettings> {
  const homeDir = homedir()
  const userClaudeDir = join(homeDir, ".claude")

  // Start with empty settings
  let mergedSettings: ClaudeSettings = {
    enabledPlugins: {},
    extraKnownMarketplaces: {},
  }

  // Load user settings first (lowest priority)
  if (loadUserSettings) {
    const userSettings = await loadSettingsFromDir(userClaudeDir)
    if (userSettings) {
      mergedSettings = {
        enabledPlugins: {
          ...mergedSettings.enabledPlugins,
          ...userSettings.enabledPlugins,
        },
        extraKnownMarketplaces: {
          ...mergedSettings.extraKnownMarketplaces,
          ...userSettings.extraKnownMarketplaces,
        },
        hooks: userSettings.hooks ?? mergedSettings.hooks,
      }
    }
  }

  // Load project settings (higher priority)
  const projectSettings = await loadSettingsFromDir(claudeDir)
  if (projectSettings) {
    mergedSettings = {
      enabledPlugins: {
        ...mergedSettings.enabledPlugins,
        ...projectSettings.enabledPlugins,
      },
      extraKnownMarketplaces: {
        ...mergedSettings.extraKnownMarketplaces,
        ...projectSettings.extraKnownMarketplaces,
      },
      hooks: projectSettings.hooks ?? mergedSettings.hooks,
    }
  }

  return mergedSettings
}

/**
 * Convert a Claude marketplace source to a crosstrain MarketplaceConfig source URL
 */
function convertMarketplaceSource(source: ClaudeExtraKnownMarketplace["source"]): string {
  switch (source.source) {
    case "github":
      // GitHub shorthand format: org/repo
      return source.repo || ""
    case "git":
      // Direct Git URL
      return source.url || ""
    case "directory":
      // Local filesystem path
      return source.path || ""
    default:
      return ""
  }
}

/**
 * Convert Claude Code settings to crosstrain MarketplaceConfig array
 */
export function convertSettingsToMarketplaces(
  settings: ClaudeSettings
): MarketplaceConfig[] {
  const marketplaces: MarketplaceConfig[] = []

  if (!settings.extraKnownMarketplaces) {
    return marketplaces
  }

  for (const [name, config] of Object.entries(settings.extraKnownMarketplaces)) {
    const source = convertMarketplaceSource(config.source)
    if (source) {
      marketplaces.push({
        name,
        source,
        enabled: true,
      })
    }
  }

  return marketplaces
}

/**
 * Convert Claude Code enabledPlugins to crosstrain PluginInstallConfig array
 */
export function convertSettingsToPlugins(
  settings: ClaudeSettings
): PluginInstallConfig[] {
  const plugins: PluginInstallConfig[] = []

  if (!settings.enabledPlugins) {
    return plugins
  }

  for (const [key, enabled] of Object.entries(settings.enabledPlugins)) {
    // Parse "plugin-name@marketplace-name" format
    const atIndex = key.lastIndexOf("@")
    if (atIndex === -1) {
      // No marketplace specified, skip
      continue
    }

    const pluginName = key.substring(0, atIndex)
    const marketplace = key.substring(atIndex + 1)

    if (pluginName && marketplace) {
      plugins.push({
        name: pluginName,
        marketplace,
        enabled,
        // Default to project installation
        installDir: "project",
      })
    }
  }

  return plugins
}

/**
 * Load marketplace and plugin configurations from Claude Code settings files
 *
 * @param claudeDir - Project's .claude directory path
 * @param loadUserSettings - Whether to load from ~/.claude
 * @returns Object containing marketplaces and plugins arrays
 */
export async function loadMarketplaceAndPluginSettings(
  claudeDir: string,
  loadUserSettings: boolean = true
): Promise<{
  marketplaces: MarketplaceConfig[]
  plugins: PluginInstallConfig[]
}> {
  const settings = await loadClaudeSettings(claudeDir, loadUserSettings)

  return {
    marketplaces: convertSettingsToMarketplaces(settings),
    plugins: convertSettingsToPlugins(settings),
  }
}

/**
 * Check if Claude Code settings files exist
 */
export function hasClaudeSettings(claudeDir: string, checkUserSettings: boolean = true): boolean {
  const homeDir = homedir()

  // Check project settings
  if (existsSync(join(claudeDir, "settings.json"))) {
    return true
  }
  if (existsSync(join(claudeDir, "settings.local.json"))) {
    return true
  }

  // Check user settings
  if (checkUserSettings) {
    const userClaudeDir = join(homeDir, ".claude")
    if (existsSync(join(userClaudeDir, "settings.json"))) {
      return true
    }
    if (existsSync(join(userClaudeDir, "settings.local.json"))) {
      return true
    }
  }

  return false
}
