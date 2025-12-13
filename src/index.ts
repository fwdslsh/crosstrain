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
 * Configuration is loaded from (in order of priority):
 * 1. Direct plugin options (highest)
 * 2. Environment variables (CROSSTRAIN_*)
 * 3. .opencode/plugin/crosstrain/settings.json
 * 4. Default values (lowest)
 *
 * Marketplace and plugin settings are also read from Claude Code's
 * .claude/settings.json files.
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
import {
  getAllMCPServers,
  syncMCPToOpenCode,
  getMCPSummary,
} from "./loaders/mcp"
import type { DiscoveredMCPServer } from "./types"
import {
  listAvailablePlugins,
  findPlugin,
  clearGitMarketplaceCache,
  getGitCacheDirectory,
} from "./loaders/marketplace"
import {
  installConfiguredPlugins,
  installPlugin,
  uninstallPlugin,
  listInstalledPlugins,
  getPluginInstallStatus,
  resolveInstallDir,
} from "./loaders/plugin-installer"

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
export * from "./utils/settings"

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
  mcpServers: DiscoveredMCPServer[]
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
    mcpServers: [],
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

  // Load and sync MCP servers
  if (config.loaders.mcp && summary.hasMCP) {
    try {
      const mcpOptions = {
        filePrefix: config.filePrefix,
        verbose: config.verbose,
        enableByDefault: true,
      }
      const { discovered, converted } = await getAllMCPServers(
        claudeDir,
        homeDir,
        mcpOptions
      )
      state.mcpServers = discovered

      if (discovered.length > 0) {
        // Sync to opencode.json
        const { serverCount, configPath } = await syncMCPToOpenCode(
          claudeDir,
          homeDir,
          openCodeDir,
          mcpOptions
        )
        logger.info(`Synced ${serverCount} MCP servers to ${configPath}`)
      }
    } catch (error) {
      logger.error("Error loading MCP servers:", error)
    }
  }

  // Install configured plugins from marketplaces
  if (config.marketplaces.length > 0 && config.plugins.length > 0) {
    try {
      logger.info("Installing configured plugins from marketplaces...")
      const installResults = await installConfiguredPlugins(
        config.plugins,
        config.marketplaces,
        directory,
        { verbose: config.verbose }
      )

      if (installResults.installed.length > 0) {
        logger.info(`Installed plugins: ${installResults.installed.join(", ")}`)
      }
      if (installResults.skipped.length > 0) {
        logger.log(`Skipped plugins: ${installResults.skipped.join(", ")}`)
      }
      if (installResults.failed.length > 0) {
        logger.warn(`Failed to install plugins:`)
        installResults.failed.forEach(({ plugin, reason }) => {
          logger.warn(`  - ${plugin}: ${reason}`)
        })
      }
    } catch (error) {
      logger.error("Error installing plugins:", error)
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
      onMCPChange: config.loaders.mcp
        ? async () => {
            logger.info("MCP configuration changed, resyncing...")
            try {
              const mcpOptions = {
                filePrefix: config.filePrefix,
                verbose: config.verbose,
                enableByDefault: true,
              }
              const { discovered } = await getAllMCPServers(
                claudeDir,
                homeDir,
                mcpOptions
              )
              state.mcpServers = discovered

              if (discovered.length > 0) {
                const { serverCount, configPath } = await syncMCPToOpenCode(
                  claudeDir,
                  homeDir,
                  openCodeDir,
                  mcpOptions
                )
                logger.info(`Resynced ${serverCount} MCP servers to ${configPath}`)
              }
            } catch (error) {
              logger.error("Error resyncing MCP servers:", error)
            }
          }
        : undefined,
    })
    logger.log("File watcher initialized")
  }

  logger.info("Plugin initialized successfully")

  // Create plugin management tools
  const pluginManagementTools: Record<string, ToolDefinition> = {
    crosstrain_list_marketplaces: tool({
      description: "List all configured Claude Code marketplaces and their available plugins",
      args: {},
      async execute() {
        const marketplaces = config.marketplaces
        
        if (marketplaces.length === 0) {
          return "No marketplaces configured. Add marketplaces in your crosstrain configuration."
        }

        const pluginsByMarketplace = await listAvailablePlugins(marketplaces, directory, config.verbose)
        
        let output = "# Configured Claude Code Marketplaces\n\n"
        
        for (const marketplace of marketplaces) {
          const plugins = pluginsByMarketplace.get(marketplace.name) || []
          const status = marketplace.enabled === false ? "❌ Disabled" : "✅ Enabled"
          
          output += `## ${marketplace.name} ${status}\n`
          output += `**Source:** ${marketplace.source}\n\n`
          
          if (plugins.length === 0) {
            output += "_No plugins found_\n\n"
          } else {
            output += "### Available Plugins:\n\n"
            for (const plugin of plugins) {
              output += `- **${plugin.manifest.name}** - ${plugin.manifest.description || "No description"}\n`
              output += `  - Version: ${plugin.manifest.version || "N/A"}\n`
              const components = []
              if (plugin.hasSkills) components.push("Skills")
              if (plugin.hasAgents) components.push("Agents")
              if (plugin.hasCommands) components.push("Commands")
              if (plugin.hasHooks) components.push("Hooks")
              if (plugin.hasMCP) components.push("MCP")
              output += `  - Components: ${components.join(", ") || "None"}\n`
            }
            output += "\n"
          }
        }
        
        return output
      },
    }),

    crosstrain_list_installed: tool({
      description: "List all installed Claude Code plugins and their installation status",
      args: {},
      async execute() {
        if (config.plugins.length === 0) {
          return "No plugins configured for installation. Add plugins in your crosstrain configuration."
        }

        const status = await getPluginInstallStatus(config.plugins, directory)
        
        let output = "# Installed Claude Code Plugins\n\n"
        
        for (const pluginConfig of config.plugins) {
          const pluginStatus = status.get(pluginConfig.name)
          const enabled = pluginConfig.enabled !== false ? "✅" : "❌"
          const installed = pluginStatus?.installed ? "✅" : "❌"
          
          output += `## ${enabled} ${pluginConfig.name}\n`
          output += `- **Marketplace:** ${pluginConfig.marketplace}\n`
          output += `- **Installation Status:** ${installed ? "Installed" : "Not Installed"}\n`
          output += `- **Target Directory:** ${pluginConfig.installDir || "project"}\n`
          
          if (pluginStatus?.location) {
            output += `- **Location:** ${pluginStatus.location}\n`
          }
          
          output += "\n"
        }
        
        return output
      },
    }),

    crosstrain_install_plugin: tool({
      description: "Install a specific Claude Code plugin from a configured marketplace",
      args: {
        pluginName: toolSchema.string().describe("Name of the plugin to install"),
        marketplace: toolSchema.string().describe("Name of the marketplace containing the plugin"),
        installDir: toolSchema.string().optional().describe("Installation directory (project, user, or custom path). Defaults to project"),
        force: toolSchema.boolean().optional().describe("Force reinstall if already installed. Defaults to false"),
      },
      async execute(args) {
        const { pluginName, marketplace: marketplaceName, installDir: customInstallDir, force = false } = args

        // Find the plugin
        const plugin = await findPlugin(pluginName, marketplaceName, config.marketplaces, directory, config.verbose)
        
        if (!plugin) {
          return `❌ Plugin "${pluginName}" not found in marketplace "${marketplaceName}"`
        }

        // Resolve installation directory
        const installDir = resolveInstallDir(customInstallDir || "project", directory)

        // Install the plugin
        const result = await installPlugin(plugin, installDir, { force, verbose: config.verbose })

        if (result.success) {
          return `✅ ${result.message}\n\nRestart OpenCode to load the newly installed plugin.`
        } else {
          return `❌ ${result.message}`
        }
      },
    }),

    crosstrain_uninstall_plugin: tool({
      description: "Uninstall a Claude Code plugin from a specified directory",
      args: {
        pluginName: toolSchema.string().describe("Name of the plugin to uninstall"),
        installDir: toolSchema.string().optional().describe("Installation directory where plugin is installed (project, user, or custom path). Defaults to project"),
      },
      async execute(args) {
        const { pluginName, installDir: customInstallDir } = args

        // Resolve installation directory
        const installDir = resolveInstallDir(customInstallDir || "project", directory)

        // Uninstall the plugin
        const result = await uninstallPlugin(pluginName, installDir, { verbose: config.verbose })

        if (result.success) {
          return `✅ ${result.message}`
        } else {
          return `❌ ${result.message}`
        }
      },
    }),

    crosstrain_clear_cache: tool({
      description: "Clear the Git marketplace cache. Use this if you want to force re-clone marketplaces from Git sources.",
      args: {},
      async execute() {
        try {
          await clearGitMarketplaceCache()
          const cacheDir = getGitCacheDirectory()
          return `✅ Git marketplace cache cleared successfully.\n\nCache directory: ${cacheDir}\n\nMarketplaces will be re-cloned on next access.`
        } catch (error) {
          return `❌ Failed to clear Git marketplace cache: ${error instanceof Error ? error.message : String(error)}`
        }
      },
    }),

    crosstrain_list_mcp: tool({
      description: "List all MCP servers discovered from Claude Code configurations (.mcp.json files)",
      args: {},
      async execute() {
        if (state.mcpServers.length === 0) {
          return "No MCP servers found.\n\nTo add MCP servers, create a .mcp.json file in your project root or ~/.claude/.mcp.json\n\nExample format:\n```json\n{\n  \"mcpServers\": {\n    \"my-server\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@package/server\"],\n      \"env\": { \"API_KEY\": \"...\" }\n    }\n  }\n}\n```"
        }

        return getMCPSummary(state.mcpServers)
      },
    }),

    crosstrain_sync_mcp: tool({
      description: "Force re-sync MCP servers from Claude Code to OpenCode configuration",
      args: {},
      async execute() {
        try {
          const mcpOptions = {
            filePrefix: config.filePrefix,
            verbose: config.verbose,
            enableByDefault: true,
          }

          const { discovered } = await getAllMCPServers(claudeDir, homeDir, mcpOptions)
          state.mcpServers = discovered

          if (discovered.length === 0) {
            return "No MCP servers found to sync."
          }

          const { serverCount, configPath } = await syncMCPToOpenCode(
            claudeDir,
            homeDir,
            openCodeDir,
            mcpOptions
          )

          return `✅ Synced ${serverCount} MCP server(s) to ${configPath}\n\n${getMCPSummary(discovered)}\n\n**Note:** Restart OpenCode to load the updated MCP configuration.`
        } catch (error) {
          return `❌ Failed to sync MCP servers: ${error instanceof Error ? error.message : String(error)}`
        }
      },
    }),
  }

  // Merge plugin management tools with skill tools
  const allTools = {
    ...state.tools,
    ...pluginManagementTools,
  }

  // Return the plugin interface
  return {
    // Expose tools converted from skills and plugin management tools
    tool: Object.keys(allTools).length > 0 ? allTools : undefined,

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
    "Get information about Claude Code assets loaded by the crosstrain plugin. Use to see what skills, agents, commands, hooks, and MCP servers are available from Claude Code.",
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

    if (summary.hasMCP) {
      info += "- **MCP Servers**: ✅ Synced to opencode.json\n"
    } else {
      info += "- **MCP Servers**: ❌ Not found\n"
    }

    info += "\n## Source Locations\n\n"
    info += `- Project: ${claudeDir}\n`
    info += `- User: ${join(homeDir, ".claude")}\n`
    info += `- Project .mcp.json: ${join(process.cwd(), ".mcp.json")}\n`

    return info
  },
})

// Default export for easier importing
export default CrosstrainPlugin
