/**
 * Crosstrainer Configuration Loader
 *
 * Loads and processes crosstrainer.{json,jsonc,js,ts} files from plugin directories.
 * These files allow plugin authors to customize the conversion process.
 *
 * Supported files (in order of precedence):
 * - crosstrainer.js  - Full control with JavaScript hooks
 * - crosstrainer.ts  - Full control with TypeScript hooks (requires bun)
 * - crosstrainer.json - Simple declarative configuration
 * - crosstrainer.jsonc - JSON with comments
 *
 * Only one crosstrainer file is allowed per plugin.
 */

import { join, resolve } from "path"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import type {
  ClaudeSkill,
  ClaudeAgent,
  ClaudeCommand,
  ClaudeMCPServer,
  OpenCodeAgentFrontmatter,
} from "../types"

// ========================================
// Types
// ========================================

/**
 * Permission mapping configuration
 */
export interface PermissionMappingConfig {
  /**
   * Map Claude Code permission modes to OpenCode permission objects
   */
  modes?: Record<string, Record<string, "ask" | "allow" | "deny">>

  /**
   * Map individual permission rules
   */
  rules?: {
    allow?: Record<string, string>
    deny?: Record<string, string>
    ask?: Record<string, string>
  }
}

/**
 * Model mapping configuration
 */
export interface ModelMappingConfig {
  /**
   * Map Claude Code model aliases to OpenCode model paths
   */
  [alias: string]: string
}

/**
 * Tool mapping configuration
 */
export interface ToolMappingConfig {
  /**
   * Map Claude Code tool names to OpenCode tool names
   */
  [claudeTool: string]: string
}

/**
 * Asset filter configuration
 */
export interface AssetFilterConfig {
  /**
   * Assets to include (if specified, only these are included)
   */
  include?: string[]

  /**
   * Assets to exclude
   */
  exclude?: string[]
}

/**
 * Skill-specific configuration
 */
export interface SkillConfig extends AssetFilterConfig {
  /**
   * Custom tool name generator
   */
  toolNameTemplate?: string
}

/**
 * Agent-specific configuration
 */
export interface AgentConfig extends AssetFilterConfig {
  /**
   * Default model for agents without explicit model
   */
  defaultModel?: string

  /**
   * Default permission mode
   */
  defaultPermissionMode?: string
}

/**
 * Command-specific configuration
 */
export interface CommandConfig extends AssetFilterConfig {
  /**
   * Default agent for commands
   */
  defaultAgent?: string
}

/**
 * MCP-specific configuration
 */
export interface MCPConfig extends AssetFilterConfig {
  /**
   * Whether to enable servers by default
   */
  enableByDefault?: boolean
}

/**
 * Conversion context passed to transform hooks
 */
export interface ConversionContext {
  /**
   * Plugin name
   */
  pluginName: string

  /**
   * Plugin source directory
   */
  pluginDir: string

  /**
   * Output directory
   */
  outputDir: string

  /**
   * File prefix for generated files
   */
  prefix: string

  /**
   * Whether this is a dry run
   */
  dryRun: boolean

  /**
   * Verbose mode
   */
  verbose: boolean

  /**
   * The loaded crosstrainer config
   */
  config: CrosstrainerConfig
}

/**
 * Transform hook for agents
 */
export type AgentTransformHook = (
  agent: ClaudeAgent,
  context: ConversionContext
) => ClaudeAgent | null | Promise<ClaudeAgent | null>

/**
 * Transform hook for commands
 */
export type CommandTransformHook = (
  command: ClaudeCommand,
  context: ConversionContext
) => ClaudeCommand | null | Promise<ClaudeCommand | null>

/**
 * Transform hook for skills
 */
export type SkillTransformHook = (
  skill: ClaudeSkill,
  context: ConversionContext
) => ClaudeSkill | null | Promise<ClaudeSkill | null>

/**
 * Transform hook for MCP servers
 */
export type MCPTransformHook = (
  name: string,
  server: ClaudeMCPServer,
  context: ConversionContext
) => { name: string; server: ClaudeMCPServer } | null | Promise<{ name: string; server: ClaudeMCPServer } | null>

/**
 * Custom skill tool generator
 */
export type SkillToolGenerator = (
  skill: ClaudeSkill,
  context: ConversionContext
) => string | Promise<string>

/**
 * Custom agent generator
 */
export type AgentGenerator = (
  agent: ClaudeAgent,
  context: ConversionContext
) => { frontmatter: OpenCodeAgentFrontmatter; content: string } | Promise<{ frontmatter: OpenCodeAgentFrontmatter; content: string }>

/**
 * Post-conversion hook
 */
export type PostConversionHook = (
  context: ConversionContext,
  results: {
    agents: string[]
    commands: string[]
    skills: string[]
    mcp: string[]
  }
) => void | Promise<void>

/**
 * Crosstrainer configuration (JSON format)
 */
export interface CrosstrainerJsonConfig {
  /**
   * Plugin name override
   */
  name?: string

  /**
   * Description override
   */
  description?: string

  /**
   * Custom file prefix for generated assets
   */
  prefix?: string

  /**
   * Permission mappings
   */
  permissions?: PermissionMappingConfig

  /**
   * Model mappings
   */
  models?: ModelMappingConfig

  /**
   * Tool mappings
   */
  tools?: ToolMappingConfig

  /**
   * Skill configuration
   */
  skills?: SkillConfig

  /**
   * Agent configuration
   */
  agents?: AgentConfig

  /**
   * Command configuration
   */
  commands?: CommandConfig

  /**
   * MCP configuration
   */
  mcp?: MCPConfig

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>
}

/**
 * Crosstrainer configuration (JS/TS format with hooks)
 */
export interface CrosstrainerJsConfig extends CrosstrainerJsonConfig {
  /**
   * Transform agent before conversion
   * Return null to skip the agent
   */
  transformAgent?: AgentTransformHook

  /**
   * Transform command before conversion
   * Return null to skip the command
   */
  transformCommand?: CommandTransformHook

  /**
   * Transform skill before conversion
   * Return null to skip the skill
   */
  transformSkill?: SkillTransformHook

  /**
   * Transform MCP server before conversion
   * Return null to skip the server
   */
  transformMCP?: MCPTransformHook

  /**
   * Custom skill tool code generator
   */
  generateSkillTool?: SkillToolGenerator

  /**
   * Custom agent generator
   */
  generateAgent?: AgentGenerator

  /**
   * Hook called after all conversions complete
   */
  onConversionComplete?: PostConversionHook
}

/**
 * Union type for all config formats
 */
export type CrosstrainerConfig = CrosstrainerJsConfig

/**
 * Loaded crosstrainer config with metadata
 */
export interface LoadedCrosstrainerConfig {
  /**
   * The loaded configuration
   */
  config: CrosstrainerConfig

  /**
   * Path to the config file
   */
  filePath: string

  /**
   * Config file type
   */
  fileType: "json" | "jsonc" | "js" | "ts"
}

// ========================================
// Config File Discovery
// ========================================

/**
 * Supported crosstrainer file names in order of precedence
 */
const CROSSTRAINER_FILES = [
  "crosstrainer.js",
  "crosstrainer.ts",
  "crosstrainer.json",
  "crosstrainer.jsonc",
] as const

type CrosstrainerFileName = typeof CROSSTRAINER_FILES[number]

/**
 * Find crosstrainer config file in a directory
 */
export function findCrosstrainerConfig(pluginDir: string): {
  path: string
  type: "json" | "jsonc" | "js" | "ts"
} | null {
  const found: string[] = []

  for (const fileName of CROSSTRAINER_FILES) {
    const filePath = join(pluginDir, fileName)
    if (existsSync(filePath)) {
      found.push(fileName)
    }
  }

  // Check for multiple config files
  if (found.length > 1) {
    throw new Error(
      `Multiple crosstrainer config files found in ${pluginDir}: ${found.join(", ")}. ` +
      `Only one crosstrainer file is allowed per plugin.`
    )
  }

  if (found.length === 0) {
    return null
  }

  const fileName = found[0]
  const filePath = join(pluginDir, fileName)

  // Determine file type
  let type: "json" | "jsonc" | "js" | "ts"
  if (fileName.endsWith(".json")) {
    type = "json"
  } else if (fileName.endsWith(".jsonc")) {
    type = "jsonc"
  } else if (fileName.endsWith(".js")) {
    type = "js"
  } else {
    type = "ts"
  }

  return { path: filePath, type }
}

// ========================================
// Config Loading
// ========================================

/**
 * Load JSON/JSONC config file
 */
async function loadJsonConfig(filePath: string, isJsonc: boolean): Promise<CrosstrainerJsonConfig> {
  const content = await readFile(filePath, "utf-8")

  // Strip comments from JSONC
  let jsonContent = content
  if (isJsonc) {
    // Remove single-line comments
    jsonContent = jsonContent.replace(/\/\/.*$/gm, "")
    // Remove multi-line comments
    jsonContent = jsonContent.replace(/\/\*[\s\S]*?\*\//g, "")
  }

  try {
    return JSON.parse(jsonContent) as CrosstrainerJsonConfig
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${(err as Error).message}`)
  }
}

/**
 * Load JS/TS config file
 */
async function loadJsConfig(filePath: string): Promise<CrosstrainerJsConfig> {
  try {
    // Use dynamic import for both JS and TS files
    // Bun handles TS files natively
    const absolutePath = resolve(filePath)

    // Clear require cache if it exists (for reloading)
    try {
      delete require.cache[absolutePath]
    } catch {
      // Ignore if not in require cache
    }

    // Dynamic import
    const module = await import(absolutePath)

    // Support both default export and named export
    const config = module.default || module.config || module

    if (typeof config !== "object" || config === null) {
      throw new Error(`Expected config to be an object, got ${typeof config}`)
    }

    return config as CrosstrainerJsConfig
  } catch (err) {
    throw new Error(`Failed to load ${filePath}: ${(err as Error).message}`)
  }
}

/**
 * Load crosstrainer config from a plugin directory
 */
export async function loadCrosstrainerConfig(
  pluginDir: string
): Promise<LoadedCrosstrainerConfig | null> {
  const found = findCrosstrainerConfig(pluginDir)

  if (!found) {
    return null
  }

  const { path: filePath, type } = found

  let config: CrosstrainerConfig

  switch (type) {
    case "json":
      config = await loadJsonConfig(filePath, false)
      break
    case "jsonc":
      config = await loadJsonConfig(filePath, true)
      break
    case "js":
    case "ts":
      config = await loadJsConfig(filePath)
      break
  }

  return {
    config,
    filePath,
    fileType: type,
  }
}

// ========================================
// Config Application Helpers
// ========================================

/**
 * Check if an asset should be included based on filter config
 */
export function shouldIncludeAsset(
  assetName: string,
  filterConfig?: AssetFilterConfig
): boolean {
  if (!filterConfig) {
    return true
  }

  // If include list is specified, only include those
  if (filterConfig.include && filterConfig.include.length > 0) {
    return filterConfig.include.includes(assetName)
  }

  // Check exclude list
  if (filterConfig.exclude && filterConfig.exclude.length > 0) {
    return !filterConfig.exclude.includes(assetName)
  }

  return true
}

/**
 * Apply model mapping from config
 */
export function applyModelMapping(
  model: string | undefined,
  modelConfig?: ModelMappingConfig
): string | undefined {
  if (!model) {
    return undefined
  }

  if (modelConfig && modelConfig[model]) {
    return modelConfig[model]
  }

  return model
}

/**
 * Apply permission mode mapping from config
 */
export function applyPermissionModeMapping(
  mode: string | undefined,
  permConfig?: PermissionMappingConfig
): Record<string, "ask" | "allow" | "deny"> | undefined {
  if (!mode) {
    return undefined
  }

  if (permConfig?.modes && permConfig.modes[mode]) {
    return permConfig.modes[mode]
  }

  return undefined
}

/**
 * Apply tool name mapping from config
 */
export function applyToolMapping(
  tools: string[] | undefined,
  toolConfig?: ToolMappingConfig
): string[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined
  }

  if (!toolConfig) {
    return tools
  }

  return tools.map(tool => toolConfig[tool] || tool)
}

/**
 * Generate custom prefix from config
 */
export function getEffectivePrefix(
  defaultPrefix: string,
  crosstrainerConfig?: CrosstrainerConfig
): string {
  if (crosstrainerConfig?.prefix) {
    return crosstrainerConfig.prefix
  }
  return defaultPrefix
}

/**
 * Get effective plugin name from config
 */
export function getEffectivePluginName(
  defaultName: string,
  crosstrainerConfig?: CrosstrainerConfig
): string {
  if (crosstrainerConfig?.name) {
    return crosstrainerConfig.name
  }
  return defaultName
}

// ========================================
// Default Config
// ========================================

/**
 * Create a default crosstrainer config
 */
export function createDefaultConfig(): CrosstrainerConfig {
  return {
    // No overrides - use CLI defaults
  }
}

/**
 * Merge crosstrainer config with defaults
 */
export function mergeWithDefaults(
  config: CrosstrainerConfig | null | undefined
): CrosstrainerConfig {
  if (!config) {
    return createDefaultConfig()
  }

  return {
    ...createDefaultConfig(),
    ...config,
  }
}
