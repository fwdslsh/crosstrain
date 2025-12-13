/**
 * Crosstrain - OpenCode Plugin for Claude Code Asset Conversion
 *
 * This plugin exposes tools that wrap the crosstrain CLI, enabling the AI agent
 * to assist with converting Claude Code assets to OpenCode format.
 *
 * The agent can:
 * - Run crosstrain CLI commands to convert assets
 * - Review and improve generated OpenCode assets
 * - Browse Claude Code marketplaces
 * - Install plugins from remote sources
 *
 * For direct CLI usage, run: crosstrain --help
 */

import { join } from "path"
import { execSync, spawn } from "child_process"
import { existsSync } from "fs"
import { homedir } from "os"

// Import types and tool from local fallback
import type { Plugin, ToolDefinition } from "./plugin-types"
import { tool, toolSchema } from "./plugin-types"

// Import configuration utilities
import type { CrosstrainConfig } from "./types"
import { loadConfig, createLogger } from "./utils/config"

// Re-export types and utilities for potential external use
export * from "./types"
export * from "./utils/parser"
export * from "./utils/config"
export * from "./utils/settings"

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
 * Get the path to the crosstrain CLI
 */
function getCLIPath(): string {
  // First check if we're in the plugin directory
  const localCLI = join(__dirname, "cli.ts")
  if (existsSync(localCLI)) {
    return localCLI
  }

  // Check parent directory (for when running from dist/)
  const parentCLI = join(__dirname, "..", "src", "cli.ts")
  if (existsSync(parentCLI)) {
    return parentCLI
  }

  // Fall back to global installation
  return "crosstrain"
}

/**
 * Run the crosstrain CLI and capture output
 */
function runCLI(
  args: string[],
  cwd: string,
  verbose: boolean = false
): { success: boolean; output: string; error?: string } {
  const cliPath = getCLIPath()

  try {
    // Use bun to run the CLI if it's a .ts file
    const cmd = cliPath.endsWith(".ts") ? ["bun", "run", cliPath, ...args] : [cliPath, ...args]

    const result = execSync(cmd.join(" "), {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" }, // Disable colors for clean output
    })

    return { success: true, output: result }
  } catch (err: any) {
    const output = err.stdout?.toString() || ""
    const error = err.stderr?.toString() || err.message

    return {
      success: false,
      output,
      error,
    }
  }
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
  const { directory, crosstrain: pluginOptions } = ctx

  // Load and resolve configuration
  const config = await loadConfig(directory, pluginOptions)
  const logger = createLogger(config)

  // Check if plugin is enabled
  if (!config.enabled) {
    logger.info("Plugin is disabled via configuration")
    return {}
  }

  logger.info("Crosstrain plugin loaded - CLI wrapper tools available")

  // Define tools that wrap the CLI
  const tools: Record<string, ToolDefinition> = {
    crosstrain: tool({
      description: `Run crosstrain CLI commands to convert Claude Code assets to OpenCode format.

Available commands:
- command <path>  - Convert a Claude Code command (.md file)
- skill <path>    - Convert a Claude Code skill (directory with SKILL.md)
- agent <path>    - Convert a Claude Code agent (.md file)
- hook            - Display Claude Code hooks configuration
- mcp [path]      - Convert Claude Code MCP servers (.mcp.json)
- plugin <source> - Convert a Claude Code plugin (local path or org/repo/plugin)
- list <source>   - List plugins in a marketplace (org/repo or URL)
- all             - Convert all Claude Code assets in current project
- init            - Initialize a new OpenCode plugin for skills

Options:
- --dry-run       - Show what would be done without writing files
- --verbose       - Enable verbose output
- --no-user       - Don't load user-level assets from ~/.claude
- -o, --output-dir <path>  - Output directory (default: .opencode)
- -p, --prefix <prefix>    - File prefix (default: claude_)

Examples:
- crosstrain command .claude/commands/create-feature.md
- crosstrain plugin anthropics/claude-plugins/code-review
- crosstrain list anthropics/claude-plugins
- crosstrain all --dry-run`,
      args: {
        command: toolSchema.string().describe("The crosstrain command and arguments (e.g., 'all --dry-run', 'plugin ./my-plugin', 'list org/repo')"),
      },
      async execute(args: { command: string }) {
        const cmdArgs = args.command.split(/\s+/).filter(Boolean)

        if (cmdArgs.length === 0) {
          return "Please provide a command. Run with '--help' for usage information."
        }

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "Command completed successfully."
        } else {
          let response = "Command failed.\n\n"
          if (result.output) {
            response += `Output:\n${result.output}\n\n`
          }
          if (result.error) {
            response += `Error:\n${result.error}`
          }
          return response
        }
      },
    }),

    crosstrain_convert_all: tool({
      description: "Convert all Claude Code assets in the current project to OpenCode format. This runs 'crosstrain all' to convert commands, agents, skills, MCP servers, and syncs hooks.",
      args: {
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
        verbose: toolSchema.boolean().optional().describe("Show detailed output"),
        noUser: toolSchema.boolean().optional().describe("Skip user-level assets from ~/.claude"),
      },
      async execute(args: { dryRun?: boolean; verbose?: boolean; noUser?: boolean }) {
        const cmdArgs = ["all"]
        if (args.dryRun) cmdArgs.push("--dry-run")
        if (args.verbose) cmdArgs.push("--verbose")
        if (args.noUser) cmdArgs.push("--no-user")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "All assets converted successfully."
        } else {
          return `Conversion failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_convert_plugin: tool({
      description: "Convert a Claude Code plugin to OpenCode assets. The source can be a local path or a GitHub reference (org/repo/plugin-path[@version]).",
      args: {
        source: toolSchema.string().describe("Plugin source: local path (./path/to/plugin) or GitHub (org/repo/plugin[@v1.0.0])"),
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
        verbose: toolSchema.boolean().optional().describe("Show detailed output"),
      },
      async execute(args: { source: string; dryRun?: boolean; verbose?: boolean }) {
        const cmdArgs = ["plugin", args.source]
        if (args.dryRun) cmdArgs.push("--dry-run")
        if (args.verbose) cmdArgs.push("--verbose")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "Plugin converted successfully."
        } else {
          return `Plugin conversion failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_list_marketplace: tool({
      description: "List available plugins in a Claude Code marketplace. Use GitHub shorthand (org/repo) or a full URL.",
      args: {
        source: toolSchema.string().describe("Marketplace source: GitHub shorthand (org/repo) or full URL"),
        verbose: toolSchema.boolean().optional().describe("Show detailed output"),
      },
      async execute(args: { source: string; verbose?: boolean }) {
        const cmdArgs = ["list", args.source]
        if (args.verbose) cmdArgs.push("--verbose")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "No plugins found."
        } else {
          return `Failed to list marketplace:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_convert_command: tool({
      description: "Convert a single Claude Code command (.md file) to OpenCode format.",
      args: {
        path: toolSchema.string().describe("Path to the Claude Code command file (e.g., .claude/commands/my-command.md)"),
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
      },
      async execute(args: { path: string; dryRun?: boolean }) {
        const cmdArgs = ["command", args.path]
        if (args.dryRun) cmdArgs.push("--dry-run")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "Command converted successfully."
        } else {
          return `Command conversion failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_convert_skill: tool({
      description: "Convert a Claude Code skill (directory with SKILL.md) to an OpenCode plugin tool.",
      args: {
        path: toolSchema.string().describe("Path to the skill directory (e.g., .claude/skills/my-skill)"),
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
      },
      async execute(args: { path: string; dryRun?: boolean }) {
        const cmdArgs = ["skill", args.path]
        if (args.dryRun) cmdArgs.push("--dry-run")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "Skill converted successfully."
        } else {
          return `Skill conversion failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_convert_agent: tool({
      description: "Convert a Claude Code agent (.md file) to OpenCode format.",
      args: {
        path: toolSchema.string().describe("Path to the Claude Code agent file (e.g., .claude/agents/my-agent.md)"),
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
      },
      async execute(args: { path: string; dryRun?: boolean }) {
        const cmdArgs = ["agent", args.path]
        if (args.dryRun) cmdArgs.push("--dry-run")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "Agent converted successfully."
        } else {
          return `Agent conversion failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_convert_mcp: tool({
      description: "Convert Claude Code MCP servers (.mcp.json) to OpenCode configuration.",
      args: {
        path: toolSchema.string().optional().describe("Path to specific .mcp.json file (optional, discovers all if not provided)"),
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
      },
      async execute(args: { path?: string; dryRun?: boolean }) {
        const cmdArgs = ["mcp"]
        if (args.path) cmdArgs.push(args.path)
        if (args.dryRun) cmdArgs.push("--dry-run")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "MCP servers converted successfully."
        } else {
          return `MCP conversion failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_show_hooks: tool({
      description: "Display Claude Code hooks configuration and their OpenCode event mapping.",
      args: {},
      async execute() {
        const result = runCLI(["hook"], directory, config.verbose)

        if (result.success) {
          return result.output || "No hooks configured."
        } else {
          return `Failed to read hooks:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_init: tool({
      description: "Initialize a new OpenCode plugin structure for skills. Creates the plugin directory and entry point.",
      args: {
        dryRun: toolSchema.boolean().optional().describe("Preview changes without writing files"),
      },
      async execute(args: { dryRun?: boolean }) {
        const cmdArgs = ["init"]
        if (args.dryRun) cmdArgs.push("--dry-run")

        const result = runCLI(cmdArgs, directory, config.verbose)

        if (result.success) {
          return result.output || "Plugin initialized successfully."
        } else {
          return `Plugin initialization failed:\n\n${result.error || result.output}`
        }
      },
    }),

    crosstrain_help: tool({
      description: "Show crosstrain CLI help and available commands.",
      args: {},
      async execute() {
        const result = runCLI(["--help"], directory)
        return result.output || "Run 'crosstrain --help' for usage information."
      },
    }),
  }

  // Return the plugin interface with just the tools
  return {
    tool: tools,
  }
}

// Default export for easier importing
export default CrosstrainPlugin
