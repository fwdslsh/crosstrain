/**
 * Command Loader - Converts Claude Code Commands to OpenCode Commands
 *
 * Claude Code Commands (Slash Commands) are markdown files with
 * YAML frontmatter stored in .claude/commands/. They are user-invoked
 * prompts triggered by /command-name.
 *
 * OpenCode Commands are similarly structured markdown files stored
 * in .opencode/command/ with slightly different frontmatter.
 *
 * Mapping strategy:
 * - Claude `description` → OpenCode `description`
 * - Claude template content → OpenCode template content (mostly compatible)
 * - Both support $ARGUMENTS and positional params ($1, $2, etc.)
 * - Both support file references (@filepath)
 * - Both support shell output injection (!`command`)
 */

import { join } from "path"
import { existsSync } from "fs"
import { writeFile, mkdir } from "fs/promises"
import type {
  ClaudeCommand,
  ClaudeCommandFrontmatter,
  OpenCodeCommandFrontmatter,
} from "../types"
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
  readTextFile,
  getMarkdownFiles,
  extractNameFromPath,
} from "../utils/parser"

/**
 * Discover all Claude Code commands
 */
export async function discoverCommands(
  claudeDir: string,
  homeDir: string
): Promise<ClaudeCommand[]> {
  const commands: ClaudeCommand[] = []

  // Check project-level commands (.claude/commands/)
  const projectCommandsDir = join(claudeDir, "commands")
  if (existsSync(projectCommandsDir)) {
    const projectCommands = await loadCommandsFromDirectory(projectCommandsDir)
    commands.push(...projectCommands)
  }

  // Check user-level commands (~/.claude/commands/)
  const userCommandsDir = join(homeDir, ".claude", "commands")
  if (existsSync(userCommandsDir)) {
    const userCommands = await loadCommandsFromDirectory(userCommandsDir)
    // Only add user commands that don't conflict with project commands
    for (const command of userCommands) {
      if (!commands.find((c) => c.name === command.name)) {
        commands.push(command)
      }
    }
  }

  return commands
}

/**
 * Load all commands from a directory
 */
async function loadCommandsFromDirectory(
  commandsDir: string
): Promise<ClaudeCommand[]> {
  const commands: ClaudeCommand[] = []
  const commandFiles = await getMarkdownFiles(commandsDir)

  for (const filePath of commandFiles) {
    const command = await loadCommand(filePath)
    if (command) {
      commands.push(command)
    }
  }

  return commands
}

/**
 * Load a single command from a file
 */
async function loadCommand(filePath: string): Promise<ClaudeCommand | null> {
  try {
    const content = await readTextFile(filePath)
    const parsed = parseMarkdownWithFrontmatter<ClaudeCommandFrontmatter>(content)

    const name = extractNameFromPath(filePath)

    return {
      name,
      description: parsed.frontmatter.description,
      template: parsed.content,
      filePath,
    }
  } catch (error) {
    console.error(`Error loading command from ${filePath}:`, error)
    return null
  }
}

/**
 * Convert a Claude command to OpenCode command frontmatter
 */
export function convertCommandFrontmatter(
  command: ClaudeCommand
): OpenCodeCommandFrontmatter {
  const frontmatter: OpenCodeCommandFrontmatter = {}

  if (command.description) {
    frontmatter.description = command.description
  } else {
    frontmatter.description = `Claude Code command: ${command.name}`
  }

  // Default to build agent for commands that might make changes
  frontmatter.agent = "build"

  return frontmatter
}

/**
 * Convert Claude command template syntax to OpenCode format
 *
 * Both systems are largely compatible, but we handle edge cases:
 * - Both use $ARGUMENTS and $1, $2, etc.
 * - Both use @filepath for file references
 * - Both use !`command` for shell output
 */
export function convertCommandTemplate(template: string): string {
  // The syntax is largely compatible between Claude Code and OpenCode
  // No major transformations needed at this time

  // Add source attribution as a comment that won't affect the prompt
  return template
}

/**
 * Generate OpenCode command markdown content
 */
export function generateOpenCodeCommand(command: ClaudeCommand): string {
  const frontmatter = convertCommandFrontmatter(command)
  let template = convertCommandTemplate(command.template)

  // Add source attribution
  template += `\n\n---\n*[Loaded from Claude Code: ${command.filePath}]*`

  return serializeMarkdownWithFrontmatter(frontmatter, template)
}

/**
 * Options for writing commands
 */
export interface WriteCommandsOptions {
  /** Prefix for generated files (default: "claude_") */
  filePrefix?: string
  /** Whether to log output */
  verbose?: boolean
}

/**
 * Write converted commands to OpenCode directory
 */
export async function writeOpenCodeCommands(
  commands: ClaudeCommand[],
  openCodeDir: string,
  options?: WriteCommandsOptions
): Promise<void> {
  const commandsDir = join(openCodeDir, "command")
  const prefix = options?.filePrefix ?? "claude_"
  const verbose = options?.verbose ?? true

  // Ensure the directory exists
  await mkdir(commandsDir, { recursive: true })

  for (const command of commands) {
    const commandContent = generateOpenCodeCommand(command)
    const fileName = `${prefix}${command.name}.md`
    const filePath = join(commandsDir, fileName)

    await writeFile(filePath, commandContent, "utf-8")
    if (verbose) {
      console.log(`[crosstrain] Wrote OpenCode command: ${filePath}`)
    }
  }
}

/**
 * Load and convert all Claude commands to OpenCode format
 */
export async function syncCommandsToOpenCode(
  claudeDir: string,
  homeDir: string,
  openCodeDir: string,
  options?: WriteCommandsOptions
): Promise<ClaudeCommand[]> {
  const commands = await discoverCommands(claudeDir, homeDir)
  await writeOpenCodeCommands(commands, openCodeDir, options)
  return commands
}

/**
 * Get paths to watch for command changes
 */
export function getCommandWatchPaths(
  claudeDir: string,
  homeDir: string
): string[] {
  const paths: string[] = []

  const projectCommandsDir = join(claudeDir, "commands")
  if (existsSync(projectCommandsDir)) {
    paths.push(projectCommandsDir)
  }

  const userCommandsDir = join(homeDir, ".claude", "commands")
  if (existsSync(userCommandsDir)) {
    paths.push(userCommandsDir)
  }

  return paths
}
