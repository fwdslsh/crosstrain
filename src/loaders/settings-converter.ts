/**
 * Settings Converter
 *
 * Converts Claude Code settings to OpenCode configuration format.
 */

import { join, resolve } from "path"
import { existsSync } from "fs"
import { readFile, writeFile, mkdir } from "fs/promises"
import { homedir } from "os"
import type { ClaudeSettings, ClaudeHooksConfig } from "../types"
import { loadClaudeSettings } from "../utils/settings"
import { readTextFile } from "../utils/parser"

/**
 * OpenCode configuration structure
 */
export interface OpenCodeConfig {
  $schema?: string
  model?: string
  small_model?: string
  theme?: string
  autoupdate?: boolean | "notify"
  share?: "manual" | "auto" | "disabled"
  tools?: Record<string, boolean>
  permission?: {
    edit?: "ask" | "allow" | "deny"
    bash?: "ask" | "allow" | "deny"
    webfetch?: "ask" | "allow" | "deny"
  }
  mcp?: Record<string, {
    type: "local" | "remote"
    command?: string[]
    url?: string
    environment?: Record<string, string>
    enabled?: boolean
  }>
  agent?: Record<string, {
    description?: string
    model?: string
    prompt?: string
    tools?: Record<string, boolean>
  }>
  command?: Record<string, {
    description?: string
    template?: string
    agent?: string
    model?: string
  }>
  instructions?: string[]
  tui?: {
    scroll_speed?: number
    scroll_acceleration?: {
      enabled?: boolean
    }
  }
}

/**
 * Claude Code permission mode to OpenCode permission mapping
 */
const PERMISSION_MODE_TO_OPENCODE: Record<string, OpenCodeConfig["permission"]> = {
  default: {},
  acceptEdits: { edit: "allow" },
  bypassPermissions: { edit: "allow", bash: "allow" },
  plan: { edit: "deny", bash: "deny" },
}

/**
 * Convert Claude Code model name to OpenCode model path
 */
export function convertModelName(claudeModel: string): string {
  // Handle common Claude model patterns
  const modelMappings: Record<string, string> = {
    // Claude 4.x models
    "claude-sonnet-4-5-20250929": "anthropic/claude-sonnet-4-5-20250929",
    "claude-opus-4-5-20250929": "anthropic/claude-opus-4-5-20250929",
    "claude-haiku-4-5-20250929": "anthropic/claude-haiku-4-5-20250929",
    // Shorter aliases
    "sonnet": "anthropic/claude-sonnet-4-20250514",
    "opus": "anthropic/claude-opus-4-20250514",
    "haiku": "anthropic/claude-haiku-4-20250514",
    // Claude 3.x models
    "claude-3-5-sonnet-20241022": "anthropic/claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022": "anthropic/claude-3-5-haiku-20241022",
    "claude-3-opus-20240229": "anthropic/claude-3-opus-20240229",
  }

  // Direct mapping
  if (modelMappings[claudeModel]) {
    return modelMappings[claudeModel]
  }

  // If it already has a provider prefix, return as-is
  if (claudeModel.includes("/")) {
    return claudeModel
  }

  // Default: prepend anthropic/ prefix
  return `anthropic/${claudeModel}`
}

/**
 * Parse Claude Code permission rules into OpenCode format
 */
export function parsePermissionRules(
  claudePermissions: ClaudeSettings["permissions"]
): OpenCodeConfig["permission"] {
  if (!claudePermissions) {
    return {}
  }

  const openCodePermission: OpenCodeConfig["permission"] = {}

  // Handle default mode
  if (claudePermissions.defaultMode) {
    const modePermissions = PERMISSION_MODE_TO_OPENCODE[claudePermissions.defaultMode]
    if (modePermissions) {
      Object.assign(openCodePermission, modePermissions)
    }
  }

  // Process allow rules
  if (claudePermissions.allow) {
    for (const rule of claudePermissions.allow) {
      // Parse rules like "Bash(*)", "Edit(*)", "Read(*)"
      const match = rule.match(/^(Bash|Edit|Read|Write|WebFetch)\(/i)
      if (match) {
        const tool = match[1].toLowerCase()
        if (tool === "bash") {
          openCodePermission.bash = "allow"
        } else if (tool === "edit" || tool === "write") {
          openCodePermission.edit = "allow"
        } else if (tool === "webfetch") {
          openCodePermission.webfetch = "allow"
        }
      }
    }
  }

  // Process deny rules
  if (claudePermissions.deny) {
    for (const rule of claudePermissions.deny) {
      const match = rule.match(/^(Bash|Edit|Read|Write|WebFetch)\(/i)
      if (match) {
        const tool = match[1].toLowerCase()
        if (tool === "bash") {
          openCodePermission.bash = "deny"
        } else if (tool === "edit" || tool === "write") {
          openCodePermission.edit = "deny"
        } else if (tool === "webfetch") {
          openCodePermission.webfetch = "deny"
        }
      }
    }
  }

  // Process ask rules
  if (claudePermissions.ask) {
    for (const rule of claudePermissions.ask) {
      const match = rule.match(/^(Bash|Edit|Read|Write|WebFetch)\(/i)
      if (match) {
        const tool = match[1].toLowerCase()
        if (tool === "bash") {
          openCodePermission.bash = "ask"
        } else if (tool === "edit" || tool === "write") {
          openCodePermission.edit = "ask"
        } else if (tool === "webfetch") {
          openCodePermission.webfetch = "ask"
        }
      }
    }
  }

  return openCodePermission
}

/**
 * Convert Claude Code settings to OpenCode configuration
 */
export function convertClaudeSettingsToOpenCode(
  claudeSettings: ClaudeSettings & {
    permissions?: {
      allow?: string[]
      deny?: string[]
      ask?: string[]
      defaultMode?: string
    }
    model?: string
    env?: Record<string, string>
  }
): OpenCodeConfig {
  const openCodeConfig: OpenCodeConfig = {
    $schema: "https://opencode.ai/config.json",
  }

  // Convert model
  if (claudeSettings.model) {
    openCodeConfig.model = convertModelName(claudeSettings.model)
  }

  // Convert permissions
  if (claudeSettings.permissions) {
    const permission = parsePermissionRules(claudeSettings.permissions)
    if (Object.keys(permission).length > 0) {
      openCodeConfig.permission = permission
    }
  }

  // Note: Many Claude Code settings don't have direct OpenCode equivalents:
  // - hooks: OpenCode uses plugins/events instead
  // - env: Environment variables are handled differently
  // - companyAnnouncements: No equivalent
  // - sandbox: No equivalent

  return openCodeConfig
}

/**
 * Load Claude settings from a specific file path
 */
async function loadSettingsFromFile(filePath: string): Promise<any | null> {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await readTextFile(filePath)
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Discover and load all Claude Code settings
 */
export async function discoverClaudeSettings(
  claudeDir: string,
  loadUserSettings: boolean = true
): Promise<{
  projectSettings: any | null
  projectLocalSettings: any | null
  userSettings: any | null
  userLocalSettings: any | null
  merged: any
}> {
  const homeDir = homedir()
  const userClaudeDir = join(homeDir, ".claude")

  // Load individual settings files
  const projectSettings = await loadSettingsFromFile(join(claudeDir, "settings.json"))
  const projectLocalSettings = await loadSettingsFromFile(join(claudeDir, "settings.local.json"))

  let userSettings = null
  let userLocalSettings = null

  if (loadUserSettings) {
    userSettings = await loadSettingsFromFile(join(userClaudeDir, "settings.json"))
    userLocalSettings = await loadSettingsFromFile(join(userClaudeDir, "settings.local.json"))
  }

  // Merge settings (user → project → local)
  const merged = {
    ...userSettings,
    ...userLocalSettings,
    ...projectSettings,
    ...projectLocalSettings,
    permissions: {
      ...userSettings?.permissions,
      ...userLocalSettings?.permissions,
      ...projectSettings?.permissions,
      ...projectLocalSettings?.permissions,
    },
    hooks: projectLocalSettings?.hooks ?? projectSettings?.hooks ?? userLocalSettings?.hooks ?? userSettings?.hooks,
    enabledPlugins: {
      ...userSettings?.enabledPlugins,
      ...userLocalSettings?.enabledPlugins,
      ...projectSettings?.enabledPlugins,
      ...projectLocalSettings?.enabledPlugins,
    },
    extraKnownMarketplaces: {
      ...userSettings?.extraKnownMarketplaces,
      ...userLocalSettings?.extraKnownMarketplaces,
      ...projectSettings?.extraKnownMarketplaces,
      ...projectLocalSettings?.extraKnownMarketplaces,
    },
    env: {
      ...userSettings?.env,
      ...userLocalSettings?.env,
      ...projectSettings?.env,
      ...projectLocalSettings?.env,
    },
  }

  return {
    projectSettings,
    projectLocalSettings,
    userSettings,
    userLocalSettings,
    merged,
  }
}

/**
 * Load existing OpenCode configuration
 */
export async function loadOpenCodeConfig(openCodeDir: string): Promise<OpenCodeConfig | null> {
  // Check for opencode.json in project root (one level up from .opencode)
  const projectRoot = resolve(openCodeDir, "..")
  const configPath = join(projectRoot, "opencode.json")
  const configPathC = join(projectRoot, "opencode.jsonc")

  let existingPath = null
  if (existsSync(configPath)) {
    existingPath = configPath
  } else if (existsSync(configPathC)) {
    existingPath = configPathC
  }

  if (!existingPath) {
    return null
  }

  try {
    const content = await readTextFile(existingPath)
    // Strip comments from JSONC
    const stripped = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
    return JSON.parse(stripped)
  } catch {
    return null
  }
}

/**
 * Write OpenCode configuration
 */
export async function writeOpenCodeConfig(
  openCodeDir: string,
  config: OpenCodeConfig,
  dryRun: boolean = false
): Promise<string> {
  const projectRoot = resolve(openCodeDir, "..")
  const configPath = join(projectRoot, "opencode.json")

  const content = JSON.stringify(config, null, 2)

  if (!dryRun) {
    await writeFile(configPath, content)
  }

  return configPath
}

/**
 * Merge OpenCode configurations
 */
export function mergeOpenCodeConfigs(
  existing: OpenCodeConfig | null,
  newConfig: OpenCodeConfig
): OpenCodeConfig {
  if (!existing) {
    return newConfig
  }

  return {
    ...existing,
    ...newConfig,
    // Merge nested objects
    permission: {
      ...existing.permission,
      ...newConfig.permission,
    },
    tools: {
      ...existing.tools,
      ...newConfig.tools,
    },
    mcp: {
      ...existing.mcp,
      ...newConfig.mcp,
    },
    agent: {
      ...existing.agent,
      ...newConfig.agent,
    },
    command: {
      ...existing.command,
      ...newConfig.command,
    },
    tui: {
      ...existing.tui,
      ...newConfig.tui,
    },
  }
}

/**
 * Format settings for display
 */
export function formatSettingsForDisplay(settings: any, title: string): string {
  const lines: string[] = []

  lines.push(`\n${title}`)
  lines.push("─".repeat(40))

  if (!settings || Object.keys(settings).length === 0) {
    lines.push("  (empty)")
    return lines.join("\n")
  }

  const formatValue = (value: any, indent: number = 2): string[] => {
    const spaces = " ".repeat(indent)
    const results: string[] = []

    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        for (const item of value) {
          results.push(`${spaces}- ${typeof item === "object" ? JSON.stringify(item) : item}`)
        }
      } else {
        for (const [k, v] of Object.entries(value)) {
          if (typeof v === "object" && v !== null) {
            results.push(`${spaces}${k}:`)
            results.push(...formatValue(v, indent + 2))
          } else {
            results.push(`${spaces}${k}: ${v}`)
          }
        }
      }
    } else {
      results.push(`${spaces}${value}`)
    }

    return results
  }

  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && value !== null &&
        !(typeof value === "object" && Object.keys(value).length === 0)) {
      lines.push(`  ${key}:`)
      lines.push(...formatValue(value, 4))
    }
  }

  return lines.join("\n")
}
