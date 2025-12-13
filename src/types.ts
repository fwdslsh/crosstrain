/**
 * Type definitions for Claude Code and OpenCode extension points
 */

// ========================================
// Plugin Configuration
// ========================================

/**
 * Crosstrain plugin configuration
 */
export interface CrosstrainConfig {
  /**
   * Enable/disable the plugin entirely
   * @default true
   */
  enabled?: boolean

  /**
   * Custom path to Claude directory (relative to project root)
   * @default ".claude"
   */
  claudeDir?: string

  /**
   * Custom path to OpenCode output directory (relative to project root)
   * @default ".opencode"
   */
  openCodeDir?: string

  /**
   * Whether to load user-level assets from ~/.claude
   * @default true
   */
  loadUserAssets?: boolean

  /**
   * Whether to load settings (marketplaces, plugins) from ~/.claude/settings.json
   * When false, only project-level .claude/settings.json is used
   * @default true
   */
  loadUserSettings?: boolean

  /**
   * Whether to watch for file changes and auto-reload
   * @default true
   */
  watch?: boolean

  /**
   * Prefix for generated files (agents, commands)
   * @default "claude_"
   */
  filePrefix?: string

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean

  /**
   * Enable/disable specific loaders
   */
  loaders?: {
    /**
     * Load Claude skills as OpenCode tools
     * @default true
     */
    skills?: boolean

    /**
     * Sync Claude agents to OpenCode agents
     * @default true
     */
    agents?: boolean

    /**
     * Sync Claude commands to OpenCode commands
     * @default true
     */
    commands?: boolean

    /**
     * Convert Claude hooks to OpenCode event handlers
     * @default true
     */
    hooks?: boolean

    /**
     * Convert Claude MCP servers to OpenCode MCP configuration
     * @default true
     */
    mcp?: boolean
  }

  /**
   * Custom model mappings (override defaults)
   * Key: Claude model alias, Value: OpenCode model path
   */
  modelMappings?: Record<string, string>

  /**
   * Custom tool mappings (override defaults)
   * Key: Claude tool name, Value: OpenCode tool name
   */
  toolMappings?: Record<string, string>

  /**
   * Marketplace configuration
   */
  marketplaces?: MarketplaceConfig[]

  /**
   * Plugin installation configuration
   */
  plugins?: PluginInstallConfig[]
}

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedCrossstrainConfig {
  enabled: boolean
  claudeDir: string
  openCodeDir: string
  loadUserAssets: boolean
  loadUserSettings: boolean
  watch: boolean
  filePrefix: string
  verbose: boolean
  loaders: {
    skills: boolean
    agents: boolean
    commands: boolean
    hooks: boolean
    mcp: boolean
  }
  modelMappings: Record<string, string>
  toolMappings: Record<string, string>
  marketplaces: MarketplaceConfig[]
  plugins: PluginInstallConfig[]
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ResolvedCrossstrainConfig = {
  enabled: true,
  claudeDir: ".claude",
  openCodeDir: ".opencode",
  loadUserAssets: true,
  loadUserSettings: true,
  watch: true,
  filePrefix: "claude_",
  verbose: false,
  loaders: {
    skills: true,
    agents: true,
    commands: true,
    hooks: true,
    mcp: true,
  },
  modelMappings: {},
  toolMappings: {},
  marketplaces: [],
  plugins: [],
}

// ========================================
// Claude Code Types
// ========================================

/**
 * Claude Code SKILL.md frontmatter
 */
export interface ClaudeSkillFrontmatter {
  name: string
  description: string
  "allowed-tools"?: string // Comma-separated tool names
}

/**
 * Parsed Claude Code Skill
 */
export interface ClaudeSkill {
  name: string
  description: string
  allowedTools?: string[]
  content: string
  filePath: string
  supportingFiles: string[]
}

/**
 * Claude Code agent markdown frontmatter
 */
export interface ClaudeAgentFrontmatter {
  name: string
  description: string
  tools?: string // Comma-separated tool names
  model?: string // Model alias: sonnet, opus, haiku, or 'inherit'
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "ignore"
  skills?: string // Comma-separated skill names
}

/**
 * Parsed Claude Code Agent
 */
export interface ClaudeAgent {
  name: string
  description: string
  tools?: string[]
  model?: string
  permissionMode?: string
  skills?: string[]
  systemPrompt: string
  filePath: string
}

/**
 * Claude Code command markdown frontmatter
 */
export interface ClaudeCommandFrontmatter {
  description?: string
}

/**
 * Parsed Claude Code Command
 */
export interface ClaudeCommand {
  name: string
  description?: string
  template: string
  filePath: string
}

/**
 * Claude Code hook configuration
 */
export interface ClaudeHook {
  type: "command"
  command: string
}

/**
 * Claude Code hook matcher configuration
 */
export interface ClaudeHookMatcher {
  matcher: string
  hooks: ClaudeHook[]
}

/**
 * Claude Code hooks configuration
 */
export interface ClaudeHooksConfig {
  PreToolUse?: ClaudeHookMatcher[]
  PostToolUse?: ClaudeHookMatcher[]
  PermissionRequest?: ClaudeHookMatcher[]
  UserPromptSubmit?: ClaudeHookMatcher[]
  Notification?: ClaudeHookMatcher[]
  Stop?: ClaudeHookMatcher[]
  SubagentStop?: ClaudeHookMatcher[]
  PreCompact?: ClaudeHookMatcher[]
  SessionStart?: ClaudeHookMatcher[]
  SessionEnd?: ClaudeHookMatcher[]
}

// ========================================
// OpenCode Types
// ========================================

/**
 * OpenCode agent frontmatter
 */
export interface OpenCodeAgentFrontmatter {
  description: string
  mode?: "primary" | "subagent" | "all"
  model?: string
  temperature?: number
  tools?: Record<string, boolean>
  permission?: {
    edit?: "ask" | "allow" | "deny"
    bash?: "ask" | "allow" | "deny" | Record<string, "ask" | "allow" | "deny">
    webfetch?: "ask" | "allow" | "deny"
  }
  maxSteps?: number
  disable?: boolean
}

/**
 * OpenCode command frontmatter
 */
export interface OpenCodeCommandFrontmatter {
  description?: string
  agent?: string
  model?: string
  subtask?: boolean
}

/**
 * OpenCode tool definition context
 */
export interface OpenCodeToolContext {
  agent: string
  sessionID: string
  messageID: string
}

// ========================================
// Mapping Configuration
// ========================================

/**
 * Model mapping from Claude Code to OpenCode
 */
export const MODEL_MAPPING: Record<string, string> = {
  sonnet: "anthropic/claude-sonnet-4-20250514",
  opus: "anthropic/claude-opus-4-20250514",
  haiku: "anthropic/claude-haiku-4-20250514",
  inherit: "", // Empty string means inherit from parent
}

/**
 * Tool name mapping from Claude Code to OpenCode
 */
export const TOOL_MAPPING: Record<string, string> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  Bash: "bash",
  Grep: "grep",
  Glob: "glob",
  WebFetch: "webfetch",
  // Add more mappings as needed
}

/**
 * Permission mode mapping from Claude Code to OpenCode
 */
export const PERMISSION_MODE_MAPPING: Record<string, Record<string, "ask" | "allow" | "deny">> = {
  default: {},
  acceptEdits: { edit: "allow" },
  bypassPermissions: { edit: "allow", bash: "allow" },
  plan: { edit: "deny", bash: "deny" },
  ignore: {},
}

/**
 * Hook event mapping from Claude Code to OpenCode
 */
export const HOOK_EVENT_MAPPING: Record<string, string> = {
  PreToolUse: "tool.execute.before",
  PostToolUse: "tool.execute.after",
  SessionStart: "session.created",
  SessionEnd: "session.idle", // Closest equivalent
  Notification: "tui.toast.show",
  Stop: "session.idle",
  SubagentStop: "session.idle",
}

// ========================================
// Claude Code Settings Types
// ========================================

/**
 * Marketplace source configuration (from Claude Code settings.json)
 * Can be GitHub, Git URL, or local directory
 */
export interface ClaudeMarketplaceSource {
  /**
   * Source type: github, git, or directory
   */
  source: "github" | "git" | "directory"

  /**
   * GitHub repository (for source: "github")
   * Format: "org/repo"
   */
  repo?: string

  /**
   * Git URL (for source: "git")
   */
  url?: string

  /**
   * Local filesystem path (for source: "directory")
   */
  path?: string
}

/**
 * Extra known marketplace entry (from Claude Code settings.json)
 */
export interface ClaudeExtraKnownMarketplace {
  source: ClaudeMarketplaceSource
}

/**
 * Claude Code settings.json structure (relevant parts)
 */
export interface ClaudeSettings {
  /**
   * Enabled plugins map
   * Format: "plugin-name@marketplace-name": true/false
   */
  enabledPlugins?: Record<string, boolean>

  /**
   * Extra known marketplaces
   * Format: "marketplace-name": { source: { ... } }
   */
  extraKnownMarketplaces?: Record<string, ClaudeExtraKnownMarketplace>

  /**
   * Hooks configuration
   */
  hooks?: ClaudeHooksConfig
}

// ========================================
// Marketplace & Plugin Installation Types
// ========================================

/**
 * Marketplace configuration
 */
export interface MarketplaceConfig {
  /**
   * Name identifier for the marketplace
   */
  name: string

  /**
   * Source of the marketplace
   * Can be:
   * - Local directory path (e.g., "./marketplaces/my-marketplace")
   * - Git repository URL (e.g., "https://github.com/org/claude-plugins")
   * - GitHub shorthand (e.g., "org/claude-plugins")
   */
  source: string

  /**
   * Optional: Git branch/tag/commit to use
   */
  ref?: string

  /**
   * Whether this marketplace is enabled
   * @default true
   */
  enabled?: boolean
}

/**
 * Plugin installation configuration
 */
export interface PluginInstallConfig {
  /**
   * Plugin name (as defined in plugin.json)
   */
  name: string

  /**
   * Marketplace name where the plugin is located
   */
  marketplace: string

  /**
   * Installation directory
   * Can be:
   * - "project" - Install to project's .claude directory
   * - "user" - Install to user's ~/.claude directory
   * - Custom path (absolute or relative to project root)
   * @default "project"
   */
  installDir?: string

  /**
   * Whether this plugin installation is enabled
   * @default true
   */
  enabled?: boolean

  /**
   * Optional: Plugin version/tag to install
   */
  version?: string
}

/**
 * Claude Code plugin manifest (.claude-plugin/plugin.json)
 */
export interface ClaudePluginManifest {
  name: string
  description?: string
  version?: string
  author?: {
    name: string
    email?: string
    url?: string
  }
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  /**
   * Plugin dependencies
   */
  dependencies?: Record<string, string>
}

/**
 * Claude Code marketplace manifest (.claude-plugin/marketplace.json)
 */
export interface ClaudeMarketplaceManifest {
  name: string
  owner?: {
    name: string
    email?: string
    url?: string
  }
  description?: string
  homepage?: string
  /**
   * List of plugins in this marketplace
   */
  plugins: MarketplacePluginEntry[]
}

/**
 * Plugin entry in a marketplace manifest
 */
export interface MarketplacePluginEntry {
  /**
   * Plugin name (must match plugin.json name)
   */
  name: string

  /**
   * Path to plugin directory relative to marketplace root
   */
  source: string

  /**
   * Plugin description (can override plugin.json)
   */
  description?: string

  /**
   * Plugin version (can override plugin.json)
   */
  version?: string

  /**
   * Plugin tags/categories
   */
  tags?: string[]
}

/**
 * Parsed plugin information
 */
export interface ParsedPlugin {
  manifest: ClaudePluginManifest
  marketplace: string
  sourcePath: string
  hasSkills: boolean
  hasAgents: boolean
  hasCommands: boolean
  hasHooks: boolean
  hasMCP: boolean
}

// ========================================
// MCP Server Types
// ========================================

/**
 * Claude Code MCP server configuration (from .mcp.json)
 */
export interface ClaudeMCPServer {
  /**
   * Command to execute (executable name/path)
   */
  command: string

  /**
   * Command-line arguments
   */
  args?: string[]

  /**
   * Environment variables
   */
  env?: Record<string, string>
}

/**
 * Claude Code .mcp.json file structure
 */
export interface ClaudeMCPConfig {
  mcpServers: Record<string, ClaudeMCPServer>
}

/**
 * OpenCode MCP server configuration (local)
 */
export interface OpenCodeMCPLocalServer {
  type: "local"
  command: string[]
  environment?: Record<string, string>
  enabled?: boolean
  timeout?: number
}

/**
 * OpenCode MCP server configuration (remote)
 */
export interface OpenCodeMCPRemoteServer {
  type: "remote"
  url: string
  headers?: Record<string, string>
  oauth?: {
    clientId?: string
    clientSecret?: string
    scope?: string
  } | false
  enabled?: boolean
  timeout?: number
}

/**
 * OpenCode MCP server (union type)
 */
export type OpenCodeMCPServer = OpenCodeMCPLocalServer | OpenCodeMCPRemoteServer

/**
 * OpenCode MCP configuration (for opencode.json)
 */
export type OpenCodeMCPConfig = Record<string, OpenCodeMCPServer>

/**
 * Discovered MCP server with metadata
 */
export interface DiscoveredMCPServer {
  name: string
  server: ClaudeMCPServer
  source: "project" | "user" | "plugin"
  sourcePath: string
}

/**
 * MCP loader options
 */
export interface MCPLoaderOptions {
  /**
   * Prefix to add to converted MCP server names
   * @default "claude_"
   */
  filePrefix?: string

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean

  /**
   * Whether to enable converted servers by default
   * @default true
   */
  enableByDefault?: boolean
}
