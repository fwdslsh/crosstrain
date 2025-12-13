/**
 * Crosstrain - OpenCode Plugin Entry Point
 *
 * This file serves as the root entry point for the OpenCode plugin.
 * OpenCode looks for plugins in .opencode/plugin/ directories and expects
 * exports at the root level.
 *
 * Re-exports the main plugin from src/index.ts
 */

export {
  CrosstrainPlugin,
  createCrossstrainPlugin,
  crosstrainInfoTool,
} from "./src/index"

// Re-export types for consumers
export type {
  CrosstrainConfig,
  ResolvedCrossstrainConfig,
  ClaudeSkill,
  ClaudeAgent,
  ClaudeCommand,
  ClaudeSettings,
  MarketplaceConfig,
  PluginInstallConfig,
} from "./src/types"

// Re-export utilities
export {
  loadConfig,
  resolveConfig,
  validateConfig,
  createLogger,
  getSettingsPath,
} from "./src/utils/config"

export {
  loadClaudeSettings,
  loadMarketplaceAndPluginSettings,
} from "./src/utils/settings"

// Default export for simpler imports
export { default } from "./src/index"
