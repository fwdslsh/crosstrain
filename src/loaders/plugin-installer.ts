/**
 * Plugin Installer
 *
 * Handles installation of Claude Code plugins from marketplaces to specified directories.
 * Supports flexible installation targets: project, user, or custom paths.
 */

import { join, resolve, isAbsolute, dirname } from "path"
import { existsSync } from "fs"
import { mkdir, cp, readdir, stat, rm } from "fs/promises"
import { homedir } from "os"
import type {
  PluginInstallConfig,
  MarketplaceConfig,
  ParsedPlugin,
} from "../types"
import { findPlugin } from "./marketplace"

/**
 * Resolve installation directory
 */
export function resolveInstallDir(
  installDir: string | undefined,
  projectRoot: string
): string {
  // Default to project
  if (!installDir || installDir === "project") {
    return join(projectRoot, ".claude")
  }

  // User directory
  if (installDir === "user") {
    return join(homedir(), ".claude")
  }

  // Custom path
  if (isAbsolute(installDir)) {
    return installDir
  }

  // Relative to project root
  return resolve(projectRoot, installDir)
}

/**
 * Check if a plugin is already installed
 */
export async function isPluginInstalled(
  pluginName: string,
  installDir: string
): Promise<boolean> {
  const pluginPath = join(installDir, "plugins", pluginName)
  return existsSync(pluginPath)
}

/**
 * Install a plugin from marketplace to target directory
 */
export async function installPlugin(
  plugin: ParsedPlugin,
  installDir: string,
  options: {
    force?: boolean
    verbose?: boolean
  } = {}
): Promise<{ success: boolean; message: string; installedPath?: string }> {
  const { force = false, verbose = false } = options

  try {
    // Ensure install directory exists
    const pluginsDir = join(installDir, "plugins")
    await mkdir(pluginsDir, { recursive: true })

    const targetPath = join(pluginsDir, plugin.manifest.name)

    // Check if already installed
    if (existsSync(targetPath) && !force) {
      return {
        success: false,
        message: `Plugin ${plugin.manifest.name} is already installed at ${targetPath}. Use force option to overwrite.`,
      }
    }

    // Remove existing installation if force is enabled
    if (existsSync(targetPath) && force) {
      if (verbose) {
        console.log(`Removing existing installation at ${targetPath}`)
      }
      await rm(targetPath, { recursive: true, force: true })
    }

    // Copy plugin files
    if (verbose) {
      console.log(`Copying plugin from ${plugin.sourcePath} to ${targetPath}`)
    }

    await cp(plugin.sourcePath, targetPath, {
      recursive: true,
      errorOnExist: false,
      force: true,
    })

    // Verify installation
    if (!existsSync(join(targetPath, ".claude-plugin", "plugin.json"))) {
      return {
        success: false,
        message: `Installation verification failed: plugin.json not found after copy`,
      }
    }

    return {
      success: true,
      message: `Successfully installed ${plugin.manifest.name} to ${targetPath}`,
      installedPath: targetPath,
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to install plugin: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Uninstall a plugin
 */
export async function uninstallPlugin(
  pluginName: string,
  installDir: string,
  options: {
    verbose?: boolean
  } = {}
): Promise<{ success: boolean; message: string }> {
  const { verbose = false } = options

  try {
    const pluginPath = join(installDir, "plugins", pluginName)

    if (!existsSync(pluginPath)) {
      return {
        success: false,
        message: `Plugin ${pluginName} is not installed at ${installDir}`,
      }
    }

    if (verbose) {
      console.log(`Removing plugin from ${pluginPath}`)
    }

    await rm(pluginPath, { recursive: true, force: true })

    return {
      success: true,
      message: `Successfully uninstalled ${pluginName} from ${installDir}`,
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to uninstall plugin: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Install plugins based on configuration
 */
export async function installConfiguredPlugins(
  pluginConfigs: PluginInstallConfig[],
  marketplaces: MarketplaceConfig[],
  projectRoot: string,
  options: {
    force?: boolean
    verbose?: boolean
  } = {}
): Promise<{
  installed: string[]
  failed: Array<{ plugin: string; reason: string }>
  skipped: string[]
}> {
  const { force = false, verbose = false } = options

  const results = {
    installed: [] as string[],
    failed: [] as Array<{ plugin: string; reason: string }>,
    skipped: [] as string[],
  }

  for (const pluginConfig of pluginConfigs) {
    // Skip disabled plugins
    if (pluginConfig.enabled === false) {
      results.skipped.push(pluginConfig.name)
      if (verbose) {
        console.log(`Skipping disabled plugin: ${pluginConfig.name}`)
      }
      continue
    }

    try {
      // Find the plugin in marketplace
      const plugin = await findPlugin(
        pluginConfig.name,
        pluginConfig.marketplace,
        marketplaces,
        projectRoot
      )

      if (!plugin) {
        results.failed.push({
          plugin: pluginConfig.name,
          reason: `Plugin not found in marketplace ${pluginConfig.marketplace}`,
        })
        continue
      }

      // Resolve installation directory
      const installDir = resolveInstallDir(pluginConfig.installDir, projectRoot)

      // Install the plugin
      const result = await installPlugin(plugin, installDir, { force, verbose })

      if (result.success) {
        results.installed.push(pluginConfig.name)
        if (verbose) {
          console.log(result.message)
        }
      } else {
        results.failed.push({
          plugin: pluginConfig.name,
          reason: result.message,
        })
      }
    } catch (error) {
      results.failed.push({
        plugin: pluginConfig.name,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}

/**
 * List installed plugins in a directory
 */
export async function listInstalledPlugins(
  installDir: string
): Promise<string[]> {
  const pluginsDir = join(installDir, "plugins")

  if (!existsSync(pluginsDir)) {
    return []
  }

  try {
    const entries = await readdir(pluginsDir)
    const plugins: string[] = []

    for (const entry of entries) {
      const pluginPath = join(pluginsDir, entry)
      const stats = await stat(pluginPath)

      if (stats.isDirectory()) {
        // Verify it's a valid plugin
        const manifestPath = join(pluginPath, ".claude-plugin", "plugin.json")
        if (existsSync(manifestPath)) {
          plugins.push(entry)
        }
      }
    }

    return plugins
  } catch (error) {
    console.error(`Failed to list plugins in ${pluginsDir}:`, error)
    return []
  }
}

/**
 * Get installation status for configured plugins
 */
export async function getPluginInstallStatus(
  pluginConfigs: PluginInstallConfig[],
  projectRoot: string
): Promise<Map<string, { installed: boolean; location?: string }>> {
  const status = new Map<string, { installed: boolean; location?: string }>()

  for (const pluginConfig of pluginConfigs) {
    const installDir = resolveInstallDir(pluginConfig.installDir, projectRoot)
    const installed = await isPluginInstalled(pluginConfig.name, installDir)

    status.set(pluginConfig.name, {
      installed,
      location: installed ? join(installDir, "plugins", pluginConfig.name) : undefined,
    })
  }

  return status
}
