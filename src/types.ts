/**
 * Type definitions for Claude Code and OpenCode extension points
 */

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
