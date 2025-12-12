/**
 * Type definitions for @opencode-ai/plugin
 *
 * These types allow the plugin to be developed and tested without
 * the actual @opencode-ai/plugin package. When installed in an
 * OpenCode environment, the real package will be used.
 */

/**
 * Plugin context passed to plugin functions
 */
export interface PluginContext {
  project: {
    name?: string
    path: string
  }
  directory: string
  worktree: string
  client: unknown
  $: unknown
}

/**
 * Plugin return type
 */
export interface PluginReturn {
  tool?: Record<string, ToolDefinition>
  "tool.execute.before"?: (input: unknown, output: unknown) => Promise<void>
  "tool.execute.after"?: (input: unknown, output: unknown) => Promise<void>
  event?: (params: { event: unknown }) => Promise<void>
}

/**
 * Plugin function type
 */
export type Plugin = (context: PluginContext) => Promise<PluginReturn>

/**
 * Generic schema type for tool arguments
 */
export interface SchemaType {
  parse?: (value: unknown) => unknown
  optional?: () => SchemaType
  describe?: (desc: string) => SchemaType
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  description: string
  args: Record<string, SchemaType | unknown>
  execute: (
    args: Record<string, unknown>,
    context: ToolContext
  ) => Promise<string | unknown>
}

/**
 * Tool execution context
 */
export interface ToolContext {
  agent: string
  sessionID: string
  messageID: string
}

/**
 * Simple schema helpers that mimic Zod API
 */
function createSchema(): SchemaType & {
  string: () => SchemaType
  number: () => SchemaType
  boolean: () => SchemaType
  optional: () => SchemaType
  describe: (desc: string) => SchemaType
} {
  const schema: SchemaType & {
    string: () => typeof schema
    number: () => typeof schema
    boolean: () => typeof schema
    optional: () => typeof schema
    describe: (desc: string) => typeof schema
  } = {
    parse: (v) => v,
    optional: () => schema,
    describe: (_desc) => schema,
    string: () => schema,
    number: () => schema,
    boolean: () => schema,
  }
  return schema
}

/**
 * Tool schema helper
 */
export const toolSchema = {
  string: () => createSchema(),
  number: () => createSchema(),
  boolean: () => createSchema(),
  object: (shape: Record<string, unknown>) => ({ ...createSchema(), shape }),
  array: (itemSchema: unknown) => ({ ...createSchema(), items: itemSchema }),
}

/**
 * Tool definition helper
 */
export function tool(definition: {
  description: string
  args: Record<string, SchemaType | unknown>
  execute: (
    args: Record<string, unknown>,
    context: ToolContext
  ) => Promise<string | unknown>
}): ToolDefinition {
  return definition
}

// Attach schema to tool for convenience
tool.schema = toolSchema
