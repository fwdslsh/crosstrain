/**
 * Parser utilities for reading markdown files with YAML frontmatter
 */
import { readFile, readdir, stat } from "fs/promises"
import { join, basename, extname } from "path"
import { existsSync } from "fs"

export interface ParsedMarkdown<T = Record<string, unknown>> {
  frontmatter: T
  content: string
}

/**
 * Simple YAML parser for frontmatter
 * Handles basic key-value pairs, nested objects, and arrays
 */
function parseSimpleYaml(yamlContent: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = yamlContent.split("\n")
  let currentKey = ""
  let currentIndent = 0
  const stack: { obj: Record<string, unknown>; indent: number }[] = [
    { obj: result, indent: -1 },
  ]

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) continue

    // Calculate indentation
    const indent = line.search(/\S/)
    const trimmedLine = line.trim()

    // Handle key: value pairs
    const colonIndex = trimmedLine.indexOf(":")
    if (colonIndex > 0) {
      const key = trimmedLine.substring(0, colonIndex).trim()
      let value = trimmedLine.substring(colonIndex + 1).trim()

      // Pop stack for lower indentation levels
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop()
      }
      const currentObj = stack[stack.length - 1].obj

      // Handle different value types
      if (value === "") {
        // Nested object or empty value
        const nestedObj: Record<string, unknown> = {}
        currentObj[key] = nestedObj
        stack.push({ obj: nestedObj, indent })
        currentKey = key
        currentIndent = indent
      } else {
        // Parse the value
        currentObj[key] = parseYamlValue(value)
      }
    }
  }

  return result
}

/**
 * Parse a YAML value into appropriate JavaScript type
 */
function parseYamlValue(value: string): unknown {
  // Remove quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  // Boolean
  if (value === "true") return true
  if (value === "false") return false

  // Null
  if (value === "null" || value === "~") return null

  // Number
  if (!isNaN(Number(value)) && value !== "") {
    return Number(value)
  }

  // Array (inline format)
  if (value.startsWith("[") && value.endsWith("]")) {
    const items = value
      .slice(1, -1)
      .split(",")
      .map((s) => parseYamlValue(s.trim()))
    return items
  }

  // String
  return value
}

/**
 * Serialize an object to simple YAML format
 */
function serializeToYaml(
  obj: Record<string, unknown>,
  indent = 0
): string {
  const lines: string[] = []
  const prefix = "  ".repeat(indent)

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue

    if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${prefix}${key}:`)
      lines.push(serializeToYaml(value as Record<string, unknown>, indent + 1))
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}: [${value.join(", ")}]`)
    } else if (typeof value === "string" && value.includes(":")) {
      lines.push(`${prefix}${key}: "${value}"`)
    } else {
      lines.push(`${prefix}${key}: ${value}`)
    }
  }

  return lines.join("\n")
}

/**
 * Parse a markdown file with YAML frontmatter
 */
export function parseMarkdownWithFrontmatter<T = Record<string, unknown>>(
  content: string
): ParsedMarkdown<T> {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return {
      frontmatter: {} as T,
      content: content.trim(),
    }
  }

  try {
    const frontmatter = parseSimpleYaml(match[1]) as T
    return {
      frontmatter,
      content: match[2].trim(),
    }
  } catch (error) {
    console.error("Error parsing YAML frontmatter:", error)
    return {
      frontmatter: {} as T,
      content: content.trim(),
    }
  }
}

/**
 * Serialize frontmatter and content back to markdown
 */
export function serializeMarkdownWithFrontmatter<
  T extends Record<string, unknown>,
>(frontmatter: T, content: string): string {
  // Filter out undefined/null values from frontmatter
  const cleanFrontmatter: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value !== undefined && value !== null) {
      cleanFrontmatter[key] = value
    }
  }

  const yamlContent = serializeToYaml(cleanFrontmatter)
  return `---\n${yamlContent}\n---\n\n${content}`
}

/**
 * Read a file as text
 */
export async function readTextFile(filePath: string): Promise<string> {
  return await readFile(filePath, "utf-8")
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * Get all markdown files in a directory
 */
export async function getMarkdownFiles(
  dirPath: string,
  recursive = false
): Promise<string[]> {
  if (!existsSync(dirPath)) {
    return []
  }

  const files: string[] = []
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)

    if (entry.isDirectory() && recursive) {
      const subFiles = await getMarkdownFiles(fullPath, recursive)
      files.push(...subFiles)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Get all directories in a path
 */
export async function getDirectories(dirPath: string): Promise<string[]> {
  if (!existsSync(dirPath)) {
    return []
  }

  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dirPath, entry.name))
}

/**
 * Get all files in a directory with specific extensions
 */
export async function getFilesWithExtensions(
  dirPath: string,
  extensions: string[],
  recursive = false
): Promise<string[]> {
  if (!existsSync(dirPath)) {
    return []
  }

  const files: string[] = []
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)

    if (entry.isDirectory() && recursive) {
      const subFiles = await getFilesWithExtensions(
        fullPath,
        extensions,
        recursive
      )
      files.push(...subFiles)
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase()
      if (extensions.includes(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Extract name from a file path (without extension)
 */
export function extractNameFromPath(filePath: string): string {
  return basename(filePath, extname(filePath))
}

/**
 * Parse a comma-separated string into an array
 */
export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
}
