/**
 * File Watcher - Monitors Claude Code directories for changes
 *
 * Uses Node's native fs.watch for file watching. When Claude Code
 * assets change, triggers callbacks to resync with OpenCode.
 */

import { watch, type FSWatcher } from "fs"
import { join } from "path"
import { existsSync } from "fs"

export interface WatcherConfig {
  claudeDir: string
  homeDir: string
  onSkillChange?: () => Promise<void>
  onAgentChange?: () => Promise<void>
  onCommandChange?: () => Promise<void>
  onHookChange?: () => Promise<void>
  onMCPChange?: () => Promise<void>
}

export interface WatcherInstance {
  close: () => Promise<void>
}

/**
 * Debounce helper to prevent rapid-fire callbacks
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Watch a directory for changes
 */
function watchDirectory(
  dirPath: string,
  callback: (event: string, filename: string | null) => void
): FSWatcher | null {
  if (!existsSync(dirPath)) {
    return null
  }

  try {
    return watch(dirPath, { recursive: true }, (event, filename) => {
      callback(event, filename)
    })
  } catch (error) {
    console.error(`[crosstrain] Error watching ${dirPath}:`, error)
    return null
  }
}

/**
 * Watch a single file for changes
 */
function watchFile(
  filePath: string,
  callback: (event: string) => void
): FSWatcher | null {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    return watch(filePath, (event) => {
      callback(event)
    })
  } catch (error) {
    console.error(`[crosstrain] Error watching ${filePath}:`, error)
    return null
  }
}

/**
 * Create a file watcher for Claude Code assets
 */
export function createWatcher(config: WatcherConfig): WatcherInstance {
  const watchers: FSWatcher[] = []
  const debounceMs = 500 // Debounce changes to avoid rapid reloads

  // Watch skills directories
  if (config.onSkillChange) {
    const debouncedCallback = debounce(config.onSkillChange, debounceMs)

    const projectSkillsPath = join(config.claudeDir, "skills")
    const projectWatcher = watchDirectory(projectSkillsPath, (event, filename) => {
      console.log(`[crosstrain] Skill ${event}: ${filename}`)
      debouncedCallback()
    })
    if (projectWatcher) watchers.push(projectWatcher)

    const userSkillsPath = join(config.homeDir, ".claude", "skills")
    const userWatcher = watchDirectory(userSkillsPath, (event, filename) => {
      console.log(`[crosstrain] Skill ${event}: ${filename}`)
      debouncedCallback()
    })
    if (userWatcher) watchers.push(userWatcher)
  }

  // Watch agents directories
  if (config.onAgentChange) {
    const debouncedCallback = debounce(config.onAgentChange, debounceMs)

    const projectAgentsPath = join(config.claudeDir, "agents")
    const projectWatcher = watchDirectory(projectAgentsPath, (event, filename) => {
      console.log(`[crosstrain] Agent ${event}: ${filename}`)
      debouncedCallback()
    })
    if (projectWatcher) watchers.push(projectWatcher)

    const userAgentsPath = join(config.homeDir, ".claude", "agents")
    const userWatcher = watchDirectory(userAgentsPath, (event, filename) => {
      console.log(`[crosstrain] Agent ${event}: ${filename}`)
      debouncedCallback()
    })
    if (userWatcher) watchers.push(userWatcher)
  }

  // Watch commands directories
  if (config.onCommandChange) {
    const debouncedCallback = debounce(config.onCommandChange, debounceMs)

    const projectCommandsPath = join(config.claudeDir, "commands")
    const projectWatcher = watchDirectory(projectCommandsPath, (event, filename) => {
      console.log(`[crosstrain] Command ${event}: ${filename}`)
      debouncedCallback()
    })
    if (projectWatcher) watchers.push(projectWatcher)

    const userCommandsPath = join(config.homeDir, ".claude", "commands")
    const userWatcher = watchDirectory(userCommandsPath, (event, filename) => {
      console.log(`[crosstrain] Command ${event}: ${filename}`)
      debouncedCallback()
    })
    if (userWatcher) watchers.push(userWatcher)
  }

  // Watch settings.json for hooks
  if (config.onHookChange) {
    const debouncedCallback = debounce(config.onHookChange, debounceMs)

    const projectSettingsPath = join(config.claudeDir, "settings.json")
    const projectWatcher = watchFile(projectSettingsPath, (event) => {
      console.log(`[crosstrain] Settings ${event}`)
      debouncedCallback()
    })
    if (projectWatcher) watchers.push(projectWatcher)

    const userSettingsPath = join(config.homeDir, ".claude", "settings.json")
    const userWatcher = watchFile(userSettingsPath, (event) => {
      console.log(`[crosstrain] Settings ${event}`)
      debouncedCallback()
    })
    if (userWatcher) watchers.push(userWatcher)
  }

  // Watch .mcp.json files for MCP server configuration
  if (config.onMCPChange) {
    const debouncedCallback = debounce(config.onMCPChange, debounceMs)

    // Watch project-level .mcp.json (in project root)
    const projectRoot = join(config.claudeDir, "..")
    const projectMcpPath = join(projectRoot, ".mcp.json")
    const projectWatcher = watchFile(projectMcpPath, (event) => {
      console.log(`[crosstrain] MCP config ${event}`)
      debouncedCallback()
    })
    if (projectWatcher) watchers.push(projectWatcher)

    // Watch user-level .mcp.json
    const userMcpPath = join(config.homeDir, ".claude", ".mcp.json")
    const userWatcher = watchFile(userMcpPath, (event) => {
      console.log(`[crosstrain] User MCP config ${event}`)
      debouncedCallback()
    })
    if (userWatcher) watchers.push(userWatcher)

    // Also watch ~/.mcp.json
    const homeRootMcpPath = join(config.homeDir, ".mcp.json")
    const homeRootWatcher = watchFile(homeRootMcpPath, (event) => {
      console.log(`[crosstrain] Home MCP config ${event}`)
      debouncedCallback()
    })
    if (homeRootWatcher) watchers.push(homeRootWatcher)

    // Watch plugins directory for plugin MCP configs
    const pluginsDir = join(config.claudeDir, "plugins")
    const pluginsWatcher = watchDirectory(pluginsDir, (event, filename) => {
      if (filename && filename.endsWith(".mcp.json")) {
        console.log(`[crosstrain] Plugin MCP config ${event}: ${filename}`)
        debouncedCallback()
      }
    })
    if (pluginsWatcher) watchers.push(pluginsWatcher)
  }

  return {
    close: async () => {
      for (const watcher of watchers) {
        watcher.close()
      }
      console.log("[crosstrain] File watchers closed")
    },
  }
}

/**
 * Check if any Claude Code directories exist
 */
export function hasClaudeCodeAssets(
  claudeDir: string,
  homeDir: string
): boolean {
  const projectRoot = join(claudeDir, "..")
  const paths = [
    join(claudeDir, "skills"),
    join(claudeDir, "agents"),
    join(claudeDir, "commands"),
    join(claudeDir, "settings.json"),
    join(claudeDir, "plugins"),
    join(projectRoot, ".mcp.json"),
    join(homeDir, ".claude", "skills"),
    join(homeDir, ".claude", "agents"),
    join(homeDir, ".claude", "commands"),
    join(homeDir, ".claude", "settings.json"),
    join(homeDir, ".claude", ".mcp.json"),
    join(homeDir, ".mcp.json"),
  ]

  return paths.some(existsSync)
}

/**
 * Get summary of available Claude Code assets
 */
export async function getAssetSummary(
  claudeDir: string,
  homeDir: string
): Promise<{
  hasSkills: boolean
  hasAgents: boolean
  hasCommands: boolean
  hasHooks: boolean
  hasMCP: boolean
}> {
  const projectRoot = join(claudeDir, "..")
  return {
    hasSkills:
      existsSync(join(claudeDir, "skills")) ||
      existsSync(join(homeDir, ".claude", "skills")),
    hasAgents:
      existsSync(join(claudeDir, "agents")) ||
      existsSync(join(homeDir, ".claude", "agents")),
    hasCommands:
      existsSync(join(claudeDir, "commands")) ||
      existsSync(join(homeDir, ".claude", "commands")),
    hasHooks:
      existsSync(join(claudeDir, "settings.json")) ||
      existsSync(join(homeDir, ".claude", "settings.json")),
    hasMCP:
      existsSync(join(projectRoot, ".mcp.json")) ||
      existsSync(join(claudeDir, "plugins")) ||
      existsSync(join(homeDir, ".claude", ".mcp.json")) ||
      existsSync(join(homeDir, ".mcp.json")),
  }
}
