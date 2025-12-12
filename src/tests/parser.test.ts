/**
 * Tests for parser utilities
 */

import { describe, expect, it } from "bun:test"
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
  parseCommaSeparated,
  kebabToCamel,
  camelToKebab,
  extractNameFromPath,
} from "../utils/parser"

describe("parseMarkdownWithFrontmatter", () => {
  it("should parse valid frontmatter and content", () => {
    const input = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the content.`

    const result = parseMarkdownWithFrontmatter<{
      name: string
      description: string
    }>(input)

    expect(result.frontmatter.name).toBe("test-skill")
    expect(result.frontmatter.description).toBe("A test skill")
    expect(result.content).toBe("# Test Skill\n\nThis is the content.")
  })

  it("should handle missing frontmatter", () => {
    const input = "# Just Content\n\nNo frontmatter here."

    const result = parseMarkdownWithFrontmatter(input)

    expect(result.frontmatter).toEqual({})
    expect(result.content).toBe("# Just Content\n\nNo frontmatter here.")
  })

  it("should handle minimal frontmatter", () => {
    const input = `---
name: minimal
---

# Content after minimal frontmatter`

    const result = parseMarkdownWithFrontmatter<{ name: string }>(input)

    expect(result.frontmatter.name).toBe("minimal")
    expect(result.content).toBe("# Content after minimal frontmatter")
  })
})

describe("serializeMarkdownWithFrontmatter", () => {
  it("should serialize frontmatter and content", () => {
    const frontmatter = {
      name: "test",
      description: "A test",
    }
    const content = "# Test\n\nContent here."

    const result = serializeMarkdownWithFrontmatter(frontmatter, content)

    expect(result).toContain("---")
    expect(result).toContain("name: test")
    expect(result).toContain("description: A test")
    expect(result).toContain("# Test\n\nContent here.")
  })

  it("should filter out undefined values", () => {
    const frontmatter = {
      name: "test",
      description: undefined,
      value: null,
    }
    const content = "Content"

    const result = serializeMarkdownWithFrontmatter(frontmatter, content)

    expect(result).toContain("name: test")
    expect(result).not.toContain("description")
    expect(result).not.toContain("value")
  })
})

describe("parseCommaSeparated", () => {
  it("should parse comma-separated values", () => {
    expect(parseCommaSeparated("Read, Write, Edit")).toEqual([
      "Read",
      "Write",
      "Edit",
    ])
  })

  it("should handle extra whitespace", () => {
    expect(parseCommaSeparated("  Read  ,  Write  ,  Edit  ")).toEqual([
      "Read",
      "Write",
      "Edit",
    ])
  })

  it("should handle empty string", () => {
    expect(parseCommaSeparated("")).toEqual([])
  })

  it("should handle undefined", () => {
    expect(parseCommaSeparated(undefined)).toEqual([])
  })

  it("should filter empty values", () => {
    expect(parseCommaSeparated("Read, , Write, , Edit")).toEqual([
      "Read",
      "Write",
      "Edit",
    ])
  })
})

describe("kebabToCamel", () => {
  it("should convert kebab-case to camelCase", () => {
    expect(kebabToCamel("my-skill-name")).toBe("mySkillName")
  })

  it("should handle single word", () => {
    expect(kebabToCamel("skill")).toBe("skill")
  })
})

describe("camelToKebab", () => {
  it("should convert camelCase to kebab-case", () => {
    expect(camelToKebab("mySkillName")).toBe("my-skill-name")
  })

  it("should handle single word", () => {
    expect(camelToKebab("skill")).toBe("skill")
  })
})

describe("extractNameFromPath", () => {
  it("should extract name from file path", () => {
    expect(extractNameFromPath("/path/to/my-file.md")).toBe("my-file")
  })

  it("should handle paths without extension", () => {
    expect(extractNameFromPath("/path/to/my-file")).toBe("my-file")
  })
})
