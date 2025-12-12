/**
 * Agent Loader - Converts Claude Code Agents to OpenCode Agents
 *
 * Claude Code Agents (Subagents) are specialized AI assistants stored as
 * markdown files with YAML frontmatter in .claude/agents/.
 *
 * OpenCode Agents are similarly structured but with different frontmatter
 * fields, stored in .opencode/agent/.
 *
 * Mapping strategy:
 * - Claude `name` → OpenCode filename (already matches)
 * - Claude `description` → OpenCode `description`
 * - Claude `tools` (comma-separated) → OpenCode `tools` (object with boolean values)
 * - Claude `model` (alias) → OpenCode `model` (full model path)
 * - Claude `permissionMode` → OpenCode `permission` object
 * - Claude system prompt → OpenCode system prompt
 * - All Claude subagents become OpenCode subagents (mode: subagent)
 */

import { join } from "path"
import { existsSync } from "fs"
import { writeFile, mkdir } from "fs/promises"
import type {
  ClaudeAgent,
  ClaudeAgentFrontmatter,
  OpenCodeAgentFrontmatter,
} from "../types"
import { MODEL_MAPPING, TOOL_MAPPING, PERMISSION_MODE_MAPPING } from "../types"
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
  readTextFile,
  getMarkdownFiles,
  extractNameFromPath,
  parseCommaSeparated,
} from "../utils/parser"

/**
 * Discover all Claude Code agents
 */
export async function discoverAgents(
  claudeDir: string,
  homeDir: string
): Promise<ClaudeAgent[]> {
  const agents: ClaudeAgent[] = []

  // Check project-level agents (.claude/agents/)
  const projectAgentsDir = join(claudeDir, "agents")
  if (existsSync(projectAgentsDir)) {
    const projectAgents = await loadAgentsFromDirectory(projectAgentsDir)
    agents.push(...projectAgents)
  }

  // Check user-level agents (~/.claude/agents/)
  const userAgentsDir = join(homeDir, ".claude", "agents")
  if (existsSync(userAgentsDir)) {
    const userAgents = await loadAgentsFromDirectory(userAgentsDir)
    // Only add user agents that don't conflict with project agents
    for (const agent of userAgents) {
      if (!agents.find((a) => a.name === agent.name)) {
        agents.push(agent)
      }
    }
  }

  return agents
}

/**
 * Load all agents from a directory
 */
async function loadAgentsFromDirectory(agentsDir: string): Promise<ClaudeAgent[]> {
  const agents: ClaudeAgent[] = []
  const agentFiles = await getMarkdownFiles(agentsDir)

  for (const filePath of agentFiles) {
    const agent = await loadAgent(filePath)
    if (agent) {
      agents.push(agent)
    }
  }

  return agents
}

/**
 * Load a single agent from a file
 */
async function loadAgent(filePath: string): Promise<ClaudeAgent | null> {
  try {
    const content = await readTextFile(filePath)
    const parsed = parseMarkdownWithFrontmatter<ClaudeAgentFrontmatter>(content)

    const name = parsed.frontmatter.name || extractNameFromPath(filePath)

    return {
      name,
      description: parsed.frontmatter.description || `Claude Code agent: ${name}`,
      tools: parseCommaSeparated(parsed.frontmatter.tools),
      model: parsed.frontmatter.model,
      permissionMode: parsed.frontmatter.permissionMode,
      skills: parseCommaSeparated(parsed.frontmatter.skills),
      systemPrompt: parsed.content,
      filePath,
    }
  } catch (error) {
    console.error(`Error loading agent from ${filePath}:`, error)
    return null
  }
}

/**
 * Convert a Claude agent to OpenCode agent frontmatter
 */
export function convertAgentFrontmatter(
  agent: ClaudeAgent
): OpenCodeAgentFrontmatter {
  const frontmatter: OpenCodeAgentFrontmatter = {
    description: agent.description,
    mode: "subagent", // Claude subagents become OpenCode subagents
  }

  // Map model alias to full model path
  if (agent.model) {
    const mappedModel = MODEL_MAPPING[agent.model.toLowerCase()]
    if (mappedModel !== undefined) {
      // Empty string means inherit, so we don't set the model
      if (mappedModel !== "") {
        frontmatter.model = mappedModel
      }
    } else {
      // Assume it's already a full model path
      frontmatter.model = agent.model
    }
  }

  // Map tools from comma-separated to object
  if (agent.tools && agent.tools.length > 0) {
    frontmatter.tools = {}
    for (const tool of agent.tools) {
      // Map Claude tool names to OpenCode tool names
      const mappedTool = TOOL_MAPPING[tool] || tool.toLowerCase()
      frontmatter.tools[mappedTool] = true
    }
    // Disable tools that are not explicitly listed
    // This mimics Claude's behavior where listing tools restricts to only those
    const allTools = ["read", "write", "edit", "bash", "grep", "glob", "webfetch"]
    for (const tool of allTools) {
      if (!(tool in frontmatter.tools)) {
        frontmatter.tools[tool] = false
      }
    }
  }

  // Map permission mode
  if (agent.permissionMode) {
    const mappedPermissions = PERMISSION_MODE_MAPPING[agent.permissionMode]
    if (mappedPermissions && Object.keys(mappedPermissions).length > 0) {
      frontmatter.permission = mappedPermissions
    }
  }

  return frontmatter
}

/**
 * Generate OpenCode agent markdown content
 */
export function generateOpenCodeAgent(agent: ClaudeAgent): string {
  const frontmatter = convertAgentFrontmatter(agent)

  // Add a note about the source
  let systemPrompt = agent.systemPrompt

  // If the agent has skills, add instructions to use them
  if (agent.skills && agent.skills.length > 0) {
    systemPrompt += `\n\n## Available Skills\n\n`
    systemPrompt += `This agent has access to the following skills (tools):\n`
    for (const skill of agent.skills) {
      const toolName = `skill_${skill.toLowerCase().replace(/-/g, "_")}`
      systemPrompt += `- \`${toolName}\`: Use when relevant to invoke the ${skill} skill\n`
    }
  }

  // Add source attribution
  systemPrompt += `\n\n---\n*[Loaded from Claude Code: ${agent.filePath}]*`

  return serializeMarkdownWithFrontmatter(frontmatter, systemPrompt)
}

/**
 * Write converted agents to OpenCode directory
 */
export async function writeOpenCodeAgents(
  agents: ClaudeAgent[],
  openCodeDir: string
): Promise<void> {
  const agentsDir = join(openCodeDir, "agent")

  // Ensure the directory exists
  await mkdir(agentsDir, { recursive: true })

  for (const agent of agents) {
    const agentContent = generateOpenCodeAgent(agent)
    // Prefix with 'claude_' to distinguish from native OpenCode agents
    const fileName = `claude_${agent.name}.md`
    const filePath = join(agentsDir, fileName)

    await writeFile(filePath, agentContent, "utf-8")
    console.log(`[crosstrain] Wrote OpenCode agent: ${filePath}`)
  }
}

/**
 * Load and convert all Claude agents to OpenCode format
 */
export async function syncAgentsToOpenCode(
  claudeDir: string,
  homeDir: string,
  openCodeDir: string
): Promise<ClaudeAgent[]> {
  const agents = await discoverAgents(claudeDir, homeDir)
  await writeOpenCodeAgents(agents, openCodeDir)
  return agents
}

/**
 * Get paths to watch for agent changes
 */
export function getAgentWatchPaths(claudeDir: string, homeDir: string): string[] {
  const paths: string[] = []

  const projectAgentsDir = join(claudeDir, "agents")
  if (existsSync(projectAgentsDir)) {
    paths.push(projectAgentsDir)
  }

  const userAgentsDir = join(homeDir, ".claude", "agents")
  if (existsSync(userAgentsDir)) {
    paths.push(userAgentsDir)
  }

  return paths
}
