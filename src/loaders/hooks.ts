/**
 * Hooks Loader - Converts Claude Code Hooks to OpenCode Plugin Event Handlers
 *
 * Claude Code Hooks are shell commands configured in settings.json that
 * execute at various lifecycle points (PreToolUse, PostToolUse, etc.).
 *
 * OpenCode Plugins use event handlers and tool.execute.before/after hooks
 * to achieve similar functionality.
 *
 * Mapping strategy:
 * - PreToolUse → tool.execute.before
 * - PostToolUse → tool.execute.after
 * - SessionStart → session.created event
 * - SessionEnd → session.idle event
 * - Notification → tui.toast.show event
 * - Other hooks are converted to best-effort event handlers
 *
 * Note: Claude hooks receive JSON input via stdin and can block execution
 * by returning non-zero exit codes. OpenCode hooks can throw errors to
 * achieve similar blocking behavior.
 */

import { join } from "path"
import { existsSync } from "fs"
import { $ } from "bun"
import type {
  ClaudeHooksConfig,
  ClaudeHookMatcher,
  ClaudeHook,
} from "../types"
import { HOOK_EVENT_MAPPING } from "../types"
import { readTextFile } from "../utils/parser"

/**
 * Load Claude Code hooks configuration from settings.json
 */
export async function loadClaudeHooksConfig(
  claudeDir: string,
  homeDir: string
): Promise<ClaudeHooksConfig | null> {
  // Check project settings first
  const projectSettingsPath = join(claudeDir, "settings.json")
  if (existsSync(projectSettingsPath)) {
    try {
      const content = await readTextFile(projectSettingsPath)
      const settings = JSON.parse(content)
      if (settings.hooks) {
        return settings.hooks as ClaudeHooksConfig
      }
    } catch (error) {
      console.error(`Error reading project settings:`, error)
    }
  }

  // Fall back to user settings
  const userSettingsPath = join(homeDir, ".claude", "settings.json")
  if (existsSync(userSettingsPath)) {
    try {
      const content = await readTextFile(userSettingsPath)
      const settings = JSON.parse(content)
      if (settings.hooks) {
        return settings.hooks as ClaudeHooksConfig
      }
    } catch (error) {
      console.error(`Error reading user settings:`, error)
    }
  }

  return null
}

/**
 * Execute a Claude hook command
 *
 * Claude hooks receive JSON input via stdin and can:
 * - Return exit code 0 for success
 * - Return exit code 2 to block execution (with optional feedback)
 * - Return any other exit code for error
 */
async function executeHookCommand(
  command: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; blocked: boolean; output: string }> {
  try {
    const inputJson = JSON.stringify(input)
    const result = await $`echo ${inputJson} | ${command}`.quiet()

    return {
      success: result.exitCode === 0,
      blocked: result.exitCode === 2,
      output: result.text(),
    }
  } catch (error: any) {
    // Check for blocking exit code
    if (error.exitCode === 2) {
      return {
        success: false,
        blocked: true,
        output: error.stderr?.toString() || error.stdout?.toString() || "",
      }
    }

    return {
      success: false,
      blocked: false,
      output: error.message || "Hook execution failed",
    }
  }
}

/**
 * Check if a tool name matches a hook matcher pattern
 */
function matchesTool(matcher: string, toolName: string): boolean {
  if (matcher === "" || matcher === "*") {
    return true
  }

  // Support pipe-separated matchers (e.g., "Edit|Write")
  if (matcher.includes("|")) {
    const patterns = matcher.split("|")
    return patterns.some((p) => matchesTool(p.trim(), toolName))
  }

  // Case-insensitive match
  return toolName.toLowerCase() === matcher.toLowerCase()
}

/**
 * Create OpenCode tool.execute.before handler from Claude PreToolUse hooks
 */
export function createToolExecuteBeforeHandler(
  hookMatchers: ClaudeHookMatcher[]
): (input: any, output: any) => Promise<void> {
  return async (input, output) => {
    const toolName = input.tool

    for (const matcher of hookMatchers) {
      if (matchesTool(matcher.matcher, toolName)) {
        for (const hook of matcher.hooks) {
          if (hook.type === "command") {
            // Build input for the hook (mimicking Claude's format)
            const hookInput = {
              tool_name: toolName,
              tool_input: output.args,
              session_id: "", // Not available in OpenCode
              message_id: "", // Not available in OpenCode
            }

            const result = await executeHookCommand(hook.command, hookInput)

            if (result.blocked) {
              // Throw error to block tool execution
              throw new Error(
                `[crosstrain] Hook blocked tool execution: ${result.output || "No reason provided"}`
              )
            }

            if (!result.success) {
              console.error(
                `[crosstrain] PreToolUse hook failed: ${result.output}`
              )
            }
          }
        }
      }
    }
  }
}

/**
 * Create OpenCode tool.execute.after handler from Claude PostToolUse hooks
 */
export function createToolExecuteAfterHandler(
  hookMatchers: ClaudeHookMatcher[]
): (input: any, output: any) => Promise<void> {
  return async (input, output) => {
    const toolName = input.tool

    for (const matcher of hookMatchers) {
      if (matchesTool(matcher.matcher, toolName)) {
        for (const hook of matcher.hooks) {
          if (hook.type === "command") {
            // Build input for the hook
            const hookInput = {
              tool_name: toolName,
              tool_input: output.args,
              tool_result: output.result,
              session_id: "",
              message_id: "",
            }

            const result = await executeHookCommand(hook.command, hookInput)

            if (!result.success) {
              console.error(
                `[crosstrain] PostToolUse hook failed: ${result.output}`
              )
            }
          }
        }
      }
    }
  }
}

/**
 * Create OpenCode event handler from Claude session/notification hooks
 */
export function createEventHandler(
  hooksConfig: ClaudeHooksConfig
): (params: { event: any }) => Promise<void> {
  return async ({ event }) => {
    // Map OpenCode events back to Claude hook types
    const eventToHookMap: Record<string, keyof ClaudeHooksConfig> = {
      "session.created": "SessionStart",
      "session.idle": "Stop",
      "tui.toast.show": "Notification",
    }

    const hookType = eventToHookMap[event.type]
    if (!hookType) return

    const hookMatchers = hooksConfig[hookType]
    if (!hookMatchers || hookMatchers.length === 0) return

    for (const matcher of hookMatchers) {
      // For session/notification hooks, matcher is typically empty or "*"
      for (const hook of matcher.hooks) {
        if (hook.type === "command") {
          const hookInput = {
            event_type: event.type,
            event_data: event,
          }

          const result = await executeHookCommand(hook.command, hookInput)

          if (!result.success) {
            console.error(
              `[crosstrain] ${hookType} hook failed: ${result.output}`
            )
          }
        }
      }
    }
  }
}

/**
 * Build all OpenCode hook handlers from Claude hooks configuration
 */
export async function buildHookHandlers(
  claudeDir: string,
  homeDir: string
): Promise<{
  toolExecuteBefore?: (input: any, output: any) => Promise<void>
  toolExecuteAfter?: (input: any, output: any) => Promise<void>
  event?: (params: { event: any }) => Promise<void>
}> {
  const hooksConfig = await loadClaudeHooksConfig(claudeDir, homeDir)

  if (!hooksConfig) {
    return {}
  }

  const handlers: {
    toolExecuteBefore?: (input: any, output: any) => Promise<void>
    toolExecuteAfter?: (input: any, output: any) => Promise<void>
    event?: (params: { event: any }) => Promise<void>
  } = {}

  // PreToolUse → tool.execute.before
  if (hooksConfig.PreToolUse && hooksConfig.PreToolUse.length > 0) {
    handlers.toolExecuteBefore = createToolExecuteBeforeHandler(
      hooksConfig.PreToolUse
    )
    console.log(
      `[crosstrain] Loaded ${hooksConfig.PreToolUse.length} PreToolUse hook matchers`
    )
  }

  // PostToolUse → tool.execute.after
  if (hooksConfig.PostToolUse && hooksConfig.PostToolUse.length > 0) {
    handlers.toolExecuteAfter = createToolExecuteAfterHandler(
      hooksConfig.PostToolUse
    )
    console.log(
      `[crosstrain] Loaded ${hooksConfig.PostToolUse.length} PostToolUse hook matchers`
    )
  }

  // Session and notification hooks → event handler
  const hasEventHooks =
    (hooksConfig.SessionStart && hooksConfig.SessionStart.length > 0) ||
    (hooksConfig.SessionEnd && hooksConfig.SessionEnd.length > 0) ||
    (hooksConfig.Stop && hooksConfig.Stop.length > 0) ||
    (hooksConfig.Notification && hooksConfig.Notification.length > 0)

  if (hasEventHooks) {
    handlers.event = createEventHandler(hooksConfig)
    console.log(`[crosstrain] Loaded session/notification hook handlers`)
  }

  return handlers
}

/**
 * Get paths to watch for hook configuration changes
 */
export function getHookWatchPaths(
  claudeDir: string,
  homeDir: string
): string[] {
  const paths: string[] = []

  const projectSettingsPath = join(claudeDir, "settings.json")
  if (existsSync(projectSettingsPath)) {
    paths.push(projectSettingsPath)
  }

  const userSettingsPath = join(homeDir, ".claude", "settings.json")
  if (existsSync(userSettingsPath)) {
    paths.push(userSettingsPath)
  }

  return paths
}
