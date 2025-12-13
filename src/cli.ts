#!/usr/bin/env bun
/**
 * Crosstrain CLI - Convert Claude Code assets to OpenCode format
 *
 * Usage:
 *   crosstrain <command> [path] [options]
 *
 * Commands:
 *   command <path>    Convert a Claude Code command to OpenCode
 *   skill <path>      Convert a Claude Code skill to OpenCode (generates plugin tool)
 *   agent <path>      Convert a Claude Code agent to OpenCode
 *   hook              Convert Claude Code hooks to OpenCode event handlers
 *   mcp [path]        Convert Claude Code MCP servers to OpenCode format
 *   all               Convert all Claude Code assets
 *   init              Initialize a new OpenCode plugin for skills
 *
 * Options:
 *   -o, --output-dir <path>  Output directory (default: .opencode)
 *   -p, --prefix <prefix>    File prefix (default: claude_)
 *   -v, --verbose            Enable verbose output
 *   --dry-run                Show what would be done without writing files
 *   --no-user                Don't load user-level assets from ~/.claude
 *   -h, --help               Show help
 *   --version                Show version
 */

import { join, dirname, basename, resolve, extname } from "path"
import { existsSync } from "fs"
import { mkdir, writeFile, readFile } from "fs/promises"
import {
  discoverSkills,
  convertSkillToTool,
  createToolsFromSkills,
} from "./loaders/skills"
import {
  discoverAgents,
  generateOpenCodeAgent,
  writeOpenCodeAgents,
  syncAgentsToOpenCode,
} from "./loaders/agents"
import {
  discoverCommands,
  generateOpenCodeCommand,
  writeOpenCodeCommands,
  syncCommandsToOpenCode,
} from "./loaders/commands"
import {
  loadClaudeHooksConfig,
  buildHookHandlers,
} from "./loaders/hooks"
import {
  discoverMCPConfigs,
  discoverPluginMCPConfigs,
  convertMCPServers,
  syncMCPToOpenCode,
  getAllMCPServers,
  getMCPSummary,
} from "./loaders/mcp"
import {
  parseMarkdownWithFrontmatter,
  readTextFile,
  extractNameFromPath,
  parseCommaSeparated,
} from "./utils/parser"
import type {
  ClaudeSkill,
  ClaudeSkillFrontmatter,
  ClaudeAgent,
  ClaudeAgentFrontmatter,
  ClaudeCommand,
  ClaudeCommandFrontmatter,
} from "./types"

// Version from package.json
const VERSION = "0.0.4"

interface CLIOptions {
  outputDir: string
  prefix: string
  verbose: boolean
  dryRun: boolean
  loadUserAssets: boolean
  claudeDir: string
  homeDir: string
}

const DEFAULT_OPTIONS: CLIOptions = {
  outputDir: ".opencode",
  prefix: "claude_",
  verbose: false,
  dryRun: false,
  loadUserAssets: true,
  claudeDir: ".claude",
  homeDir: process.env.HOME || "",
}

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
}

function log(message: string): void {
  console.log(message)
}

function success(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`)
}

function warn(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`)
}

function error(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`)
}

function info(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`)
}

function heading(message: string): void {
  console.log(`\n${colors.bold}${colors.cyan}${message}${colors.reset}`)
}

function printHelp(): void {
  console.log(`
${colors.bold}crosstrain${colors.reset} - Convert Claude Code assets to OpenCode format

${colors.bold}USAGE:${colors.reset}
  crosstrain <command> [path] [options]

${colors.bold}COMMANDS:${colors.reset}
  ${colors.cyan}command${colors.reset} <path>    Convert a Claude Code command (.md file)
  ${colors.cyan}skill${colors.reset} <path>      Convert a Claude Code skill (directory with SKILL.md)
  ${colors.cyan}agent${colors.reset} <path>      Convert a Claude Code agent (.md file)
  ${colors.cyan}hook${colors.reset}              Display Claude Code hooks configuration
  ${colors.cyan}mcp${colors.reset} [path]        Convert Claude Code MCP servers (.mcp.json)
  ${colors.cyan}all${colors.reset}               Convert all Claude Code assets in current project
  ${colors.cyan}sync${colors.reset}              Alias for 'all'
  ${colors.cyan}init${colors.reset}              Initialize a new OpenCode plugin for skills

${colors.bold}OPTIONS:${colors.reset}
  -o, --output-dir <path>  Output directory (default: .opencode)
  -p, --prefix <prefix>    File prefix for generated files (default: claude_)
  -v, --verbose            Enable verbose output
  --dry-run                Show what would be done without writing files
  --no-user                Don't load user-level assets from ~/.claude
  -h, --help               Show this help message
  --version                Show version

${colors.bold}EXAMPLES:${colors.reset}
  # Convert a single command
  crosstrain command .claude/commands/create-feature.md

  # Convert a skill directory
  crosstrain skill .claude/skills/pdf-extractor

  # Convert all assets with dry-run
  crosstrain all --dry-run

  # Convert to custom output directory
  crosstrain all -o ./my-opencode-dir

  # Initialize a plugin for skills
  crosstrain init
`)
}

function parseArgs(args: string[]): { command: string; path?: string; options: Partial<CLIOptions> } {
  const options: Partial<CLIOptions> = {}
  let command = ""
  let path: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "-h" || arg === "--help") {
      printHelp()
      process.exit(0)
    }

    if (arg === "--version") {
      console.log(`crosstrain v${VERSION}`)
      process.exit(0)
    }

    if (arg === "-o" || arg === "--output-dir") {
      options.outputDir = args[++i]
      continue
    }

    if (arg === "-p" || arg === "--prefix") {
      options.prefix = args[++i]
      continue
    }

    if (arg === "-v" || arg === "--verbose") {
      options.verbose = true
      continue
    }

    if (arg === "--dry-run") {
      options.dryRun = true
      continue
    }

    if (arg === "--no-user") {
      options.loadUserAssets = false
      continue
    }

    // First non-option argument is the command
    if (!command && !arg.startsWith("-")) {
      command = arg
      continue
    }

    // Second non-option argument is the path
    if (command && !path && !arg.startsWith("-")) {
      path = arg
      continue
    }
  }

  return { command, path, options }
}

// ========================================
// Individual Asset Converters
// ========================================

/**
 * Load a single skill from a path
 */
async function loadSingleSkill(skillPath: string): Promise<ClaudeSkill | null> {
  const resolvedPath = resolve(skillPath)

  // Check if it's a directory with SKILL.md
  let skillMdPath: string
  if (existsSync(join(resolvedPath, "SKILL.md"))) {
    skillMdPath = join(resolvedPath, "SKILL.md")
  } else if (basename(resolvedPath) === "SKILL.md" && existsSync(resolvedPath)) {
    skillMdPath = resolvedPath
  } else {
    return null
  }

  const skillDir = dirname(skillMdPath)
  const content = await readTextFile(skillMdPath)
  const parsed = parseMarkdownWithFrontmatter<ClaudeSkillFrontmatter>(content)

  const name = parsed.frontmatter.name || extractNameFromPath(skillDir)

  return {
    name,
    description: parsed.frontmatter.description || `Claude Code skill: ${name}`,
    allowedTools: parseCommaSeparated(parsed.frontmatter["allowed-tools"]),
    content: parsed.content,
    filePath: skillMdPath,
    supportingFiles: [],
  }
}

/**
 * Load a single agent from a path
 */
async function loadSingleAgent(agentPath: string): Promise<ClaudeAgent | null> {
  const resolvedPath = resolve(agentPath)

  if (!existsSync(resolvedPath)) {
    return null
  }

  const content = await readTextFile(resolvedPath)
  const parsed = parseMarkdownWithFrontmatter<ClaudeAgentFrontmatter>(content)

  const name = parsed.frontmatter.name || extractNameFromPath(resolvedPath)

  return {
    name,
    description: parsed.frontmatter.description || `Claude Code agent: ${name}`,
    tools: parseCommaSeparated(parsed.frontmatter.tools),
    model: parsed.frontmatter.model,
    permissionMode: parsed.frontmatter.permissionMode,
    skills: parseCommaSeparated(parsed.frontmatter.skills),
    systemPrompt: parsed.content,
    filePath: resolvedPath,
  }
}

/**
 * Load a single command from a path
 */
async function loadSingleCommand(commandPath: string): Promise<ClaudeCommand | null> {
  const resolvedPath = resolve(commandPath)

  if (!existsSync(resolvedPath)) {
    return null
  }

  const content = await readTextFile(resolvedPath)
  const parsed = parseMarkdownWithFrontmatter<ClaudeCommandFrontmatter>(content)

  const name = extractNameFromPath(resolvedPath)

  return {
    name,
    description: parsed.frontmatter.description,
    template: parsed.content,
    filePath: resolvedPath,
  }
}

/**
 * Generate a plugin tool wrapper for a skill
 */
function generateSkillPluginTool(skill: ClaudeSkill): string {
  const toolName = `skill_${skill.name.toLowerCase().replace(/-/g, "_")}`

  return `import { tool, toolSchema } from "@opencode-ai/plugin"

/**
 * ${skill.description}
 *
 * Source: ${skill.filePath}
 */
export const ${toolName} = tool({
  description: ${JSON.stringify(skill.description)},
  args: {
    query: toolSchema.string().optional().describe("Optional specific question or task for this skill"),
  },
  async execute(args: { query?: string }, ctx) {
    let response = \`## Skill: ${skill.name}\\n\\n\`
    response += \`### Instructions\\n\\n${skill.content.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\\n\\n\`

    if (args.query) {
      response += \`### Query: \${args.query}\\n\\n\`
    }

    return response
  },
})
`
}

/**
 * Generate a complete plugin entry point for skills
 */
function generateSkillsPlugin(skills: ClaudeSkill[]): string {
  const toolImports: string[] = []
  const toolExports: string[] = []

  for (const skill of skills) {
    const toolName = `skill_${skill.name.toLowerCase().replace(/-/g, "_")}`
    toolImports.push(`import { ${toolName} } from "./tools/${toolName}"`)
    toolExports.push(`    ${toolName},`)
  }

  return `/**
 * Crosstrain Skills Plugin
 *
 * Auto-generated OpenCode plugin that exposes Claude Code skills as tools.
 *
 * Generated by: crosstrain CLI
 * Generated at: ${new Date().toISOString()}
 */

import type { Plugin, PluginContext } from "@opencode-ai/plugin"
${toolImports.join("\n")}

export const CrosstrainSkillsPlugin: Plugin = async (ctx: PluginContext) => {
  return {
    tool: {
${toolExports.join("\n")}
    },
  }
}

export default CrosstrainSkillsPlugin
`
}

// ========================================
// Command Handlers
// ========================================

async function handleCommand(path: string | undefined, opts: CLIOptions): Promise<void> {
  if (!path) {
    error("Please provide a path to a command file")
    log("Usage: crosstrain command <path>")
    process.exit(1)
  }

  heading("Converting Command")

  const command = await loadSingleCommand(path)
  if (!command) {
    error(`Command not found at: ${path}`)
    process.exit(1)
  }

  info(`Found command: ${command.name}`)
  if (opts.verbose) {
    log(`  Description: ${command.description || "(none)"}`)
    log(`  Source: ${command.filePath}`)
  }

  const outputContent = generateOpenCodeCommand(command)
  const outputPath = join(opts.outputDir, "command", `${opts.prefix}${command.name}.md`)

  if (opts.dryRun) {
    heading("Generated Output (dry-run)")
    console.log(colors.dim + "─".repeat(60) + colors.reset)
    console.log(outputContent)
    console.log(colors.dim + "─".repeat(60) + colors.reset)
    info(`Would write to: ${outputPath}`)
  } else {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, outputContent)
    success(`Wrote: ${outputPath}`)
  }
}

async function handleSkill(path: string | undefined, opts: CLIOptions): Promise<void> {
  if (!path) {
    error("Please provide a path to a skill directory")
    log("Usage: crosstrain skill <path>")
    process.exit(1)
  }

  heading("Converting Skill")

  const skill = await loadSingleSkill(path)
  if (!skill) {
    error(`Skill not found at: ${path}`)
    log("Expected a directory containing SKILL.md")
    process.exit(1)
  }

  info(`Found skill: ${skill.name}`)
  if (opts.verbose) {
    log(`  Description: ${skill.description}`)
    log(`  Allowed tools: ${skill.allowedTools?.join(", ") || "(all)"}`)
    log(`  Source: ${skill.filePath}`)
  }

  const toolName = `skill_${skill.name.toLowerCase().replace(/-/g, "_")}`

  // Generate the tool file
  const toolContent = generateSkillPluginTool(skill)
  const toolPath = join(opts.outputDir, "plugin", "crosstrain-skills", "tools", `${toolName}.ts`)

  // Generate the plugin entry point (if it doesn't exist or we're creating single tool)
  const pluginContent = generateSkillsPlugin([skill])
  const pluginPath = join(opts.outputDir, "plugin", "crosstrain-skills", "index.ts")

  if (opts.dryRun) {
    heading("Generated Tool (dry-run)")
    console.log(colors.dim + "─".repeat(60) + colors.reset)
    console.log(toolContent)
    console.log(colors.dim + "─".repeat(60) + colors.reset)
    info(`Would write tool to: ${toolPath}`)
    info(`Would write plugin to: ${pluginPath}`)
  } else {
    await mkdir(dirname(toolPath), { recursive: true })
    await writeFile(toolPath, toolContent)
    success(`Wrote tool: ${toolPath}`)

    await writeFile(pluginPath, pluginContent)
    success(`Wrote plugin: ${pluginPath}`)
  }

  log("")
  info("To use this skill in OpenCode, add to opencode.json:")
  log(`  "plugins": ["${join(opts.outputDir, "plugin", "crosstrain-skills")}"]`)
}

async function handleAgent(path: string | undefined, opts: CLIOptions): Promise<void> {
  if (!path) {
    error("Please provide a path to an agent file")
    log("Usage: crosstrain agent <path>")
    process.exit(1)
  }

  heading("Converting Agent")

  const agent = await loadSingleAgent(path)
  if (!agent) {
    error(`Agent not found at: ${path}`)
    process.exit(1)
  }

  info(`Found agent: ${agent.name}`)
  if (opts.verbose) {
    log(`  Description: ${agent.description}`)
    log(`  Model: ${agent.model || "(inherit)"}`)
    log(`  Tools: ${agent.tools?.join(", ") || "(all)"}`)
    log(`  Permission mode: ${agent.permissionMode || "default"}`)
    log(`  Source: ${agent.filePath}`)
  }

  const outputContent = generateOpenCodeAgent(agent)
  const outputPath = join(opts.outputDir, "agent", `${opts.prefix}${agent.name}.md`)

  if (opts.dryRun) {
    heading("Generated Output (dry-run)")
    console.log(colors.dim + "─".repeat(60) + colors.reset)
    console.log(outputContent)
    console.log(colors.dim + "─".repeat(60) + colors.reset)
    info(`Would write to: ${outputPath}`)
  } else {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, outputContent)
    success(`Wrote: ${outputPath}`)
  }
}

async function handleHook(opts: CLIOptions): Promise<void> {
  heading("Claude Code Hooks Configuration")

  const hooksConfig = await loadClaudeHooksConfig(opts.claudeDir, opts.homeDir)

  if (!hooksConfig) {
    warn("No hooks configuration found")
    log("Hooks are configured in .claude/settings.json or ~/.claude/settings.json")
    return
  }

  const hookTypes = [
    "PreToolUse",
    "PostToolUse",
    "SessionStart",
    "SessionEnd",
    "Stop",
    "Notification",
  ] as const

  for (const hookType of hookTypes) {
    const matchers = hooksConfig[hookType]
    if (matchers && matchers.length > 0) {
      log(`\n${colors.bold}${hookType}${colors.reset}`)
      for (const matcher of matchers) {
        log(`  Matcher: ${matcher.matcher || "(all)"}`)
        for (const hook of matcher.hooks) {
          log(`    → ${hook.command}`)
        }
      }
    }
  }

  log("")
  info("Hook event mapping to OpenCode:")
  log("  PreToolUse      → tool.execute.before")
  log("  PostToolUse     → tool.execute.after")
  log("  SessionStart    → session.created")
  log("  SessionEnd/Stop → session.idle")
  log("")
  info("Hooks are converted at runtime when using the crosstrain plugin")
}

async function handleMCP(path: string | undefined, opts: CLIOptions): Promise<void> {
  heading("Converting MCP Servers")

  if (path) {
    // Convert a specific .mcp.json file
    const resolvedPath = resolve(path)
    if (!existsSync(resolvedPath)) {
      error(`MCP config not found at: ${path}`)
      process.exit(1)
    }

    const content = await readTextFile(resolvedPath)
    const config = JSON.parse(content)

    if (!config.mcpServers) {
      error("Invalid .mcp.json file: missing mcpServers object")
      process.exit(1)
    }

    const servers = Object.entries(config.mcpServers).map(([name, server]) => ({
      name,
      server: server as any,
      source: "project" as const,
      sourcePath: resolvedPath,
    }))

    const converted = convertMCPServers(servers, { filePrefix: opts.prefix, verbose: opts.verbose })

    if (opts.dryRun) {
      heading("Converted MCP Configuration (dry-run)")
      console.log(colors.dim + "─".repeat(60) + colors.reset)
      console.log(JSON.stringify({ mcp: converted }, null, 2))
      console.log(colors.dim + "─".repeat(60) + colors.reset)
      info("Would merge into: opencode.json")
    } else {
      const configPath = "opencode.json"
      let existingConfig: Record<string, any> = {}

      if (existsSync(configPath)) {
        const existing = await readTextFile(configPath)
        existingConfig = JSON.parse(existing)
      }

      existingConfig.mcp = { ...existingConfig.mcp, ...converted }
      if (!existingConfig.$schema) {
        existingConfig.$schema = "https://opencode.ai/config.json"
      }

      await writeFile(configPath, JSON.stringify(existingConfig, null, 2) + "\n")
      success(`Updated: ${configPath}`)
      log(`  Added ${Object.keys(converted).length} MCP server(s)`)
    }
  } else {
    // Discover and convert all MCP servers
    const { discovered, converted } = await getAllMCPServers(
      opts.claudeDir,
      opts.loadUserAssets ? opts.homeDir : "",
      { filePrefix: opts.prefix, verbose: opts.verbose }
    )

    if (discovered.length === 0) {
      warn("No MCP servers found")
      log("MCP servers are configured in .mcp.json files")
      return
    }

    log(getMCPSummary(discovered))

    if (opts.dryRun) {
      heading("Converted MCP Configuration (dry-run)")
      console.log(colors.dim + "─".repeat(60) + colors.reset)
      console.log(JSON.stringify({ mcp: converted }, null, 2))
      console.log(colors.dim + "─".repeat(60) + colors.reset)
      info("Would merge into: opencode.json")
    } else {
      const result = await syncMCPToOpenCode(
        opts.claudeDir,
        opts.loadUserAssets ? opts.homeDir : "",
        opts.outputDir,
        { filePrefix: opts.prefix, verbose: opts.verbose }
      )

      if (result.serverCount > 0) {
        success(`Synced ${result.serverCount} MCP server(s) to ${result.configPath}`)
      }
    }
  }
}

async function handleAll(opts: CLIOptions): Promise<void> {
  heading("Converting All Claude Code Assets")

  const homeDir = opts.loadUserAssets ? opts.homeDir : ""
  let totalConverted = 0

  // Commands
  log(`\n${colors.bold}Commands${colors.reset}`)
  const commands = await discoverCommands(opts.claudeDir, homeDir)
  if (commands.length === 0) {
    log("  No commands found")
  } else {
    if (opts.dryRun) {
      for (const cmd of commands) {
        info(`Would convert: ${cmd.name} → ${opts.prefix}${cmd.name}.md`)
      }
    } else {
      await writeOpenCodeCommands(commands, opts.outputDir, {
        filePrefix: opts.prefix,
        verbose: opts.verbose,
      })
      success(`Converted ${commands.length} command(s)`)
    }
    totalConverted += commands.length
  }

  // Agents
  log(`\n${colors.bold}Agents${colors.reset}`)
  const agents = await discoverAgents(opts.claudeDir, homeDir)
  if (agents.length === 0) {
    log("  No agents found")
  } else {
    if (opts.dryRun) {
      for (const agent of agents) {
        info(`Would convert: ${agent.name} → ${opts.prefix}${agent.name}.md`)
      }
    } else {
      await writeOpenCodeAgents(agents, opts.outputDir, {
        filePrefix: opts.prefix,
        verbose: opts.verbose,
      })
      success(`Converted ${agents.length} agent(s)`)
    }
    totalConverted += agents.length
  }

  // Skills
  log(`\n${colors.bold}Skills${colors.reset}`)
  const skills = await discoverSkills(opts.claudeDir, homeDir)
  if (skills.length === 0) {
    log("  No skills found")
  } else {
    if (opts.dryRun) {
      for (const skill of skills) {
        const toolName = `skill_${skill.name.toLowerCase().replace(/-/g, "_")}`
        info(`Would convert: ${skill.name} → tools/${toolName}.ts`)
      }
    } else {
      // Generate tool files for each skill
      const pluginDir = join(opts.outputDir, "plugin", "crosstrain-skills")
      const toolsDir = join(pluginDir, "tools")
      await mkdir(toolsDir, { recursive: true })

      for (const skill of skills) {
        const toolName = `skill_${skill.name.toLowerCase().replace(/-/g, "_")}`
        const toolContent = generateSkillPluginTool(skill)
        await writeFile(join(toolsDir, `${toolName}.ts`), toolContent)
        if (opts.verbose) {
          log(`  Wrote: tools/${toolName}.ts`)
        }
      }

      // Generate the plugin entry point
      const pluginContent = generateSkillsPlugin(skills)
      await writeFile(join(pluginDir, "index.ts"), pluginContent)

      success(`Converted ${skills.length} skill(s) to plugin at ${pluginDir}`)
    }
    totalConverted += skills.length
  }

  // MCP Servers
  log(`\n${colors.bold}MCP Servers${colors.reset}`)
  const { discovered, converted } = await getAllMCPServers(
    opts.claudeDir,
    homeDir,
    { filePrefix: opts.prefix, verbose: opts.verbose }
  )

  if (discovered.length === 0) {
    log("  No MCP servers found")
  } else {
    if (opts.dryRun) {
      for (const server of discovered) {
        info(`Would convert: ${server.name} → ${opts.prefix}${server.name}`)
      }
    } else {
      const result = await syncMCPToOpenCode(
        opts.claudeDir,
        homeDir,
        opts.outputDir,
        { filePrefix: opts.prefix, verbose: opts.verbose }
      )
      success(`Synced ${result.serverCount} MCP server(s)`)
    }
    totalConverted += discovered.length
  }

  // Hooks
  log(`\n${colors.bold}Hooks${colors.reset}`)
  const hooksConfig = await loadClaudeHooksConfig(opts.claudeDir, homeDir)
  if (!hooksConfig) {
    log("  No hooks found")
  } else {
    const hookCount =
      (hooksConfig.PreToolUse?.length || 0) +
      (hooksConfig.PostToolUse?.length || 0) +
      (hooksConfig.SessionStart?.length || 0) +
      (hooksConfig.SessionEnd?.length || 0) +
      (hooksConfig.Stop?.length || 0) +
      (hooksConfig.Notification?.length || 0)

    info(`Found ${hookCount} hook matcher(s) - converted at runtime by plugin`)
  }

  // Summary
  heading("Summary")
  if (opts.dryRun) {
    info(`Would convert ${totalConverted} asset(s)`)
  } else {
    success(`Converted ${totalConverted} asset(s)`)
    log("")
    info("To use skills in OpenCode, add to opencode.json:")
    log(`  "plugins": ["${join(opts.outputDir, "plugin", "crosstrain-skills")}"]`)
  }
}

async function handleInit(opts: CLIOptions): Promise<void> {
  heading("Initializing Crosstrain Skills Plugin")

  const pluginDir = join(opts.outputDir, "plugin", "crosstrain-skills")

  if (existsSync(pluginDir)) {
    warn(`Plugin directory already exists: ${pluginDir}`)
    log("Use 'crosstrain all' to sync skills to existing plugin")
    return
  }

  await mkdir(join(pluginDir, "tools"), { recursive: true })

  // Create a placeholder plugin
  const pluginContent = `/**
 * Crosstrain Skills Plugin
 *
 * OpenCode plugin that exposes Claude Code skills as tools.
 * Run 'crosstrain all' or 'crosstrain skill <path>' to populate.
 *
 * Generated by: crosstrain CLI
 * Generated at: ${new Date().toISOString()}
 */

import type { Plugin, PluginContext } from "@opencode-ai/plugin"

export const CrosstrainSkillsPlugin: Plugin = async (ctx: PluginContext) => {
  return {
    tool: {
      // Skills will be added here by crosstrain CLI
    },
  }
}

export default CrosstrainSkillsPlugin
`

  // Create package.json for the plugin
  const packageJson = {
    name: "crosstrain-skills",
    version: "0.0.1",
    description: "Claude Code skills converted to OpenCode tools",
    main: "index.ts",
    type: "module",
    peerDependencies: {
      "@opencode-ai/plugin": "*",
    },
  }

  if (opts.dryRun) {
    info(`Would create: ${pluginDir}/`)
    info(`Would create: ${pluginDir}/index.ts`)
    info(`Would create: ${pluginDir}/package.json`)
    info(`Would create: ${pluginDir}/tools/`)
  } else {
    await writeFile(join(pluginDir, "index.ts"), pluginContent)
    await writeFile(join(pluginDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n")

    success(`Created plugin at: ${pluginDir}`)
    log("")
    info("Next steps:")
    log("  1. Add skills using: crosstrain skill <path>")
    log("  2. Or sync all skills: crosstrain all")
    log("  3. Add plugin to opencode.json:")
    log(`     "plugins": ["${pluginDir}"]`)
  }
}

// ========================================
// Main
// ========================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const { command, path, options } = parseArgs(args)
  const opts: CLIOptions = { ...DEFAULT_OPTIONS, ...options }

  // Resolve paths relative to current directory
  opts.claudeDir = resolve(opts.claudeDir)
  opts.outputDir = resolve(opts.outputDir)

  switch (command) {
    case "command":
      await handleCommand(path, opts)
      break

    case "skill":
      await handleSkill(path, opts)
      break

    case "agent":
      await handleAgent(path, opts)
      break

    case "hook":
    case "hooks":
      await handleHook(opts)
      break

    case "mcp":
      await handleMCP(path, opts)
      break

    case "all":
    case "sync":
      await handleAll(opts)
      break

    case "init":
      await handleInit(opts)
      break

    default:
      error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

main().catch((err) => {
  error(err.message)
  if (process.env.DEBUG) {
    console.error(err)
  }
  process.exit(1)
})
