/**
 * Test Utilities - Helpers for testing the crosstrain plugin
 *
 * Provides:
 * - Fixture management for temporary test directories
 * - Helper functions to create test assets
 * - Cleanup utilities
 */

import { join } from "path"
import { existsSync } from "fs"
import { mkdir, rm, writeFile, cp, readdir } from "fs/promises"

/**
 * Path to the fixtures directory
 */
export const FIXTURES_DIR = join(__dirname, "fixtures")

/**
 * Create a temporary test directory with optional fixture copying
 */
export async function createTestDirectory(
  testName: string,
  options?: {
    copySkills?: boolean
    copyAgents?: boolean
    copyCommands?: boolean
    copySettings?: boolean
  }
): Promise<TestDirectory> {
  const testDir = join(process.cwd(), `.test-${testName}-${Date.now()}`)
  const claudeDir = join(testDir, ".claude")
  const openCodeDir = join(testDir, ".opencode")

  // Create base directories
  await mkdir(claudeDir, { recursive: true })
  await mkdir(openCodeDir, { recursive: true })

  // Copy fixtures if requested
  if (options?.copySkills) {
    await copyFixtures("skills", join(claudeDir, "skills"))
  }
  if (options?.copyAgents) {
    await copyFixtures("agents", join(claudeDir, "agents"))
  }
  if (options?.copyCommands) {
    await copyFixtures("commands", join(claudeDir, "commands"))
  }
  if (options?.copySettings) {
    const settingsFixture = join(FIXTURES_DIR, "settings", "settings.json")
    if (existsSync(settingsFixture)) {
      await cp(settingsFixture, join(claudeDir, "settings.json"))
    }
  }

  return new TestDirectory(testDir, claudeDir, openCodeDir)
}

/**
 * Copy fixtures from the fixtures directory to a target
 */
async function copyFixtures(fixtureType: string, targetDir: string): Promise<void> {
  const sourceDir = join(FIXTURES_DIR, fixtureType)

  if (!existsSync(sourceDir)) {
    console.warn(`Fixtures directory not found: ${sourceDir}`)
    return
  }

  await mkdir(targetDir, { recursive: true })
  await cp(sourceDir, targetDir, { recursive: true })
}

/**
 * Manages a temporary test directory
 */
export class TestDirectory {
  constructor(
    public readonly root: string,
    public readonly claudeDir: string,
    public readonly openCodeDir: string
  ) {}

  /**
   * Create a skill in the test directory
   */
  async createSkill(name: string, content: {
    description: string
    allowedTools?: string[]
    instructions: string
  }): Promise<string> {
    const skillDir = join(this.claudeDir, "skills", name)
    await mkdir(skillDir, { recursive: true })

    let frontmatter = `---\nname: ${name}\ndescription: ${content.description}\n`
    if (content.allowedTools?.length) {
      frontmatter += `allowed-tools: ${content.allowedTools.join(", ")}\n`
    }
    frontmatter += `---\n\n${content.instructions}`

    const filePath = join(skillDir, "SKILL.md")
    await writeFile(filePath, frontmatter, "utf-8")
    return filePath
  }

  /**
   * Create an agent in the test directory
   */
  async createAgent(name: string, content: {
    description: string
    tools?: string[]
    model?: string
    permissionMode?: string
    skills?: string[]
    systemPrompt: string
  }): Promise<string> {
    const agentsDir = join(this.claudeDir, "agents")
    await mkdir(agentsDir, { recursive: true })

    let frontmatter = `---\nname: ${name}\ndescription: ${content.description}\n`
    if (content.tools?.length) {
      frontmatter += `tools: ${content.tools.join(", ")}\n`
    }
    if (content.model) {
      frontmatter += `model: ${content.model}\n`
    }
    if (content.permissionMode) {
      frontmatter += `permissionMode: ${content.permissionMode}\n`
    }
    if (content.skills?.length) {
      frontmatter += `skills: ${content.skills.join(", ")}\n`
    }
    frontmatter += `---\n\n${content.systemPrompt}`

    const filePath = join(agentsDir, `${name}.md`)
    await writeFile(filePath, frontmatter, "utf-8")
    return filePath
  }

  /**
   * Create a command in the test directory
   */
  async createCommand(name: string, content: {
    description?: string
    template: string
  }): Promise<string> {
    const commandsDir = join(this.claudeDir, "commands")
    await mkdir(commandsDir, { recursive: true })

    let frontmatter = `---\n`
    if (content.description) {
      frontmatter += `description: ${content.description}\n`
    }
    frontmatter += `---\n\n${content.template}`

    const filePath = join(commandsDir, `${name}.md`)
    await writeFile(filePath, frontmatter, "utf-8")
    return filePath
  }

  /**
   * Create settings.json with hooks configuration
   */
  async createSettings(hooks: Record<string, any>): Promise<string> {
    const settingsPath = join(this.claudeDir, "settings.json")
    await writeFile(settingsPath, JSON.stringify({ hooks }, null, 2), "utf-8")
    return settingsPath
  }

  /**
   * Create a .mcp.json file in the project root
   */
  async createMCPConfig(servers: Record<string, {
    command: string
    args?: string[]
    env?: Record<string, string>
  }>): Promise<string> {
    const mcpPath = join(this.root, ".mcp.json")
    await writeFile(mcpPath, JSON.stringify({ mcpServers: servers }, null, 2), "utf-8")
    return mcpPath
  }

  /**
   * Create a .mcp.json file in a plugin directory
   */
  async createPluginMCPConfig(pluginName: string, servers: Record<string, {
    command: string
    args?: string[]
    env?: Record<string, string>
  }>): Promise<string> {
    const pluginDir = join(this.claudeDir, "plugins", pluginName)
    await mkdir(pluginDir, { recursive: true })
    const mcpPath = join(pluginDir, ".mcp.json")
    await writeFile(mcpPath, JSON.stringify({ mcpServers: servers }, null, 2), "utf-8")
    return mcpPath
  }

  /**
   * Get paths to generated OpenCode files
   */
  async getGeneratedFiles(): Promise<{
    agents: string[]
    commands: string[]
    tools: string[]
  }> {
    const result = { agents: [], commands: [], tools: [] } as {
      agents: string[]
      commands: string[]
      tools: string[]
    }

    const agentsDir = join(this.openCodeDir, "agent")
    if (existsSync(agentsDir)) {
      const files = await readdir(agentsDir)
      result.agents = files.filter(f => f.endsWith(".md"))
    }

    const commandsDir = join(this.openCodeDir, "command")
    if (existsSync(commandsDir)) {
      const files = await readdir(commandsDir)
      result.commands = files.filter(f => f.endsWith(".md"))
    }

    const toolsDir = join(this.openCodeDir, "tool")
    if (existsSync(toolsDir)) {
      const files = await readdir(toolsDir)
      result.tools = files.filter(f => f.endsWith(".ts") || f.endsWith(".js"))
    }

    return result
  }

  /**
   * Check if a generated OpenCode agent exists
   */
  agentExists(name: string): boolean {
    return existsSync(join(this.openCodeDir, "agent", `claude_${name}.md`))
  }

  /**
   * Check if a generated OpenCode command exists
   */
  commandExists(name: string): boolean {
    return existsSync(join(this.openCodeDir, "command", `claude_${name}.md`))
  }

  /**
   * Clean up the test directory
   */
  async cleanup(): Promise<void> {
    if (existsSync(this.root)) {
      await rm(this.root, { recursive: true, force: true })
    }
  }
}

/**
 * Create a mock home directory for testing user-level assets
 */
export async function createMockHomeDir(): Promise<{
  path: string
  cleanup: () => Promise<void>
}> {
  const mockHome = join(process.cwd(), `.test-home-${Date.now()}`)
  await mkdir(join(mockHome, ".claude"), { recursive: true })

  return {
    path: mockHome,
    cleanup: async () => {
      if (existsSync(mockHome)) {
        await rm(mockHome, { recursive: true, force: true })
      }
    },
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a spy function that records calls
 */
export function createSpy<T extends (...args: any[]) => any>(): {
  fn: T
  calls: Parameters<T>[]
  reset: () => void
} {
  const calls: Parameters<T>[] = []

  const fn = ((...args: Parameters<T>) => {
    calls.push(args)
  }) as T

  return {
    fn,
    calls,
    reset: () => {
      calls.length = 0
    },
  }
}

/**
 * Assert that an object has all expected properties
 */
export function assertHasProperties<T extends object>(
  obj: T,
  properties: (keyof T)[]
): void {
  for (const prop of properties) {
    if (!(prop in obj)) {
      throw new Error(`Expected object to have property: ${String(prop)}`)
    }
  }
}

/**
 * Assert that a string contains all expected substrings
 */
export function assertContainsAll(str: string, substrings: string[]): void {
  for (const sub of substrings) {
    if (!str.includes(sub)) {
      throw new Error(`Expected string to contain: "${sub}"`)
    }
  }
}
