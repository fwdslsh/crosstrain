/**
 * Marketplace Loader
 *
 * Handles discovery, parsing, and management of Claude Code marketplaces.
 * Supports both local directories and Git repositories as marketplace sources.
 */

import { join, resolve, isAbsolute, basename } from "path"
import { existsSync } from "fs"
import { readdir, stat, mkdir, rm } from "fs/promises"
import { tmpdir } from "os"
import { execSync } from "child_process"
import type {
  MarketplaceConfig,
  ClaudeMarketplaceManifest,
  MarketplacePluginEntry,
  ClaudePluginManifest,
  ParsedPlugin,
} from "../types"
import { readTextFile } from "../utils/parser"

/**
 * Cache directory for cloned Git repositories
 */
const GIT_CACHE_DIR = join(tmpdir(), "crosstrain-marketplaces")

/**
 * Validate and sanitize a Git ref (branch, tag, or commit)
 * Only allows alphanumeric, hyphens, underscores, slashes, and dots
 */
function validateGitRef(ref: string): string {
  // Allow common ref patterns: branches, tags, commits
  // Valid: main, v1.0.0, feature/branch, origin/main, abc123def
  if (!/^[a-zA-Z0-9._\/-]+$/.test(ref)) {
    throw new Error(`Invalid Git ref format: ${ref}`)
  }
  return ref
}

/**
 * Escape shell argument for safe execution
 * Uses single quotes and escapes any single quotes in the argument
 */
function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`
}

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
 * Generate a safe directory name for a Git URL
 */
function getGitCacheDirName(url: string): string {
  // Remove protocol and special characters, replace with safe characters
  return url
    .replace(/^(https?:\/\/|git@)/, "")
    .replace(/\.git$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
}

/**
 * Clone or update a Git repository
 */
async function cloneOrUpdateGitRepo(
  url: string,
  ref?: string,
  verbose: boolean = false
): Promise<string> {
  // Validate ref if provided
  if (ref) {
    ref = validateGitRef(ref)
  }

  // Ensure cache directory exists
  await mkdir(GIT_CACHE_DIR, { recursive: true })

  const cacheDirName = getGitCacheDirName(url)
  const targetPath = join(GIT_CACHE_DIR, cacheDirName)
  const escapedUrl = escapeShellArg(url)
  const escapedTargetPath = escapeShellArg(targetPath)

  try {
    if (existsSync(targetPath)) {
      // Repository already cloned, update it
      if (verbose) {
        console.log(`[crosstrain] Updating Git repository: ${url}`)
      }

      try {
        // Fetch latest changes
        execSync("git fetch --all --tags", {
          cwd: targetPath,
          stdio: verbose ? "inherit" : "pipe",
        })

        // Checkout specified ref or default branch
        if (ref) {
          const escapedRef = escapeShellArg(ref)
          execSync(`git checkout ${escapedRef}`, {
            cwd: targetPath,
            stdio: verbose ? "inherit" : "pipe",
          })
          execSync(`git pull origin ${escapedRef}`, {
            cwd: targetPath,
            stdio: verbose ? "inherit" : "pipe",
          })
        } else {
          // Get default branch using cross-platform approach
          try {
            const defaultBranch = execSync(
              "git rev-parse --abbrev-ref origin/HEAD",
              { cwd: targetPath, encoding: "utf-8" }
            ).trim().replace(/^origin\//, "")
            
            const escapedBranch = escapeShellArg(defaultBranch)
            execSync(`git checkout ${escapedBranch}`, {
              cwd: targetPath,
              stdio: verbose ? "inherit" : "pipe",
            })
            execSync(`git pull`, {
              cwd: targetPath,
              stdio: verbose ? "inherit" : "pipe",
            })
          } catch {
            // Fallback: just pull current branch
            execSync(`git pull`, {
              cwd: targetPath,
              stdio: verbose ? "inherit" : "pipe",
            })
          }
        }
      } catch (updateError) {
        // If update fails, try removing and re-cloning
        if (verbose) {
          console.warn(`[crosstrain] Failed to update repository, re-cloning...`)
        }
        await rm(targetPath, { recursive: true, force: true })
        // Re-clone below
      }
    }

    // Clone if directory doesn't exist (or was just removed)
    if (!existsSync(targetPath)) {
      if (verbose) {
        console.log(`[crosstrain] Cloning Git repository: ${url}`)
      }

      if (ref) {
        const escapedRef = escapeShellArg(ref)
        execSync(`git clone --branch ${escapedRef} ${escapedUrl} ${escapedTargetPath}`, {
          stdio: verbose ? "inherit" : "pipe",
        })
      } else {
        execSync(`git clone ${escapedUrl} ${escapedTargetPath}`, {
          stdio: verbose ? "inherit" : "pipe",
        })
      }
    }

    return targetPath
  } catch (error) {
    throw new Error(
      `Failed to clone/update Git repository ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
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
  projectRoot: string,
  verbose: boolean = false
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

  // Handle Git sources
  if (resolved.type === "git" && resolved.url) {
    try {
      const clonedPath = await cloneOrUpdateGitRepo(resolved.url, config.ref, verbose)
      const manifest = await parseMarketplaceManifest(clonedPath)
      return { path: clonedPath, manifest }
    } catch (error) {
      console.error(
        `Failed to load Git marketplace ${config.name}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return null
    }
  }

  return null
}

/**
 * List all available plugins across all marketplaces
 */
export async function listAvailablePlugins(
  marketplaces: MarketplaceConfig[],
  projectRoot: string,
  verbose: boolean = false
): Promise<Map<string, ParsedPlugin[]>> {
  const pluginsByMarketplace = new Map<string, ParsedPlugin[]>()

  for (const marketplace of marketplaces) {
    if (marketplace.enabled === false) {
      continue
    }

    const loaded = await loadMarketplace(marketplace, projectRoot, verbose)
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
  projectRoot: string,
  verbose: boolean = false
): Promise<ParsedPlugin | null> {
  const marketplace = marketplaces.find(m => m.name === marketplaceName)

  if (!marketplace) {
    return null
  }

  const loaded = await loadMarketplace(marketplace, projectRoot, verbose)
  if (!loaded) {
    return null
  }

  const plugins = await discoverPluginsInMarketplace(loaded.path, marketplaceName)
  return plugins.find(p => p.manifest.name === pluginName) || null
}

/**
 * Clear the Git marketplace cache
 */
export async function clearGitMarketplaceCache(): Promise<void> {
  if (existsSync(GIT_CACHE_DIR)) {
    await rm(GIT_CACHE_DIR, { recursive: true, force: true })
  }
}

/**
 * Get the Git cache directory path
 */
export function getGitCacheDirectory(): string {
  return GIT_CACHE_DIR
}
