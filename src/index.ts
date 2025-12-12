/**
 * Crosstrain - OpenCode Plugin for Loading Claude Code Extensions
 *
 * This plugin bridges Claude Code's extension ecosystem to OpenCode by:
 * - Converting Claude Skills to OpenCode Custom Tools
 * - Converting Claude Agents (Subagents) to OpenCode Agents
 * - Converting Claude Commands to OpenCode Commands
 * - Converting Claude Hooks to OpenCode Plugin Event Handlers
 *
 * Assets are loaded automatically when OpenCode starts and watched for
 * changes to provide dynamic updates during a session.
 *
 * Configuration can be provided via:
 * - Plugin options passed directly
 * - opencode.json (under plugins.crosstrain, plugin.crosstrain, or crosstrain)
 * - .crosstrainrc.json or crosstrain.config.json
 * - Environment variables (CROSSTRAIN_*)
 */

import { join } from "path"
import { homedir } from "os"

// Import types and tool from local fallback
import type { Plugin, ToolDefinition } from "./plugin-types"
import { tool, toolSchema } from "./plugin-types"
import { mkdir } from "fs/promises"

// Import configuration
import type { CrosstrainConfig, ResolvedCrossstrainConfig } from "./types"
import {
  loadConfig,
  validateConfig,
  createLogger,
  getResolvedPaths,
  type ConfigLogger,
} from "./utils/config"

// Import loaders
import { createToolsFromSkills } from "./loaders/skills"
import { syncAgentsToOpenCode, discoverAgents } from "./loaders/agents"
import { syncCommandsToOpenCode, discoverCommands } from "./loaders/commands"
import { buildHookHandlers } from "./loaders/hooks"

// Import utilities
import {
  createWatcher,
  hasClaudeCodeAssets,
  getAssetSummary,
  type WatcherInstance,
} from "./utils/watcher"

// Re-export types and utilities for potential external use
export * from "./types"
export * from "./utils/parser"
export * from "./utils/config"

/**
 * State management for dynamic reloading
 */
interface PluginState {
  watcher: WatcherInstance | null
  tools: Record<string, ToolDefinition>
  hookHandlers: {
    toolExecuteBefore?: (input: any, output: any) => Promise<void>
    toolExecuteAfter?: (input: any, output: any) => Promise<void>
    event?: (params: { event: any }) => Promise<void>
  }
  config: ResolvedCrossstrainConfig
  logger: ConfigLogger
}

/**
 * Plugin context with optional crosstrain configuration
 */
interface PluginContext {
  project?: { path?: string }
  directory: string
  worktree?: string
  client?: unknown
  $?: unknown
  /** Crosstrain plugin configuration */
  crosstrain?: CrosstrainConfig
}

/**
 * Create the crosstrain plugin with optional configuration
 */
export function createCrossstrainPlugin(options?: CrosstrainConfig): Plugin {
  return async (ctx: PluginContext) => {
    return CrosstrainPlugin({ ...ctx, crosstrain: options })
  }
}

/**
 * Main plugin export
 */
export const CrosstrainPlugin: Plugin = async (ctx: PluginContext) => {
  const {
    directory,
    crosstrain: pluginOptions,
  } = ctx

  // Load and resolve configuration
  const config = await loadConfig(directory, pluginOptions)
  const logger = createLogger(config)

  // Check if plugin is enabled
  if (!config.enabled) {
    logger.info("Plugin is disabled via configuration")
    return {}
  }

  // Validate configuration
  const warnings = validateConfig(config)
  for (const warning of warnings) {
    logger.warn(`Config warning: ${warning}`)
  }

  logger.info("Initializing Claude Code extension loader...")
  logger.log("Configuration:", config)

  // Resolve paths
  const { claudeDir, openCodeDir } = getResolvedPaths(directory, config)
  const homeDir = config.loadUserAssets ? homedir() : ""

  // Check if there are any Claude Code assets to load
  const hasAssets = config.loadUserAssets
    ? hasClaudeCodeAssets(claudeDir, homeDir)
    : hasClaudeCodeAssets(claudeDir, "")

  if (!hasAssets) {
    logger.info("No Claude Code assets found, plugin will remain idle")
    return {}
  }

  // Initialize plugin state
  const state: PluginState = {
    watcher: null,
    tools: {},
    hookHandlers: {},
    config,
    logger,
  }

  // Ensure OpenCode directories exist
  await mkdir(join(openCodeDir, "agent"), { recursive: true })
  await mkdir(join(openCodeDir, "command"), { recursive: true })
  await mkdir(join(openCodeDir, "tool"), { recursive: true })

  // Get summary of available assets
  const summary = await getAssetSummary(claudeDir, homeDir)
  logger.info("Asset summary:", summary)

  // Loader options
  const loaderOptions = {
    filePrefix: config.filePrefix,
    verbose: config.verbose,
  }

  // Load skills as tools
  if (config.loaders.skills && summary.hasSkills) {
    try {
      state.tools = await createToolsFromSkills(claudeDir, homeDir)
      logger.info(`Loaded ${Object.keys(state.tools).length} skills as tools`)
    } catch (error) {
      logger.error("Error loading skills:", error)
    }
  }

  // Sync agents to OpenCode format
  if (config.loaders.agents && summary.hasAgents) {
    try {
      const agents = await syncAgentsToOpenCode(
        claudeDir,
        homeDir,
        openCodeDir,
        loaderOptions
      )
      logger.info(`Synced ${agents.length} agents to OpenCode`)
    } catch (error) {
      logger.error("Error syncing agents:", error)
    }
  }

  // Sync commands to OpenCode format
  if (config.loaders.commands && summary.hasCommands) {
    try {
      const commands = await syncCommandsToOpenCode(
        claudeDir,
        homeDir,
        openCodeDir,
        loaderOptions
      )
      logger.info(`Synced ${commands.length} commands to OpenCode`)
    } catch (error) {
      logger.error("Error syncing commands:", error)
    }
  }

  // Build hook handlers
  if (config.loaders.hooks && summary.hasHooks) {
    try {
      state.hookHandlers = await buildHookHandlers(claudeDir, homeDir)
      logger.info("Built hook handlers from Claude settings")
    } catch (error) {
      logger.error("Error building hook handlers:", error)
    }
  }

  // Set up file watcher for dynamic updates (if enabled)
  if (config.watch) {
    state.watcher = createWatcher({
      claudeDir,
      homeDir: config.loadUserAssets ? homeDir : "",
      onSkillChange: config.loaders.skills
        ? async () => {
            logger.info("Skills changed, reloading...")
            try {
              state.tools = await createToolsFromSkills(claudeDir, homeDir)
              logger.info(`Reloaded ${Object.keys(state.tools).length} skills`)
            } catch (error) {
              logger.error("Error reloading skills:", error)
            }
          }
        : undefined,
      onAgentChange: config.loaders.agents
        ? async () => {
            logger.info("Agents changed, resyncing...")
            try {
              const agents = await syncAgentsToOpenCode(
                claudeDir,
                homeDir,
                openCodeDir,
                loaderOptions
              )
              logger.info(`Resynced ${agents.length} agents`)
            } catch (error) {
              logger.error("Error resyncing agents:", error)
            }
          }
        : undefined,
      onCommandChange: config.loaders.commands
        ? async () => {
            logger.info("Commands changed, resyncing...")
            try {
              const commands = await syncCommandsToOpenCode(
                claudeDir,
                homeDir,
                openCodeDir,
                loaderOptions
              )
              logger.info(`Resynced ${commands.length} commands`)
            } catch (error) {
              logger.error("Error resyncing commands:", error)
            }
          }
        : undefined,
      onHookChange: config.loaders.hooks
        ? async () => {
            logger.info("Hooks changed, rebuilding handlers...")
            try {
              state.hookHandlers = await buildHookHandlers(claudeDir, homeDir)
              logger.info("Rebuilt hook handlers")
            } catch (error) {
              logger.error("Error rebuilding hook handlers:", error)
            }
          }
        : undefined,
    })
    logger.log("File watcher initialized")
  }

  logger.info("Plugin initialized successfully")

  // Return the plugin interface
  return {
    // Expose tools converted from skills
    tool: Object.keys(state.tools).length > 0 ? state.tools : undefined,

    // Tool execution hooks (from Claude hooks)
    "tool.execute.before": state.hookHandlers.toolExecuteBefore
      ? async (input, output) => {
          if (state.hookHandlers.toolExecuteBefore) {
            await state.hookHandlers.toolExecuteBefore(input, output)
          }
        }
      : undefined,

    "tool.execute.after": state.hookHandlers.toolExecuteAfter
      ? async (input, output) => {
          if (state.hookHandlers.toolExecuteAfter) {
            await state.hookHandlers.toolExecuteAfter(input, output)
          }
        }
      : undefined,

    // Event handler (for session and notification hooks)
    event: state.hookHandlers.event
      ? async ({ event }) => {
          if (state.hookHandlers.event) {
            await state.hookHandlers.event({ event })
          }
        }
      : undefined,
  }
}

/**
 * Utility tool that provides information about loaded Claude Code assets
 */
export const crosstrainInfoTool = tool({
  description:
    "Get information about Claude Code assets loaded by the crosstrain plugin. Use to see what skills, agents, commands, and hooks are available from Claude Code.",
  args: {},
  async execute(args, ctx) {
    const homeDir = homedir()
    const claudeDir = join(process.cwd(), ".claude")
    const summary = await getAssetSummary(claudeDir, homeDir)

    let info = "# Crosstrain Plugin Status\n\n"
    info += "## Loaded Claude Code Assets\n\n"

    if (summary.hasSkills) {
      info += "- **Skills**: ✅ Loaded as custom tools\n"
    } else {
      info += "- **Skills**: ❌ Not found\n"
    }

    if (summary.hasAgents) {
      info += "- **Agents**: ✅ Synced to .opencode/agent/\n"
    } else {
      info += "- **Agents**: ❌ Not found\n"
    }

    if (summary.hasCommands) {
      info += "- **Commands**: ✅ Synced to .opencode/command/\n"
    } else {
      info += "- **Commands**: ❌ Not found\n"
    }

    if (summary.hasHooks) {
      info += "- **Hooks**: ✅ Loaded as event handlers\n"
    } else {
      info += "- **Hooks**: ❌ Not found\n"
    }

    info += "\n## Source Locations\n\n"
    info += `- Project: ${claudeDir}\n`
    info += `- User: ${join(homeDir, ".claude")}\n`

    return info
  },
})

// Default export for easier importing
export default CrosstrainPlugin
