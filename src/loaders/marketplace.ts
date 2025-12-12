/**
 * Marketplace Loader
 *
 * Handles discovery, parsing, and management of Claude Code marketplaces.
 * Supports both local directories and Git repositories as marketplace sources.
 */

import { join, resolve, isAbsolute } from "path"
import { existsSync } from "fs"
import { readdir, stat } from "fs/promises"
import type {
  MarketplaceConfig,
  ClaudeMarketplaceManifest,
  MarketplacePluginEntry,
  ClaudePluginManifest,
  ParsedPlugin,
} from "../types"
import { readTextFile } from "../utils/parser"

/**
 * Parse a marketplace manifest file
 */
export async function parseMarketplaceManifest(
  marketplacePath: string
): Promise<ClaudeMarketplaceManifest | null> {
  const manifestPath = join(marketplacePath, ".claude-plugin", "marketplace.json")

  if (!existsSync(manifestPath)) {
    return null
  }

  try {
    const content = await readTextFile(manifestPath)
    return JSON.parse(content) as ClaudeMarketplaceManifest
  } catch (error) {
    console.error(`Failed to parse marketplace manifest at ${manifestPath}:`, error)
    return null
  }
}

/**
 * Parse a plugin manifest file
 */
export async function parsePluginManifest(
  pluginPath: string
): Promise<ClaudePluginManifest | null> {
  const manifestPath = join(pluginPath, ".claude-plugin", "plugin.json")

  if (!existsSync(manifestPath)) {
    return null
  }

  try {
    const content = await readTextFile(manifestPath)
    return JSON.parse(content) as ClaudePluginManifest
  } catch (error) {
    console.error(`Failed to parse plugin manifest at ${manifestPath}:`, error)
    return null
  }
}

/**
 * Resolve marketplace source path
 * Handles local paths, Git URLs, and GitHub shorthands
 */
export function resolveMarketplaceSource(
  source: string,
  projectRoot: string
): { type: "local" | "git"; path: string; url?: string } {
  // Check if it's a local path
  if (source.startsWith("./") || source.startsWith("../") || isAbsolute(source)) {
    const absolutePath = isAbsolute(source) ? source : resolve(projectRoot, source)
    return { type: "local", path: absolutePath }
  }

  // Check if it's a Git URL
  if (source.startsWith("http://") || source.startsWith("https://") || source.startsWith("git@")) {
    return { type: "git", path: "", url: source }
  }

  // Assume it's a GitHub shorthand (e.g., "org/repo")
  if (source.includes("/")) {
    return { type: "git", path: "", url: `https://github.com/${source}` }
  }

  // Default to treating as local path relative to project
  const absolutePath = resolve(projectRoot, source)
  return { type: "local", path: absolutePath }
}

/**
 * Discover plugins in a marketplace
 */
export async function discoverPluginsInMarketplace(
  marketplacePath: string,
  marketplaceName: string
): Promise<ParsedPlugin[]> {
  const manifest = await parseMarketplaceManifest(marketplacePath)

  if (!manifest || !manifest.plugins || manifest.plugins.length === 0) {
    return []
  }

  const plugins: ParsedPlugin[] = []

  for (const entry of manifest.plugins) {
    const pluginPath = join(marketplacePath, entry.source)

    if (!existsSync(pluginPath)) {
      console.warn(`Plugin source not found: ${pluginPath}`)
      continue
    }

    const pluginManifest = await parsePluginManifest(pluginPath)

    if (!pluginManifest) {
      console.warn(`Plugin manifest not found for: ${entry.name}`)
      continue
    }

    // Check for plugin components
    const hasSkills = existsSync(join(pluginPath, "skills"))
    const hasAgents = existsSync(join(pluginPath, "agents"))
    const hasCommands = existsSync(join(pluginPath, "commands"))
    const hasHooks = existsSync(join(pluginPath, "hooks", "hooks.json"))
    const hasMCP = existsSync(join(pluginPath, ".mcp.json"))

    plugins.push({
      manifest: pluginManifest,
      marketplace: marketplaceName,
      sourcePath: pluginPath,
      hasSkills,
      hasAgents,
      hasCommands,
      hasHooks,
      hasMCP,
    })
  }

  return plugins
}

/**
 * Load marketplace from configuration
 */
export async function loadMarketplace(
  config: MarketplaceConfig,
  projectRoot: string
): Promise<{ path: string; manifest: ClaudeMarketplaceManifest | null } | null> {
  if (config.enabled === false) {
    return null
  }

  const resolved = resolveMarketplaceSource(config.source, projectRoot)

  if (resolved.type === "local") {
    if (!existsSync(resolved.path)) {
      console.warn(`Marketplace path does not exist: ${resolved.path}`)
      return null
    }

    const manifest = await parseMarketplaceManifest(resolved.path)
    return { path: resolved.path, manifest }
  }

  // For Git sources, we would need to clone/fetch the repository
  // This is a placeholder for future implementation
  console.warn("Git marketplace sources are not yet implemented")
  return null
}

/**
 * List all available plugins across all marketplaces
 */
export async function listAvailablePlugins(
  marketplaces: MarketplaceConfig[],
  projectRoot: string
): Promise<Map<string, ParsedPlugin[]>> {
  const pluginsByMarketplace = new Map<string, ParsedPlugin[]>()

  for (const marketplace of marketplaces) {
    if (marketplace.enabled === false) {
      continue
    }

    const loaded = await loadMarketplace(marketplace, projectRoot)
    if (!loaded) {
      continue
    }

    const plugins = await discoverPluginsInMarketplace(loaded.path, marketplace.name)
    pluginsByMarketplace.set(marketplace.name, plugins)
  }

  return pluginsByMarketplace
}

/**
 * Find a specific plugin in marketplaces
 */
export async function findPlugin(
  pluginName: string,
  marketplaceName: string,
  marketplaces: MarketplaceConfig[],
  projectRoot: string
): Promise<ParsedPlugin | null> {
  const marketplace = marketplaces.find(m => m.name === marketplaceName)

  if (!marketplace) {
    return null
  }

  const loaded = await loadMarketplace(marketplace, projectRoot)
  if (!loaded) {
    return null
  }

  const plugins = await discoverPluginsInMarketplace(loaded.path, marketplaceName)
  return plugins.find(p => p.manifest.name === pluginName) || null
}
