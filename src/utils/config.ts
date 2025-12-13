/**
 * Configuration Loader
 *
 * Loads and resolves crosstrain plugin configuration from multiple sources:
 * 1. Direct plugin options (highest priority)
 * 2. opencode.json plugin configuration
 * 3. .crosstrainrc.json or crosstrain.config.json
 * 4. Default values (lowest priority)
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
 * Configuration file names to search for (in priority order)
 */
const CONFIG_FILES = [
  ".crosstrainrc.json",
  "crosstrain.config.json",
  ".crosstrain.json",
]

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
  try {
    const content = await readTextFile(filePath)
    return JSON.parse(content) as CrosstrainConfig
  } catch {
    return null
  }
}

/**
 * Load configuration from opencode.json
 */
async function loadOpenCodeConfig(directory: string): Promise<CrosstrainConfig | null> {
  const openCodeJsonPath = join(directory, "opencode.json")

  if (!existsSync(openCodeJsonPath)) {
    return null
  }

  try {
    const content = await readTextFile(openCodeJsonPath)
    const openCodeConfig = JSON.parse(content)

    // Look for crosstrain configuration in various locations
    // Option 1: plugins.crosstrain
    if (openCodeConfig.plugins?.crosstrain) {
      return openCodeConfig.plugins.crosstrain as CrosstrainConfig
    }

    // Option 2: plugin.crosstrain (singular)
    if (openCodeConfig.plugin?.crosstrain) {
      return openCodeConfig.plugin.crosstrain as CrosstrainConfig
    }

    // Option 3: crosstrain at root level
    if (openCodeConfig.crosstrain) {
      return openCodeConfig.crosstrain as CrosstrainConfig
    }

    return null
  } catch {
    return null
  }
}

/**
 * Search for and load configuration from a config file
 */
async function loadConfigFromFile(directory: string): Promise<CrosstrainConfig | null> {
  for (const configFile of CONFIG_FILES) {
    const configPath = join(directory, configFile)
    if (existsSync(configPath)) {
      const config = await loadConfigFile(configPath)
      if (config) {
        return config
      }
    }
  }
  return null
}

/**
 * Deep merge two objects
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
      // Recursively merge objects
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
      // Override existing marketplace
      result[existingIndex] = { ...result[existingIndex], ...marketplace }
    } else {
      // Add new marketplace
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
      // Override existing plugin config
      result[existingIndex] = { ...result[existingIndex], ...plugin }
    } else {
      // Add new plugin
      result.push(plugin)
    }
  }

  return result
}

/**
 * Resolve configuration by merging from all sources
 */
export async function resolveConfig(
  directory: string,
  options?: CrosstrainConfig
): Promise<ResolvedCrossstrainConfig> {
  // Start with defaults
  let config = { ...DEFAULT_CONFIG } as Record<string, any>

  // Layer 1: Load from config file
  const fileConfig = await loadConfigFromFile(directory)
  if (fileConfig) {
    config = deepMerge(config, fileConfig as Record<string, any>)
  }

  // Layer 2: Load from opencode.json
  const openCodeConfig = await loadOpenCodeConfig(directory)
  if (openCodeConfig) {
    config = deepMerge(config, openCodeConfig as Record<string, any>)
  }

  // Layer 3: Apply direct options (highest priority)
  if (options) {
    config = deepMerge(config, options as Record<string, any>)
  }

  // Merge custom mappings with defaults
  config.modelMappings = {
    ...MODEL_MAPPING,
    ...config.modelMappings,
  }

  config.toolMappings = {
    ...TOOL_MAPPING,
    ...config.toolMappings,
  }

  // Layer 4: Load marketplace and plugin settings from Claude Code settings.json files
  // These are loaded as base settings that can be overridden by crosstrain config
  const claudeDir = join(directory, config.claudeDir || ".claude")
  const loadUserSettings = config.loadUserSettings !== false

  try {
    const claudeSettings = await loadMarketplaceAndPluginSettings(
      claudeDir,
      loadUserSettings
    )

    // Merge Claude Code settings with crosstrain config
    // Crosstrain config takes priority (existing marketplaces/plugins override Claude Code settings)
    config.marketplaces = mergeMarketplaces(
      claudeSettings.marketplaces,
      config.marketplaces || []
    )
    config.plugins = mergePlugins(
      claudeSettings.plugins,
      config.plugins || []
    )
  } catch (error) {
    // Silently ignore errors loading Claude Code settings
    // Config-based marketplaces/plugins will still work
  }

  return config as ResolvedCrossstrainConfig
}

/**
 * Validate configuration and return warnings
 */
export function validateConfig(config: ResolvedCrossstrainConfig): string[] {
  const warnings: string[] = []

  // Check if claude directory path looks valid
  if (config.claudeDir.includes("..")) {
    warnings.push(`claudeDir "${config.claudeDir}" contains parent directory references`)
  }

  // Check if opencode directory path looks valid
  if (config.openCodeDir.includes("..")) {
    warnings.push(`openCodeDir "${config.openCodeDir}" contains parent directory references`)
  }

  // Check for empty file prefix
  if (config.filePrefix === "") {
    warnings.push("filePrefix is empty, generated files may conflict with existing files")
  }

  // Check if all loaders are disabled
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
 * Load configuration from environment variables
 * Supports: CROSSTRAIN_ENABLED, CROSSTRAIN_VERBOSE, CROSSTRAIN_WATCH, etc.
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
 * Full configuration resolution including environment variables
 */
export async function loadConfig(
  directory: string,
  options?: CrosstrainConfig
): Promise<ResolvedCrossstrainConfig> {
  // Load env config first (lowest priority among explicit config)
  const envConfig = loadEnvConfig()

  // Merge env config with options (options take precedence)
  const mergedOptions = options ? { ...envConfig, ...options } : envConfig

  // Resolve full config
  return resolveConfig(directory, mergedOptions)
}
