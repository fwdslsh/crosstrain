/**
 * Skill Loader - Converts Claude Code Skills to OpenCode Custom Tools
 *
 * Claude Code Skills are directories containing SKILL.md files with
 * YAML frontmatter and markdown instructions. They are model-invoked
 * capabilities that Claude autonomously uses.
 *
 * OpenCode Custom Tools are TypeScript/JavaScript functions that the
 * LLM can call during conversations, defined using the tool() helper.
 *
 * Mapping strategy:
 * - Each Claude Skill becomes an OpenCode tool
 * - The skill's description becomes the tool description
 * - The skill's instructions are passed to the LLM when the tool is invoked
 * - Supporting files are read on demand
 */

import { join } from "path"
import { existsSync } from "fs"
import { readdir } from "fs/promises"
import type { ClaudeSkill, ClaudeSkillFrontmatter } from "../types"
import { tool, toolSchema } from "../plugin-types"
import {
  parseMarkdownWithFrontmatter,
  readTextFile,
  getDirectories,
  parseCommaSeparated,
  extractNameFromPath,
} from "../utils/parser"

/**
 * Discover all Claude Code skills in a directory
 */
export async function discoverSkills(
  claudeDir: string,
  homeDir: string
): Promise<ClaudeSkill[]> {
  const skills: ClaudeSkill[] = []

  // Check project-level skills (.claude/skills/)
  const projectSkillsDir = join(claudeDir, "skills")
  if (existsSync(projectSkillsDir)) {
    const projectSkills = await loadSkillsFromDirectory(projectSkillsDir)
    skills.push(...projectSkills)
  }

  // Check user-level skills (~/.claude/skills/)
  const userSkillsDir = join(homeDir, ".claude", "skills")
  if (existsSync(userSkillsDir)) {
    const userSkills = await loadSkillsFromDirectory(userSkillsDir)
    // Only add user skills that don't conflict with project skills
    for (const skill of userSkills) {
      if (!skills.find((s) => s.name === skill.name)) {
        skills.push(skill)
      }
    }
  }

  return skills
}

/**
 * Load all skills from a directory
 */
async function loadSkillsFromDirectory(skillsDir: string): Promise<ClaudeSkill[]> {
  const skills: ClaudeSkill[] = []
  const skillDirs = await getDirectories(skillsDir)

  for (const skillDir of skillDirs) {
    const skill = await loadSkill(skillDir)
    if (skill) {
      skills.push(skill)
    }
  }

  return skills
}

/**
 * Load a single skill from its directory
 */
async function loadSkill(skillDir: string): Promise<ClaudeSkill | null> {
  const skillMdPath = join(skillDir, "SKILL.md")

  if (!existsSync(skillMdPath)) {
    console.warn(`No SKILL.md found in ${skillDir}`)
    return null
  }

  try {
    const content = await readTextFile(skillMdPath)
    const parsed = parseMarkdownWithFrontmatter<ClaudeSkillFrontmatter>(content)

    const name =
      parsed.frontmatter.name || extractNameFromPath(skillDir)

    // Validate required fields
    if (!parsed.frontmatter.description) {
      console.warn(`Skill ${name} is missing a description`)
    }

    // Get supporting files
    const supportingFiles = await getSupportingFiles(skillDir)

    return {
      name,
      description: parsed.frontmatter.description || `Claude Code skill: ${name}`,
      allowedTools: parseCommaSeparated(parsed.frontmatter["allowed-tools"]),
      content: parsed.content,
      filePath: skillMdPath,
      supportingFiles,
    }
  } catch (error) {
    console.error(`Error loading skill from ${skillDir}:`, error)
    return null
  }
}

/**
 * Get all supporting files in a skill directory
 */
async function getSupportingFiles(skillDir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(skillDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isFile() && entry.name !== "SKILL.md") {
      files.push(join(skillDir, entry.name))
    } else if (entry.isDirectory()) {
      // Include subdirectory files recursively
      const subEntries = await readdir(join(skillDir, entry.name), {
        withFileTypes: true,
      })
      for (const subEntry of subEntries) {
        if (subEntry.isFile()) {
          files.push(join(skillDir, entry.name, subEntry.name))
        }
      }
    }
  }

  return files
}

/**
 * Convert a Claude Skill to an OpenCode tool definition
 */
export function convertSkillToTool(skill: ClaudeSkill): ReturnType<typeof tool> {
  return tool({
    description: buildToolDescription(skill),
    args: {
      // Skills typically don't take arguments, but we allow a query
      query: toolSchema.string().optional().describe("Optional specific question or task for this skill"),
    },
    async execute(args: { query?: string }, ctx) {
      // Build the skill response including the instructions
      let response = `## Skill: ${skill.name}\n\n`
      response += `### Instructions\n\n${skill.content}\n\n`

      if (args.query) {
        response += `### Query: ${args.query}\n\n`
      }

      // Include information about supporting files
      if (skill.supportingFiles.length > 0) {
        response += `### Supporting Files Available\n\n`
        for (const file of skill.supportingFiles) {
          const relativePath = file.replace(skill.filePath.replace("/SKILL.md", ""), "")
          response += `- ${relativePath}\n`
        }
        response += `\nUse the read tool to access these files if needed.\n`
      }

      return response
    },
  })
}

/**
 * Build a rich description for the tool including when to use it
 */
function buildToolDescription(skill: ClaudeSkill): string {
  let description = skill.description

  // Add information about allowed tools if restricted
  if (skill.allowedTools && skill.allowedTools.length > 0) {
    description += ` (Restricted tools: ${skill.allowedTools.join(", ")})`
  }

  return description
}

/**
 * Create a tool map from discovered skills
 */
export async function createToolsFromSkills(
  claudeDir: string,
  homeDir: string
): Promise<Record<string, ReturnType<typeof tool>>> {
  const skills = await discoverSkills(claudeDir, homeDir)
  const tools: Record<string, ReturnType<typeof tool>> = {}

  for (const skill of skills) {
    // Convert skill name to valid tool name (lowercase, underscores)
    const toolName = `skill_${skill.name.toLowerCase().replace(/-/g, "_")}`
    tools[toolName] = convertSkillToTool(skill)
    console.log(`[crosstrain] Loaded skill as tool: ${toolName}`)
  }

  return tools
}

/**
 * Watch for skill changes and reload
 */
export function getSkillWatchPaths(claudeDir: string, homeDir: string): string[] {
  const paths: string[] = []

  const projectSkillsDir = join(claudeDir, "skills")
  if (existsSync(projectSkillsDir)) {
    paths.push(projectSkillsDir)
  }

  const userSkillsDir = join(homeDir, ".claude", "skills")
  if (existsSync(userSkillsDir)) {
    paths.push(userSkillsDir)
  }

  return paths
}
