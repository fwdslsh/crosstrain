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
 *   plugin <source>   Convert a Claude Code plugin (local path or org/repo/plugin)
 *   list <source>     List plugins in a marketplace (org/repo or URL)
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
import { mkdir, writeFile, readFile, rm } from "fs/promises"
import { tmpdir } from "os"
import { execSync } from "child_process"
import {
  discoverSkills,
  convertSkillToTool,
  createToolsFromSkills,
} from "./src/loaders/skills"
import {
  discoverAgents,
  generateOpenCodeAgent,
  writeOpenCodeAgents,
  syncAgentsToOpenCode,
} from "./src/loaders/agents"
import {
  discoverCommands,
  generateOpenCodeCommand,
  writeOpenCodeCommands,
  syncCommandsToOpenCode,
} from "./src/loaders/commands"
import {
  loadClaudeHooksConfig,
  buildHookHandlers,
} from "./src/loaders/hooks"
import {
  discoverMCPConfigs,
  discoverPluginMCPConfigs,
  convertMCPServers,
  syncMCPToOpenCode,
  getAllMCPServers,
  getMCPSummary,
} from "./src/loaders/mcp"
import {
  loadMarketplace,
  discoverPluginsInMarketplace,
  parseMarketplaceManifest,
  parsePluginManifest,
  resolveMarketplaceSource,
  clearGitMarketplaceCache,
} from "./src/loaders/marketplace"
import {
  discoverClaudeSettings,
  convertClaudeSettingsToOpenCode,
  loadOpenCodeConfig,
  writeOpenCodeConfig,
  mergeOpenCodeConfigs,
  formatSettingsForDisplay,
} from "./src/loaders/settings-converter"
import {
  loadCrosstrainerConfig,
  shouldIncludeAsset,
  applyModelMapping,
  applyToolMapping,
  getEffectivePrefix,
  getEffectivePluginName,
  mergeWithDefaults,
  type CrosstrainerConfig,
  type ConversionContext,
  type LoadedCrosstrainerConfig,
} from "./src/loaders/crosstrainer-config"
import {
  parseMarkdownWithFrontmatter,
  readTextFile,
  extractNameFromPath,
  parseCommaSeparated,
} from "./src/utils/parser"
import type {
  ClaudeSkill,
  ClaudeSkillFrontmatter,
  ClaudeAgent,
  ClaudeAgentFrontmatter,
  ClaudeCommand,
  ClaudeCommandFrontmatter,
  ParsedPlugin,
} from "./src/types"

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
  ${colors.cyan}plugin${colors.reset} <source>   Convert a Claude Code plugin (local or remote)
  ${colors.cyan}list${colors.reset} <source>     List plugins in a marketplace (org/repo or URL)
  ${colors.cyan}all${colors.reset}               Convert all Claude Code assets in current project
  ${colors.cyan}sync${colors.reset}              Alias for 'all'
  ${colors.cyan}init${colors.reset}              Initialize a new OpenCode plugin for skills
  ${colors.cyan}settings${colors.reset}          Import Claude Code settings to OpenCode config

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

  # Convert a local plugin
  crosstrain plugin .claude/plugins/my-plugin

  # Convert a plugin from a GitHub marketplace
  crosstrain plugin anthropics/claude-plugins/code-review

  # List plugins in a marketplace
  crosstrain list anthropics/claude-plugins

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

  const homeDir = opts.loadUserAssets ? opts.homeDir : ""
  const hooksConfig = await loadClaudeHooksConfig(opts.claudeDir, homeDir)

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

// ========================================
// Git/Remote Helpers
// ========================================

const GIT_CACHE_DIR = join(tmpdir(), "crosstrain-cli-cache")

/**
 * Check if a source looks like a remote Git reference
 * (GitHub shorthand or URL, possibly with a subpath)
 */
function isRemoteSource(source: string): boolean {
  // Local paths start with ., /, or are just directory names that exist
  if (source.startsWith("./") || source.startsWith("../") || source.startsWith("/")) {
    return false
  }
  // Git URLs
  if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("git@")) {
    return true
  }
  // GitHub shorthand: org/repo or org/repo/path
  if (source.includes("/") && !existsSync(resolve(source))) {
    return true
  }
  return false
}

/**
 * Parse a remote source into repo and subpath
 * Examples:
 *   "anthropics/claude-plugins" -> { repo: "anthropics/claude-plugins", subpath: "" }
 *   "anthropics/claude-plugins/code-review" -> { repo: "anthropics/claude-plugins", subpath: "code-review" }
 *   "https://github.com/org/repo" -> { repo: "https://github.com/org/repo", subpath: "" }
 */
function parseRemoteSource(source: string): { repo: string; subpath: string; ref?: string } {
  // Handle full URLs
  if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("git@")) {
    // Check for @ref syntax (e.g., url@v1.0.0)
    const refMatch = source.match(/^(.+)@([^@/]+)$/)
    if (refMatch) {
      return { repo: refMatch[1], subpath: "", ref: refMatch[2] }
    }
    return { repo: source, subpath: "" }
  }

  // Handle GitHub shorthand with optional @ref
  // Format: org/repo[/subpath][@ref]
  const refMatch = source.match(/^(.+)@([^@/]+)$/)
  let pathPart = source
  let ref: string | undefined

  if (refMatch) {
    pathPart = refMatch[1]
    ref = refMatch[2]
  }

  const parts = pathPart.split("/")

  if (parts.length < 2) {
    return { repo: source, subpath: "", ref }
  }

  // First two parts are org/repo, rest is subpath
  const repo = `${parts[0]}/${parts[1]}`
  const subpath = parts.slice(2).join("/")

  return { repo, subpath, ref }
}

/**
 * Clone a Git repository to a temporary location
 */
async function cloneRepo(
  source: string,
  ref?: string,
  verbose: boolean = false
): Promise<string> {
  await mkdir(GIT_CACHE_DIR, { recursive: true })

  // Create a safe directory name from the source
  const safeName = source
    .replace(/^(https?:\/\/|git@)/, "")
    .replace(/\.git$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
  const targetPath = join(GIT_CACHE_DIR, safeName)

  // Convert GitHub shorthand to URL
  let repoUrl = source
  if (!source.startsWith("http://") && !source.startsWith("https://") && !source.startsWith("git@")) {
    repoUrl = `https://github.com/${source}`
  }

  try {
    if (existsSync(targetPath)) {
      // Update existing clone
      if (verbose) {
        info(`Updating cached repository: ${source}`)
      }
      try {
        execSync("git fetch --all --tags", { cwd: targetPath, stdio: verbose ? "inherit" : "pipe" })
        if (ref) {
          execSync(`git checkout '${ref}'`, { cwd: targetPath, stdio: verbose ? "inherit" : "pipe" })
          execSync(`git pull origin '${ref}' 2>/dev/null || true`, { cwd: targetPath, stdio: verbose ? "inherit" : "pipe" })
        } else {
          execSync("git pull", { cwd: targetPath, stdio: verbose ? "inherit" : "pipe" })
        }
      } catch {
        // If update fails, remove and re-clone
        if (verbose) {
          warn("Update failed, re-cloning...")
        }
        await rm(targetPath, { recursive: true, force: true })
      }
    }

    if (!existsSync(targetPath)) {
      if (verbose) {
        info(`Cloning repository: ${repoUrl}`)
      }
      if (ref) {
        execSync(`git clone --branch '${ref}' '${repoUrl}' '${targetPath}'`, {
          stdio: verbose ? "inherit" : "pipe",
        })
      } else {
        execSync(`git clone '${repoUrl}' '${targetPath}'`, {
          stdio: verbose ? "inherit" : "pipe",
        })
      }
    }

    return targetPath
  } catch (err) {
    throw new Error(`Failed to clone repository ${repoUrl}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ========================================
// List Command Handler
// ========================================

async function handleList(source: string | undefined, opts: CLIOptions): Promise<void> {
  if (!source) {
    error("Please provide a marketplace source")
    log("Usage: crosstrain list <org/repo>")
    log("")
    log("Examples:")
    log("  crosstrain list anthropics/claude-plugins")
    log("  crosstrain list https://github.com/org/marketplace")
    process.exit(1)
  }

  heading("Browsing Marketplace")

  const { repo, ref } = parseRemoteSource(source)
  info(`Source: ${repo}${ref ? ` (ref: ${ref})` : ""}`)

  // Clone/update the marketplace repo
  let marketplacePath: string
  try {
    marketplacePath = await cloneRepo(repo, ref, opts.verbose)
  } catch (err) {
    error(`Failed to fetch marketplace: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  // Parse the marketplace manifest
  const manifest = await parseMarketplaceManifest(marketplacePath)

  if (!manifest) {
    // No marketplace.json, try to discover plugins directly
    warn("No marketplace manifest found (.claude-plugin/marketplace.json)")
    log("Scanning for plugins in repository...")

    // Look for plugin directories (directories containing .claude-plugin/plugin.json)
    const { readdir: readdirAsync, stat: statAsync } = await import("fs/promises")
    const entries = await readdirAsync(marketplacePath, { withFileTypes: true })
    const plugins: { name: string; path: string; description?: string }[] = []

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const pluginJsonPath = join(marketplacePath, entry.name, ".claude-plugin", "plugin.json")
        if (existsSync(pluginJsonPath)) {
          const pluginManifest = await parsePluginManifest(join(marketplacePath, entry.name))
          if (pluginManifest) {
            plugins.push({
              name: pluginManifest.name || entry.name,
              path: entry.name,
              description: pluginManifest.description,
            })
          }
        }
      }
    }

    if (plugins.length === 0) {
      warn("No plugins found in this repository")
      log("")
      log("A valid marketplace should have:")
      log("  - .claude-plugin/marketplace.json with plugin listings, or")
      log("  - Subdirectories with .claude-plugin/plugin.json")
      return
    }

    log("")
    log(`${colors.bold}Available Plugins (${plugins.length})${colors.reset}`)
    log(colors.dim + "─".repeat(60) + colors.reset)

    for (const plugin of plugins) {
      log(`  ${colors.cyan}${plugin.name}${colors.reset}`)
      if (plugin.description) {
        log(`    ${colors.dim}${plugin.description}${colors.reset}`)
      }
      log(`    ${colors.dim}crosstrain plugin ${repo}/${plugin.path}${colors.reset}`)
      log("")
    }

    return
  }

  // Display marketplace info
  log("")
  log(`${colors.bold}${manifest.name || "Unnamed Marketplace"}${colors.reset}`)
  if (manifest.description) {
    log(colors.dim + manifest.description + colors.reset)
  }
  if (manifest.owner) {
    log(`${colors.dim}Owner: ${manifest.owner.name}${manifest.owner.url ? ` (${manifest.owner.url})` : ""}${colors.reset}`)
  }

  if (!manifest.plugins || manifest.plugins.length === 0) {
    warn("No plugins registered in this marketplace")
    return
  }

  log("")
  log(`${colors.bold}Available Plugins (${manifest.plugins.length})${colors.reset}`)
  log(colors.dim + "─".repeat(60) + colors.reset)

  for (const entry of manifest.plugins) {
    const pluginPath = join(marketplacePath, entry.source)
    const pluginManifest = await parsePluginManifest(pluginPath)

    // Check what assets the plugin has
    const hasSkills = existsSync(join(pluginPath, "skills"))
    const hasAgents = existsSync(join(pluginPath, "agents"))
    const hasCommands = existsSync(join(pluginPath, "commands"))
    const hasMCP = existsSync(join(pluginPath, ".mcp.json"))

    const assets: string[] = []
    if (hasSkills) assets.push("skills")
    if (hasAgents) assets.push("agents")
    if (hasCommands) assets.push("commands")
    if (hasMCP) assets.push("mcp")

    log(`  ${colors.cyan}${entry.name}${colors.reset}${entry.version ? ` v${entry.version}` : ""}`)
    const desc = entry.description || pluginManifest?.description
    if (desc) {
      log(`    ${colors.dim}${desc}${colors.reset}`)
    }
    if (assets.length > 0) {
      log(`    ${colors.dim}Contains: ${assets.join(", ")}${colors.reset}`)
    }
    if (entry.tags && entry.tags.length > 0) {
      log(`    ${colors.dim}Tags: ${entry.tags.join(", ")}${colors.reset}`)
    }
    log(`    ${colors.dim}crosstrain plugin ${repo}/${entry.source}${colors.reset}`)
    log("")
  }

  log(colors.dim + "─".repeat(60) + colors.reset)
  info("To convert a plugin, run:")
  log(`  crosstrain plugin ${repo}/<plugin-path>`)
}

// ========================================
// Plugin Command Handler
// ========================================

async function handlePlugin(source: string | undefined, opts: CLIOptions): Promise<void> {
  if (!source) {
    error("Please provide a plugin source")
    log("Usage: crosstrain plugin <source>")
    log("")
    log("Examples:")
    log("  crosstrain plugin .claude/plugins/my-plugin     # Local path")
    log("  crosstrain plugin org/repo/plugin-name          # GitHub")
    log("  crosstrain plugin org/repo/plugin-name@v1.0.0   # With version")
    process.exit(1)
  }

  let pluginPath: string
  let cleanupPath: string | undefined

  // Check if this is a remote source
  if (isRemoteSource(source)) {
    heading("Fetching Remote Plugin")

    const { repo, subpath, ref } = parseRemoteSource(source)

    if (!subpath) {
      error("Please specify a plugin path within the repository")
      log(`Example: crosstrain plugin ${repo}/<plugin-name>`)
      log("")
      log("To see available plugins, run:")
      log(`  crosstrain list ${repo}`)
      process.exit(1)
    }

    info(`Repository: ${repo}${ref ? ` (ref: ${ref})` : ""}`)
    info(`Plugin path: ${subpath}`)

    try {
      const repoPath = await cloneRepo(repo, ref, opts.verbose)
      pluginPath = join(repoPath, subpath)

      if (!existsSync(pluginPath)) {
        error(`Plugin not found at path: ${subpath}`)
        log("")
        log("To see available plugins, run:")
        log(`  crosstrain list ${repo}`)
        process.exit(1)
      }
    } catch (err) {
      error(`Failed to fetch plugin: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  } else {
    // Local path
    pluginPath = resolve(source)

    if (!existsSync(pluginPath)) {
      error(`Plugin directory not found at: ${source}`)
      process.exit(1)
    }
  }

  // Try to get plugin name from plugin.json or directory name
  let pluginName = basename(pluginPath)
  const pluginJsonPath = join(pluginPath, ".claude-plugin", "plugin.json")
  if (existsSync(pluginJsonPath)) {
    try {
      const pluginJson = JSON.parse(await readTextFile(pluginJsonPath))
      if (pluginJson.name) {
        pluginName = pluginJson.name
      }
    } catch {
      // Fall back to directory name
    }
  }

  // Load crosstrainer config if present
  let crosstrainerConfig: CrosstrainerConfig | null = null
  let crosstrainerInfo: LoadedCrosstrainerConfig | null = null
  try {
    crosstrainerInfo = await loadCrosstrainerConfig(pluginPath)
    if (crosstrainerInfo) {
      crosstrainerConfig = crosstrainerInfo.config
    }
  } catch (err) {
    warn(`Failed to load crosstrainer config: ${(err as Error).message}`)
  }

  // Apply crosstrainer config overrides
  if (crosstrainerConfig) {
    pluginName = getEffectivePluginName(pluginName, crosstrainerConfig)
  }

  heading(`Converting Plugin: ${pluginName}`)
  info(`Source: ${pluginPath}`)

  if (crosstrainerInfo) {
    info(`Crosstrainer config: ${basename(crosstrainerInfo.filePath)} (${crosstrainerInfo.fileType})`)
  }

  // Use plugin name as prefix for generated files
  let pluginPrefix = `${opts.prefix}${pluginName.replace(/[^a-zA-Z0-9]/g, "_")}_`
  if (crosstrainerConfig) {
    pluginPrefix = getEffectivePrefix(pluginPrefix, crosstrainerConfig)
  }

  // Create conversion context for hooks
  const conversionContext: ConversionContext = {
    pluginName,
    pluginDir: pluginPath,
    outputDir: opts.outputDir,
    prefix: pluginPrefix,
    dryRun: opts.dryRun,
    verbose: opts.verbose,
    config: crosstrainerConfig || {},
  }

  // Track converted files for post-conversion hook
  const convertedFiles = {
    agents: [] as string[],
    commands: [] as string[],
    skills: [] as string[],
    mcp: [] as string[],
  }

  let totalConverted = 0

  // Commands - check for commands/ directory in plugin
  log(`\n${colors.bold}Commands${colors.reset}`)
  const commandsDir = join(pluginPath, "commands")
  if (existsSync(commandsDir)) {
    // Discover commands directly from the plugin's commands directory
    let commands = await discoverCommands(pluginPath, "")

    // Apply crosstrainer filters
    commands = commands.filter(cmd => shouldIncludeAsset(cmd.name, crosstrainerConfig?.commands))

    // Apply crosstrainer transforms
    if (crosstrainerConfig?.transformCommand) {
      const transformed: typeof commands = []
      for (const cmd of commands) {
        const result = await crosstrainerConfig.transformCommand(cmd, conversionContext)
        if (result) {
          transformed.push(result)
        }
      }
      commands = transformed
    }

    if (commands.length === 0) {
      log("  No commands found")
    } else {
      if (opts.dryRun) {
        for (const cmd of commands) {
          info(`Would convert: ${cmd.name} → ${pluginPrefix}${cmd.name}.md`)
        }
      } else {
        await writeOpenCodeCommands(commands, opts.outputDir, {
          filePrefix: pluginPrefix,
          verbose: opts.verbose,
        })
        for (const cmd of commands) {
          convertedFiles.commands.push(`${pluginPrefix}${cmd.name}.md`)
        }
        success(`Converted ${commands.length} command(s)`)
      }
      totalConverted += commands.length
    }
  } else {
    log("  No commands/ directory found")
  }

  // Agents - check for agents/ directory in plugin
  log(`\n${colors.bold}Agents${colors.reset}`)
  const agentsDir = join(pluginPath, "agents")
  if (existsSync(agentsDir)) {
    let agents = await discoverAgents(pluginPath, "")

    // Apply crosstrainer filters
    agents = agents.filter(agent => shouldIncludeAsset(agent.name, crosstrainerConfig?.agents))

    // Apply model mapping from crosstrainer config
    if (crosstrainerConfig?.models) {
      agents = agents.map(agent => ({
        ...agent,
        model: applyModelMapping(agent.model, crosstrainerConfig!.models) || agent.model,
      }))
    }

    // Apply default model from crosstrainer config
    if (crosstrainerConfig?.agents?.defaultModel) {
      agents = agents.map(agent => ({
        ...agent,
        model: agent.model || crosstrainerConfig!.agents!.defaultModel,
      }))
    }

    // Apply crosstrainer transforms
    if (crosstrainerConfig?.transformAgent) {
      const transformed: typeof agents = []
      for (const agent of agents) {
        const result = await crosstrainerConfig.transformAgent(agent, conversionContext)
        if (result) {
          transformed.push(result)
        }
      }
      agents = transformed
    }

    if (agents.length === 0) {
      log("  No agents found")
    } else {
      if (opts.dryRun) {
        for (const agent of agents) {
          info(`Would convert: ${agent.name} → ${pluginPrefix}${agent.name}.md`)
        }
      } else {
        await writeOpenCodeAgents(agents, opts.outputDir, {
          filePrefix: pluginPrefix,
          verbose: opts.verbose,
        })
        for (const agent of agents) {
          convertedFiles.agents.push(`${pluginPrefix}${agent.name}.md`)
        }
        success(`Converted ${agents.length} agent(s)`)
      }
      totalConverted += agents.length
    }
  } else {
    log("  No agents/ directory found")
  }

  // Skills - check for skills/ directory in plugin
  log(`\n${colors.bold}Skills${colors.reset}`)
  const skillsDir = join(pluginPath, "skills")
  if (existsSync(skillsDir)) {
    let skills = await discoverSkills(pluginPath, "")

    // Apply crosstrainer filters
    skills = skills.filter(skill => shouldIncludeAsset(skill.name, crosstrainerConfig?.skills))

    // Apply crosstrainer transforms
    if (crosstrainerConfig?.transformSkill) {
      const transformed: typeof skills = []
      for (const skill of skills) {
        const result = await crosstrainerConfig.transformSkill(skill, conversionContext)
        if (result) {
          transformed.push(result)
        }
      }
      skills = transformed
    }

    if (skills.length === 0) {
      log("  No skills found")
    } else {
      if (opts.dryRun) {
        for (const skill of skills) {
          const toolName = `skill_${pluginName.toLowerCase().replace(/-/g, "_")}_${skill.name.toLowerCase().replace(/-/g, "_")}`
          info(`Would convert: ${skill.name} → tools/${toolName}.ts`)
        }
      } else {
        // Generate tool files for each skill with plugin-namespaced names
        const skillPluginDir = join(opts.outputDir, "plugin", `crosstrain-${pluginName}`)
        const toolsDir = join(skillPluginDir, "tools")
        await mkdir(toolsDir, { recursive: true })

        const pluginSkills: ClaudeSkill[] = []
        for (const skill of skills) {
          // Namespace the skill name with plugin name
          const namespacedSkill: ClaudeSkill = {
            ...skill,
            name: `${pluginName}_${skill.name}`,
          }
          pluginSkills.push(namespacedSkill)

          const toolName = `skill_${namespacedSkill.name.toLowerCase().replace(/-/g, "_")}`

          // Use custom tool generator if provided, otherwise use default
          let toolContent: string
          if (crosstrainerConfig?.generateSkillTool) {
            toolContent = await crosstrainerConfig.generateSkillTool(namespacedSkill, conversionContext)
          } else {
            toolContent = generateSkillPluginTool(namespacedSkill)
          }

          await writeFile(join(toolsDir, `${toolName}.ts`), toolContent)
          convertedFiles.skills.push(`tools/${toolName}.ts`)
          if (opts.verbose) {
            log(`  Wrote: tools/${toolName}.ts`)
          }
        }

        // Generate the plugin entry point
        const pluginContent = generateSkillsPlugin(pluginSkills)
        await writeFile(join(skillPluginDir, "index.ts"), pluginContent)

        // Generate package.json for the plugin
        const packageJson = {
          name: `crosstrain-${pluginName}`,
          version: "0.0.1",
          description: crosstrainerConfig?.description || `Claude Code plugin '${pluginName}' skills converted to OpenCode tools`,
          main: "index.ts",
          type: "module",
          peerDependencies: {
            "@opencode-ai/plugin": "*",
          },
        }
        await writeFile(join(skillPluginDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n")

        success(`Converted ${skills.length} skill(s) to plugin at ${skillPluginDir}`)
      }
      totalConverted += skills.length
    }
  } else {
    log("  No skills/ directory found")
  }

  // MCP Servers - check for .mcp.json in plugin root
  log(`\n${colors.bold}MCP Servers${colors.reset}`)
  const mcpPath = join(pluginPath, ".mcp.json")
  if (existsSync(mcpPath)) {
    try {
      const content = await readTextFile(mcpPath)
      const config = JSON.parse(content)

      if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
        let servers = Object.entries(config.mcpServers).map(([name, server]) => ({
          name,
          server: server as any,
          source: "plugin" as const,
          sourcePath: mcpPath,
        }))

        // Apply crosstrainer filters
        servers = servers.filter(s => shouldIncludeAsset(s.name, crosstrainerConfig?.mcp))

        // Apply crosstrainer transforms
        if (crosstrainerConfig?.transformMCP) {
          const transformed: typeof servers = []
          for (const s of servers) {
            const result = await crosstrainerConfig.transformMCP(s.name, s.server, conversionContext)
            if (result) {
              transformed.push({
                name: result.name,
                server: result.server,
                source: "plugin" as const,
                sourcePath: mcpPath,
              })
            }
          }
          servers = transformed
        }

        if (servers.length === 0) {
          log("  No MCP servers to convert")
        } else if (opts.dryRun) {
          for (const server of servers) {
            info(`Would convert: ${server.name} → ${pluginPrefix}${server.name}`)
          }
        } else {
          const converted = convertMCPServers(servers, {
            filePrefix: pluginPrefix,
            verbose: opts.verbose,
            enableByDefault: crosstrainerConfig?.mcp?.enableByDefault,
          })

          // Merge into opencode.json
          const configPath = join(dirname(opts.outputDir), "opencode.json")
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
          for (const name of Object.keys(converted)) {
            convertedFiles.mcp.push(name)
          }
          success(`Synced ${Object.keys(converted).length} MCP server(s)`)
        }
        totalConverted += servers.length
      } else {
        log("  No MCP servers configured")
      }
    } catch (err) {
      warn(`Failed to parse .mcp.json: ${err}`)
    }
  } else {
    log("  No .mcp.json found")
  }

  // Hooks - check for settings.json in plugin root
  log(`\n${colors.bold}Hooks${colors.reset}`)
  const settingsPath = join(pluginPath, "settings.json")
  if (existsSync(settingsPath)) {
    try {
      const content = await readTextFile(settingsPath)
      const settings = JSON.parse(content)

      if (settings.hooks) {
        const hookCount =
          (settings.hooks.PreToolUse?.length || 0) +
          (settings.hooks.PostToolUse?.length || 0) +
          (settings.hooks.SessionStart?.length || 0) +
          (settings.hooks.SessionEnd?.length || 0) +
          (settings.hooks.Stop?.length || 0) +
          (settings.hooks.Notification?.length || 0)

        if (hookCount > 0) {
          info(`Found ${hookCount} hook matcher(s) - converted at runtime by plugin`)
        } else {
          log("  No hooks configured")
        }
      } else {
        log("  No hooks in settings.json")
      }
    } catch {
      log("  No valid settings.json found")
    }
  } else {
    log("  No settings.json found")
  }

  // Call post-conversion hook if provided
  if (crosstrainerConfig?.onConversionComplete && !opts.dryRun) {
    try {
      await crosstrainerConfig.onConversionComplete(conversionContext, convertedFiles)
    } catch (err) {
      warn(`Post-conversion hook failed: ${(err as Error).message}`)
    }
  }

  // Summary
  heading("Summary")
  if (opts.dryRun) {
    info(`Would convert ${totalConverted} asset(s) from plugin '${pluginName}'`)
  } else {
    success(`Converted ${totalConverted} asset(s) from plugin '${pluginName}'`)
    if (existsSync(join(pluginPath, "skills"))) {
      log("")
      info("To use skills in OpenCode, add to opencode.json:")
      log(`  "plugins": ["${join(opts.outputDir, "plugin", `crosstrain-${pluginName}`)}"]`)
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
// Settings Handler
// ========================================

async function handleSettings(opts: CLIOptions): Promise<void> {
  heading("Claude Code Settings Import")

  // Discover all Claude Code settings
  const settings = await discoverClaudeSettings(opts.claudeDir, opts.loadUserAssets)

  // Display discovered settings
  if (opts.verbose) {
    if (settings.userSettings) {
      log(formatSettingsForDisplay(settings.userSettings, "User Settings (~/.claude/settings.json)"))
    }
    if (settings.userLocalSettings) {
      log(formatSettingsForDisplay(settings.userLocalSettings, "User Local Settings (~/.claude/settings.local.json)"))
    }
    if (settings.projectSettings) {
      log(formatSettingsForDisplay(settings.projectSettings, "Project Settings (.claude/settings.json)"))
    }
    if (settings.projectLocalSettings) {
      log(formatSettingsForDisplay(settings.projectLocalSettings, "Project Local Settings (.claude/settings.local.json)"))
    }
    log("")
  }

  // Show merged settings summary
  log(`\n${colors.bold}Merged Claude Code Settings${colors.reset}`)
  log("─".repeat(40))

  const merged = settings.merged

  if (merged.model) {
    log(`  Model: ${merged.model}`)
  }

  if (merged.permissions) {
    const permKeys = Object.keys(merged.permissions).filter(k =>
      merged.permissions[k] && (Array.isArray(merged.permissions[k]) ? merged.permissions[k].length > 0 : true)
    )
    if (permKeys.length > 0) {
      log(`  Permissions: ${permKeys.join(", ")}`)
      if (merged.permissions.defaultMode) {
        log(`    Default Mode: ${merged.permissions.defaultMode}`)
      }
      if (merged.permissions.allow?.length > 0) {
        log(`    Allow: ${merged.permissions.allow.length} rule(s)`)
      }
      if (merged.permissions.deny?.length > 0) {
        log(`    Deny: ${merged.permissions.deny.length} rule(s)`)
      }
    }
  }

  if (merged.hooks) {
    const hookTypes = Object.keys(merged.hooks).filter(k => merged.hooks[k]?.length > 0)
    if (hookTypes.length > 0) {
      log(`  Hooks: ${hookTypes.join(", ")}`)
    }
  }

  if (merged.enabledPlugins && Object.keys(merged.enabledPlugins).length > 0) {
    const enabledCount = Object.values(merged.enabledPlugins).filter(v => v).length
    log(`  Enabled Plugins: ${enabledCount}`)
  }

  if (merged.extraKnownMarketplaces && Object.keys(merged.extraKnownMarketplaces).length > 0) {
    log(`  Marketplaces: ${Object.keys(merged.extraKnownMarketplaces).join(", ")}`)
  }

  if (merged.env && Object.keys(merged.env).length > 0) {
    log(`  Environment Variables: ${Object.keys(merged.env).length}`)
  }

  // Convert to OpenCode format
  log(`\n${colors.bold}Converting to OpenCode Configuration${colors.reset}`)
  log("─".repeat(40))

  const openCodeConfig = convertClaudeSettingsToOpenCode(merged)

  // Load existing OpenCode config
  const existingConfig = await loadOpenCodeConfig(opts.outputDir)
  if (existingConfig) {
    info("Found existing opencode.json - will merge settings")
  }

  // Merge configurations
  const finalConfig = mergeOpenCodeConfigs(existingConfig, openCodeConfig)

  // Display what will be written
  if (finalConfig.model) {
    log(`  Model: ${finalConfig.model}`)
  }

  if (finalConfig.permission && Object.keys(finalConfig.permission).length > 0) {
    log(`  Permissions:`)
    for (const [tool, perm] of Object.entries(finalConfig.permission)) {
      log(`    ${tool}: ${perm}`)
    }
  }

  // Handle dry-run or write
  const projectRoot = resolve(opts.outputDir, "..")
  const configPath = join(projectRoot, "opencode.json")

  if (opts.dryRun) {
    log("")
    info("[dry-run] Would write to: " + configPath)
    log("")
    log("Generated OpenCode configuration:")
    log(JSON.stringify(finalConfig, null, 2))
  } else {
    await writeOpenCodeConfig(opts.outputDir, finalConfig)
    log("")
    success(`Wrote: ${configPath}`)
  }

  // Show what wasn't converted
  log("")
  info("Note: Some Claude Code settings don't have direct OpenCode equivalents:")
  log("  - hooks → Use OpenCode plugins instead")
  log("  - env → Set environment variables before running OpenCode")
  log("  - companyAnnouncements → Not supported")
  log("  - sandbox → OpenCode uses different sandboxing")
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

    case "plugin":
      await handlePlugin(path, opts)
      break

    case "list":
    case "ls":
      await handleList(path, opts)
      break

    case "all":
    case "sync":
      await handleAll(opts)
      break

    case "init":
      await handleInit(opts)
      break

    case "settings":
    case "config":
      await handleSettings(opts)
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
