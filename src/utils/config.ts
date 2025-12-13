/**
 * Configuration Loader
 *
 * Loads crosstrain plugin configuration from:
 * 1. .opencode/plugin/crosstrain/settings.json (primary config location)
 * 2. Environment variables (overrides)
 * 3. Direct plugin options (highest priority)
 *
 * Claude Code settings.json files are also read for marketplace/plugin discovery.
 */

import { join } from "path"
import { existsSync } from "fs"
import type {
  CrosstrainConfig,
  ResolvedCrossstrainConfig,
  MarketplaceConfig,
  PluginInstallConfig,
} from "../types"
import {
  DEFAULT_CONFIG,
  MODEL_MAPPING,
  TOOL_MAPPING,
} from "../types"
import { readTextFile } from "./parser"
import { loadMarketplaceAndPluginSettings } from "./settings"

/**
 * Primary settings file location within plugin directory
 */
const SETTINGS_FILE = "settings.json"

/**
 * Logger that respects verbose setting
 */
export class ConfigLogger {
  constructor(private verbose: boolean = false) {}

  log(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      console.log(`[crosstrain] ${message}`, ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[crosstrain] ${message}`, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[crosstrain] ${message}`, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[crosstrain] ${message}`, ...args)
  }
}

/**
 * Load configuration from a JSON file
 */
async function loadConfigFile(filePath: string): Promise<CrosstrainConfig | null> {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await readTextFile(filePath)
    return JSON.parse(content) as CrosstrainConfig
  } catch {
    return null
  }
}

/**
 * Deep merge two objects, with source values overriding target values
 */
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = result[key]

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue !== undefined &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue
    }
  }

  return result
}

/**
 * Merge marketplace configs, avoiding duplicates by name
 */
function mergeMarketplaces(
  base: MarketplaceConfig[],
  override: MarketplaceConfig[]
): MarketplaceConfig[] {
  const result = [...base]

  for (const marketplace of override) {
    const existingIndex = result.findIndex(m => m.name === marketplace.name)
    if (existingIndex >= 0) {
      result[existingIndex] = { ...result[existingIndex], ...marketplace }
    } else {
      result.push(marketplace)
    }
  }

  return result
}

/**
 * Merge plugin configs, avoiding duplicates by name+marketplace
 */
function mergePlugins(
  base: PluginInstallConfig[],
  override: PluginInstallConfig[]
): PluginInstallConfig[] {
  const result = [...base]

  for (const plugin of override) {
    const key = `${plugin.name}@${plugin.marketplace}`
    const existingIndex = result.findIndex(
      p => `${p.name}@${p.marketplace}` === key
    )
    if (existingIndex >= 0) {
      result[existingIndex] = { ...result[existingIndex], ...plugin }
    } else {
      result.push(plugin)
    }
  }

  return result
}

/**
 * Get the plugin settings file path
 * Returns path to .opencode/plugin/crosstrain/settings.json
 */
export function getSettingsPath(directory: string): string {
  return join(directory, ".opencode", "plugin", "crosstrain", SETTINGS_FILE)
}

/**
 * Load configuration from environment variables
 */
export function loadEnvConfig(): CrosstrainConfig {
  const config: CrosstrainConfig = {}

  if (process.env.CROSSTRAIN_ENABLED !== undefined) {
    config.enabled = process.env.CROSSTRAIN_ENABLED !== "false" && process.env.CROSSTRAIN_ENABLED !== "0"
  }

  if (process.env.CROSSTRAIN_VERBOSE !== undefined) {
    config.verbose = process.env.CROSSTRAIN_VERBOSE === "true" || process.env.CROSSTRAIN_VERBOSE === "1"
  }

  if (process.env.CROSSTRAIN_WATCH !== undefined) {
    config.watch = process.env.CROSSTRAIN_WATCH !== "false" && process.env.CROSSTRAIN_WATCH !== "0"
  }

  if (process.env.CROSSTRAIN_CLAUDE_DIR) {
    config.claudeDir = process.env.CROSSTRAIN_CLAUDE_DIR
  }

  if (process.env.CROSSTRAIN_OPENCODE_DIR) {
    config.openCodeDir = process.env.CROSSTRAIN_OPENCODE_DIR
  }

  if (process.env.CROSSTRAIN_LOAD_USER_ASSETS !== undefined) {
    config.loadUserAssets = process.env.CROSSTRAIN_LOAD_USER_ASSETS !== "false" && process.env.CROSSTRAIN_LOAD_USER_ASSETS !== "0"
  }

  if (process.env.CROSSTRAIN_LOAD_USER_SETTINGS !== undefined) {
    config.loadUserSettings = process.env.CROSSTRAIN_LOAD_USER_SETTINGS !== "false" && process.env.CROSSTRAIN_LOAD_USER_SETTINGS !== "0"
  }

  return config
}

/**
 * Resolve configuration by merging from all sources
 *
 * Priority (highest to lowest):
 * 1. Direct options passed to function
 * 2. Environment variables
 * 3. .opencode/plugin/crosstrain/settings.json
 * 4. Default values
 */
export async function resolveConfig(
  directory: string,
  options?: CrosstrainConfig
): Promise<ResolvedCrossstrainConfig> {
  // Start with defaults
  let config = { ...DEFAULT_CONFIG } as Record<string, any>

  // Layer 1: Load from plugin settings file
  const settingsPath = getSettingsPath(directory)
  const fileConfig = await loadConfigFile(settingsPath)
  if (fileConfig) {
    config = deepMerge(config, fileConfig as Record<string, any>)
  }

  // Layer 2: Apply environment variable overrides
  const envConfig = loadEnvConfig()
  if (Object.keys(envConfig).length > 0) {
    config = deepMerge(config, envConfig as Record<string, any>)
  }

  // Layer 3: Apply direct options (highest priority)
  if (options) {
    config = deepMerge(config, options as Record<string, any>)
  }

  // Apply default mappings (user mappings extend defaults)
  config.modelMappings = {
    ...MODEL_MAPPING,
    ...config.modelMappings,
  }

  config.toolMappings = {
    ...TOOL_MAPPING,
    ...config.toolMappings,
  }

  // Load marketplace and plugin settings from Claude Code settings.json files
  const claudeDir = join(directory, config.claudeDir || ".claude")
  const loadUserSettings = config.loadUserSettings !== false

  try {
    const claudeSettings = await loadMarketplaceAndPluginSettings(
      claudeDir,
      loadUserSettings
    )

    // Merge Claude Code settings (base) with crosstrain config (override)
    config.marketplaces = mergeMarketplaces(
      claudeSettings.marketplaces,
      config.marketplaces || []
    )
    config.plugins = mergePlugins(
      claudeSettings.plugins,
      config.plugins || []
    )
  } catch {
    // Silently ignore errors loading Claude Code settings
  }

  return config as ResolvedCrossstrainConfig
}

/**
 * Validate configuration and return warnings
 */
export function validateConfig(config: ResolvedCrossstrainConfig): string[] {
  const warnings: string[] = []

  if (config.claudeDir.includes("..")) {
    warnings.push(`claudeDir "${config.claudeDir}" contains parent directory references`)
  }

  if (config.openCodeDir.includes("..")) {
    warnings.push(`openCodeDir "${config.openCodeDir}" contains parent directory references`)
  }

  if (config.filePrefix === "") {
    warnings.push("filePrefix is empty, generated files may conflict with existing files")
  }

  const { loaders } = config
  if (!loaders.skills && !loaders.agents && !loaders.commands && !loaders.hooks && !loaders.mcp) {
    warnings.push("All loaders are disabled, plugin will not load any assets")
  }

  return warnings
}

/**
 * Create a logger instance based on config
 */
export function createLogger(config: ResolvedCrossstrainConfig): ConfigLogger {
  return new ConfigLogger(config.verbose)
}

/**
 * Get resolved paths based on configuration
 */
export function getResolvedPaths(
  directory: string,
  config: ResolvedCrossstrainConfig
): {
  claudeDir: string
  openCodeDir: string
} {
  return {
    claudeDir: join(directory, config.claudeDir),
    openCodeDir: join(directory, config.openCodeDir),
  }
}

/**
 * Full configuration resolution (alias for resolveConfig)
 */
export async function loadConfig(
  directory: string,
  options?: CrosstrainConfig
): Promise<ResolvedCrossstrainConfig> {
  return resolveConfig(directory, options)
}
