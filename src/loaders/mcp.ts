/**
 * MCP Server Loader
 *
 * Converts Claude Code MCP server configurations (.mcp.json)
 * to OpenCode MCP format for seamless integration.
 *
 * Claude Code MCP format:
 * {
 *   "mcpServers": {
 *     "server-name": {
 *       "command": "npx",
 *       "args": ["-y", "@package/server"],
 *       "env": { "KEY": "value" }
 *     }
 *   }
 * }
 *
 * OpenCode MCP format:
 * {
 *   "mcp": {
 *     "server-name": {
 *       "type": "local",
 *       "command": ["npx", "-y", "@package/server"],
 *       "environment": { "KEY": "value" },
 *       "enabled": true
 *     }
 *   }
 * }
 */

import { join, dirname, basename, resolve } from "path"
import { existsSync } from "fs"
import { readdir, readFile, writeFile, mkdir } from "fs/promises"
import type {
  ClaudeMCPConfig,
  ClaudeMCPServer,
  OpenCodeMCPConfig,
  OpenCodeMCPLocalServer,
  DiscoveredMCPServer,
  MCPLoaderOptions,
} from "../types"
import { readTextFile } from "../utils/parser"

/**
 * Default MCP loader options
 */
const DEFAULT_OPTIONS: Required<MCPLoaderOptions> = {
  filePrefix: "claude_",
  verbose: false,
  enableByDefault: true,
}

/**
 * Parse a .mcp.json file
 */
export async function parseMCPConfig(filePath: string): Promise<ClaudeMCPConfig | null> {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await readTextFile(filePath)
    const config = JSON.parse(content) as ClaudeMCPConfig

    // Validate structure
    if (!config.mcpServers || typeof config.mcpServers !== "object") {
      console.warn(`Invalid MCP config at ${filePath}: missing mcpServers object`)
      return null
    }

    return config
  } catch (error) {
    console.error(`Failed to parse MCP config at ${filePath}:`, error)
    return null
  }
}

/**
 * Discover .mcp.json files in Claude Code directories
 */
export async function discoverMCPConfigs(
  claudeDir: string,
  homeDir: string
): Promise<DiscoveredMCPServer[]> {
  const servers: DiscoveredMCPServer[] = []

  // Check project-level .mcp.json (in project root, not in .claude)
  const projectRootMcpPath = join(dirname(claudeDir), ".mcp.json")
  if (existsSync(projectRootMcpPath)) {
    const config = await parseMCPConfig(projectRootMcpPath)
    if (config) {
      for (const [name, server] of Object.entries(config.mcpServers)) {
        servers.push({
          name,
          server,
          source: "project",
          sourcePath: projectRootMcpPath,
        })
      }
    }
  }

  // Check user-level .mcp.json
  if (homeDir) {
    const userMcpPath = join(homeDir, ".claude", ".mcp.json")
    if (existsSync(userMcpPath)) {
      const config = await parseMCPConfig(userMcpPath)
      if (config) {
        for (const [name, server] of Object.entries(config.mcpServers)) {
          // Skip if already defined at project level
          if (!servers.find((s) => s.name === name)) {
            servers.push({
              name,
              server,
              source: "user",
              sourcePath: userMcpPath,
            })
          }
        }
      }
    }

    // Also check ~/.mcp.json (alternative location)
    const homeRootMcpPath = join(homeDir, ".mcp.json")
    if (existsSync(homeRootMcpPath)) {
      const config = await parseMCPConfig(homeRootMcpPath)
      if (config) {
        for (const [name, server] of Object.entries(config.mcpServers)) {
          // Skip if already defined
          if (!servers.find((s) => s.name === name)) {
            servers.push({
              name,
              server,
              source: "user",
              sourcePath: homeRootMcpPath,
            })
          }
        }
      }
    }
  }

  return servers
}

/**
 * Discover MCP configs from installed plugins
 */
export async function discoverPluginMCPConfigs(
  claudeDir: string
): Promise<DiscoveredMCPServer[]> {
  const servers: DiscoveredMCPServer[] = []

  // Check for .mcp.json files in installed plugins (.claude/plugins/*)
  const pluginsDir = join(claudeDir, "plugins")
  if (!existsSync(pluginsDir)) {
    return servers
  }

  try {
    const entries = await readdir(pluginsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const pluginMcpPath = join(pluginsDir, entry.name, ".mcp.json")
      if (existsSync(pluginMcpPath)) {
        const config = await parseMCPConfig(pluginMcpPath)
        if (config) {
          for (const [name, server] of Object.entries(config.mcpServers)) {
            servers.push({
              name,
              server,
              source: "plugin",
              sourcePath: pluginMcpPath,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error("Error discovering plugin MCP configs:", error)
  }

  return servers
}

/**
 * Convert a Claude MCP server to OpenCode format
 */
export function convertMCPServer(
  claudeServer: ClaudeMCPServer,
  options: MCPLoaderOptions = {}
): OpenCodeMCPLocalServer {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Build command array from command + args
  const command: string[] = [claudeServer.command]
  if (claudeServer.args && claudeServer.args.length > 0) {
    command.push(...claudeServer.args)
  }

  const openCodeServer: OpenCodeMCPLocalServer = {
    type: "local",
    command,
    enabled: opts.enableByDefault,
  }

  // Add environment if present
  if (claudeServer.env && Object.keys(claudeServer.env).length > 0) {
    openCodeServer.environment = { ...claudeServer.env }
  }

  return openCodeServer
}

/**
 * Convert all discovered MCP servers to OpenCode format
 */
export function convertMCPServers(
  servers: DiscoveredMCPServer[],
  options: MCPLoaderOptions = {}
): OpenCodeMCPConfig {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const config: OpenCodeMCPConfig = {}

  for (const discovered of servers) {
    // Optionally prefix server names to avoid conflicts
    const name = opts.filePrefix
      ? `${opts.filePrefix}${discovered.name}`
      : discovered.name

    config[name] = convertMCPServer(discovered.server, options)
  }

  return config
}

/**
 * Merge MCP configurations, with later sources taking precedence
 */
export function mergeMCPConfigs(
  ...configs: OpenCodeMCPConfig[]
): OpenCodeMCPConfig {
  const merged: OpenCodeMCPConfig = {}

  for (const config of configs) {
    for (const [name, server] of Object.entries(config)) {
      merged[name] = server
    }
  }

  return merged
}

/**
 * Get all MCP servers from Claude Code sources
 */
export async function getAllMCPServers(
  claudeDir: string,
  homeDir: string,
  options: MCPLoaderOptions = {}
): Promise<{
  discovered: DiscoveredMCPServer[]
  converted: OpenCodeMCPConfig
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Discover from all sources
  const projectAndUserServers = await discoverMCPConfigs(claudeDir, homeDir)
  const pluginServers = await discoverPluginMCPConfigs(claudeDir)

  // Combine all discovered servers
  const allServers = [...projectAndUserServers, ...pluginServers]

  // Remove duplicates (prefer earlier sources)
  const seen = new Set<string>()
  const uniqueServers = allServers.filter((server) => {
    if (seen.has(server.name)) {
      return false
    }
    seen.add(server.name)
    return true
  })

  if (opts.verbose) {
    console.log(`[crosstrain] Discovered ${uniqueServers.length} MCP servers`)
    for (const server of uniqueServers) {
      console.log(`  - ${server.name} (${server.source}: ${server.sourcePath})`)
    }
  }

  // Convert to OpenCode format
  const converted = convertMCPServers(uniqueServers, options)

  return {
    discovered: uniqueServers,
    converted,
  }
}

/**
 * Write OpenCode MCP config to file
 * Merges with existing config if present
 */
export async function syncMCPToOpenCode(
  claudeDir: string,
  homeDir: string,
  openCodeDir: string,
  options: MCPLoaderOptions = {}
): Promise<{
  serverCount: number
  configPath: string
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Get all MCP servers
  const { converted } = await getAllMCPServers(claudeDir, homeDir, options)

  if (Object.keys(converted).length === 0) {
    return { serverCount: 0, configPath: "" }
  }

  // OpenCode MCP config goes in the project root's opencode.json
  const projectRoot = dirname(claudeDir)
  const configPath = join(projectRoot, "opencode.json")

  // Read existing config if present
  let existingConfig: Record<string, any> = {}
  if (existsSync(configPath)) {
    try {
      const content = await readTextFile(configPath)
      existingConfig = JSON.parse(content)
    } catch (error) {
      // Ignore parse errors, will create new config
      if (opts.verbose) {
        console.warn(`[crosstrain] Could not parse existing opencode.json:`, error)
      }
    }
  }

  // Merge MCP configs
  const existingMcp = (existingConfig.mcp as OpenCodeMCPConfig) || {}
  const mergedMcp = mergeMCPConfigs(existingMcp, converted)

  // Update config
  existingConfig.mcp = mergedMcp

  // Add schema if not present
  if (!existingConfig.$schema) {
    existingConfig.$schema = "https://opencode.ai/config.json"
  }

  // Write back
  await writeFile(configPath, JSON.stringify(existingConfig, null, 2) + "\n")

  if (opts.verbose) {
    console.log(`[crosstrain] Synced ${Object.keys(converted).length} MCP servers to ${configPath}`)
  }

  return {
    serverCount: Object.keys(converted).length,
    configPath,
  }
}

/**
 * Check if any MCP configs exist
 */
export function hasMCPConfigs(claudeDir: string, homeDir: string): boolean {
  const paths = [
    join(dirname(claudeDir), ".mcp.json"),
    join(claudeDir, "plugins"),
  ]

  if (homeDir) {
    paths.push(
      join(homeDir, ".claude", ".mcp.json"),
      join(homeDir, ".mcp.json")
    )
  }

  return paths.some(existsSync)
}

/**
 * Generate a summary of MCP servers for display
 */
export function getMCPSummary(servers: DiscoveredMCPServer[]): string {
  if (servers.length === 0) {
    return "No MCP servers configured"
  }

  const bySource = {
    project: servers.filter((s) => s.source === "project"),
    user: servers.filter((s) => s.source === "user"),
    plugin: servers.filter((s) => s.source === "plugin"),
  }

  let summary = `Found ${servers.length} MCP server(s):\n`

  if (bySource.project.length > 0) {
    summary += `\n**Project-level:**\n`
    for (const s of bySource.project) {
      summary += `- ${s.name}: ${s.server.command}\n`
    }
  }

  if (bySource.user.length > 0) {
    summary += `\n**User-level:**\n`
    for (const s of bySource.user) {
      summary += `- ${s.name}: ${s.server.command}\n`
    }
  }

  if (bySource.plugin.length > 0) {
    summary += `\n**From plugins:**\n`
    for (const s of bySource.plugin) {
      summary += `- ${s.name}: ${s.server.command}\n`
    }
  }

  return summary
}
