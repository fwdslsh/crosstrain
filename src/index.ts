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
 */

import { join } from "path"
import { homedir } from "os"

// Import types and tool from local fallback
import type { Plugin, ToolDefinition } from "./plugin-types"
import { tool, toolSchema } from "./plugin-types"
import { mkdir } from "fs/promises"
import { existsSync } from "fs"

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
}

/**
 * Main plugin export
 */
export const CrosstrainPlugin: Plugin = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  const homeDir = homedir()
  const claudeDir = join(directory, ".claude")
  const openCodeDir = join(directory, ".opencode")

  console.log("[crosstrain] Initializing Claude Code extension loader...")

  // Check if there are any Claude Code assets to load
  if (!hasClaudeCodeAssets(claudeDir, homeDir)) {
    console.log(
      "[crosstrain] No Claude Code assets found, plugin will remain idle"
    )
    return {}
  }

  // Initialize plugin state
  const state: PluginState = {
    watcher: null,
    tools: {},
    hookHandlers: {},
  }

  // Ensure OpenCode directories exist
  await mkdir(join(openCodeDir, "agent"), { recursive: true })
  await mkdir(join(openCodeDir, "command"), { recursive: true })
  await mkdir(join(openCodeDir, "tool"), { recursive: true })

  // Get summary of available assets
  const summary = await getAssetSummary(claudeDir, homeDir)
  console.log("[crosstrain] Asset summary:", summary)

  // Load skills as tools
  if (summary.hasSkills) {
    try {
      state.tools = await createToolsFromSkills(claudeDir, homeDir)
      console.log(
        `[crosstrain] Loaded ${Object.keys(state.tools).length} skills as tools`
      )
    } catch (error) {
      console.error("[crosstrain] Error loading skills:", error)
    }
  }

  // Sync agents to OpenCode format
  if (summary.hasAgents) {
    try {
      const agents = await syncAgentsToOpenCode(claudeDir, homeDir, openCodeDir)
      console.log(`[crosstrain] Synced ${agents.length} agents to OpenCode`)
    } catch (error) {
      console.error("[crosstrain] Error syncing agents:", error)
    }
  }

  // Sync commands to OpenCode format
  if (summary.hasCommands) {
    try {
      const commands = await syncCommandsToOpenCode(
        claudeDir,
        homeDir,
        openCodeDir
      )
      console.log(`[crosstrain] Synced ${commands.length} commands to OpenCode`)
    } catch (error) {
      console.error("[crosstrain] Error syncing commands:", error)
    }
  }

  // Build hook handlers
  if (summary.hasHooks) {
    try {
      state.hookHandlers = await buildHookHandlers(claudeDir, homeDir)
      console.log("[crosstrain] Built hook handlers from Claude settings")
    } catch (error) {
      console.error("[crosstrain] Error building hook handlers:", error)
    }
  }

  // Set up file watcher for dynamic updates
  state.watcher = createWatcher({
    claudeDir,
    homeDir,
    onSkillChange: async () => {
      console.log("[crosstrain] Skills changed, reloading...")
      try {
        state.tools = await createToolsFromSkills(claudeDir, homeDir)
        console.log(
          `[crosstrain] Reloaded ${Object.keys(state.tools).length} skills`
        )
      } catch (error) {
        console.error("[crosstrain] Error reloading skills:", error)
      }
    },
    onAgentChange: async () => {
      console.log("[crosstrain] Agents changed, resyncing...")
      try {
        const agents = await syncAgentsToOpenCode(
          claudeDir,
          homeDir,
          openCodeDir
        )
        console.log(`[crosstrain] Resynced ${agents.length} agents`)
      } catch (error) {
        console.error("[crosstrain] Error resyncing agents:", error)
      }
    },
    onCommandChange: async () => {
      console.log("[crosstrain] Commands changed, resyncing...")
      try {
        const commands = await syncCommandsToOpenCode(
          claudeDir,
          homeDir,
          openCodeDir
        )
        console.log(`[crosstrain] Resynced ${commands.length} commands`)
      } catch (error) {
        console.error("[crosstrain] Error resyncing commands:", error)
      }
    },
    onHookChange: async () => {
      console.log("[crosstrain] Hooks changed, rebuilding handlers...")
      try {
        state.hookHandlers = await buildHookHandlers(claudeDir, homeDir)
        console.log("[crosstrain] Rebuilt hook handlers")
      } catch (error) {
        console.error("[crosstrain] Error rebuilding hook handlers:", error)
      }
    },
  })

  console.log("[crosstrain] Plugin initialized successfully")

  // Return the plugin interface
  return {
    // Expose tools converted from skills
    tool: state.tools,

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
