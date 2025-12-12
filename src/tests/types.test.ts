/**
 * Tests for type mappings
 */

import { describe, expect, it } from "bun:test"
import {
  MODEL_MAPPING,
  TOOL_MAPPING,
  PERMISSION_MODE_MAPPING,
  HOOK_EVENT_MAPPING,
} from "../types"

describe("MODEL_MAPPING", () => {
  it("should map sonnet to full model path", () => {
    expect(MODEL_MAPPING.sonnet).toBe("anthropic/claude-sonnet-4-20250514")
  })

  it("should map opus to full model path", () => {
    expect(MODEL_MAPPING.opus).toBe("anthropic/claude-opus-4-20250514")
  })

  it("should map haiku to full model path", () => {
    expect(MODEL_MAPPING.haiku).toBe("anthropic/claude-haiku-4-20250514")
  })

  it("should map inherit to empty string", () => {
    expect(MODEL_MAPPING.inherit).toBe("")
  })
})

describe("TOOL_MAPPING", () => {
  it("should map Claude tool names to OpenCode names", () => {
    expect(TOOL_MAPPING.Read).toBe("read")
    expect(TOOL_MAPPING.Write).toBe("write")
    expect(TOOL_MAPPING.Edit).toBe("edit")
    expect(TOOL_MAPPING.Bash).toBe("bash")
  })
})

describe("PERMISSION_MODE_MAPPING", () => {
  it("should map default to empty object", () => {
    expect(PERMISSION_MODE_MAPPING.default).toEqual({})
  })

  it("should map acceptEdits to allow edit", () => {
    expect(PERMISSION_MODE_MAPPING.acceptEdits).toEqual({ edit: "allow" })
  })

  it("should map bypassPermissions to allow edit and bash", () => {
    expect(PERMISSION_MODE_MAPPING.bypassPermissions).toEqual({
      edit: "allow",
      bash: "allow",
    })
  })

  it("should map plan to deny edit and bash", () => {
    expect(PERMISSION_MODE_MAPPING.plan).toEqual({
      edit: "deny",
      bash: "deny",
    })
  })
})

describe("HOOK_EVENT_MAPPING", () => {
  it("should map PreToolUse to tool.execute.before", () => {
    expect(HOOK_EVENT_MAPPING.PreToolUse).toBe("tool.execute.before")
  })

  it("should map PostToolUse to tool.execute.after", () => {
    expect(HOOK_EVENT_MAPPING.PostToolUse).toBe("tool.execute.after")
  })

  it("should map SessionStart to session.created", () => {
    expect(HOOK_EVENT_MAPPING.SessionStart).toBe("session.created")
  })
})
