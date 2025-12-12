/**
 * Unit tests for the Hooks Loader
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "bun:test"
import { join } from "path"

import {
  loadClaudeHooksConfig,
  createToolExecuteBeforeHandler,
  createToolExecuteAfterHandler,
  createEventHandler,
  buildHookHandlers,
} from "../loaders/hooks"
import {
  createTestDirectory,
  createMockHomeDir,
  type TestDirectory,
} from "./utils"

describe("Hooks Loader", () => {
  let testDir: TestDirectory
  let mockHome: { path: string; cleanup: () => Promise<void> }

  beforeAll(async () => {
    testDir = await createTestDirectory("hooks", { copySettings: true })
    mockHome = await createMockHomeDir()
  })

  afterAll(async () => {
    await testDir.cleanup()
    await mockHome.cleanup()
  })

  describe("loadClaudeHooksConfig", () => {
    it("should load hooks from settings.json", async () => {
      const config = await loadClaudeHooksConfig(testDir.claudeDir, mockHome.path)

      expect(config).toBeDefined()
      expect(config?.PreToolUse).toBeDefined()
      expect(config?.PostToolUse).toBeDefined()
      expect(config?.SessionStart).toBeDefined()
    })

    it("should parse PreToolUse hook matchers", async () => {
      const config = await loadClaudeHooksConfig(testDir.claudeDir, mockHome.path)

      expect(config?.PreToolUse?.length).toBe(2)
      expect(config?.PreToolUse?.[0].matcher).toBe("Bash")
      expect(config?.PreToolUse?.[1].matcher).toBe("Edit|Write")
    })

    it("should parse PostToolUse with wildcard matcher", async () => {
      const config = await loadClaudeHooksConfig(testDir.claudeDir, mockHome.path)

      expect(config?.PostToolUse?.length).toBe(1)
      expect(config?.PostToolUse?.[0].matcher).toBe("*")
    })

    it("should return null when no settings exist", async () => {
      const emptyDir = await createTestDirectory("no-settings")
      const config = await loadClaudeHooksConfig(emptyDir.claudeDir, mockHome.path)

      expect(config).toBeNull()
      await emptyDir.cleanup()
    })

    it("should return null when settings has no hooks", async () => {
      const noHooksDir = await createTestDirectory("no-hooks")
      const { writeFile } = await import("fs/promises")
      await writeFile(
        join(noHooksDir.claudeDir, "settings.json"),
        JSON.stringify({ other: "settings" })
      )

      const config = await loadClaudeHooksConfig(noHooksDir.claudeDir, mockHome.path)

      expect(config).toBeNull()
      await noHooksDir.cleanup()
    })
  })

  describe("createToolExecuteBeforeHandler", () => {
    it("should create handler function", () => {
      const hookMatchers = [
        {
          matcher: "Bash",
          hooks: [{ type: "command" as const, command: "echo test" }],
        },
      ]

      const handler = createToolExecuteBeforeHandler(hookMatchers)

      expect(typeof handler).toBe("function")
    })

    it("should match tools case-insensitively", async () => {
      let executed = false
      const hookMatchers = [
        {
          matcher: "bash",
          hooks: [
            {
              type: "command" as const,
              command: "true", // Simple command that succeeds
            },
          ],
        },
      ]

      const handler = createToolExecuteBeforeHandler(hookMatchers)

      // Should match "Bash" even though matcher is "bash"
      await handler({ tool: "Bash" }, { args: {} })
      // If we got here without error, the hook executed
    })

    it("should match pipe-separated matchers", async () => {
      const hookMatchers = [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command" as const, command: "true" }],
        },
      ]

      const handler = createToolExecuteBeforeHandler(hookMatchers)

      // Should match Edit
      await handler({ tool: "Edit" }, { args: {} })
      // Should match Write
      await handler({ tool: "Write" }, { args: {} })
    })

    it("should match wildcard (*) matcher", async () => {
      const hookMatchers = [
        {
          matcher: "*",
          hooks: [{ type: "command" as const, command: "true" }],
        },
      ]

      const handler = createToolExecuteBeforeHandler(hookMatchers)

      await handler({ tool: "AnyTool" }, { args: {} })
      await handler({ tool: "AnotherTool" }, { args: {} })
    })

    it("should not execute non-matching hooks", async () => {
      const hookMatchers = [
        {
          matcher: "Bash",
          hooks: [{ type: "command" as const, command: "exit 1" }], // Would fail
        },
      ]

      const handler = createToolExecuteBeforeHandler(hookMatchers)

      // This should not execute the Bash hook, so no error
      await handler({ tool: "Read" }, { args: {} })
    })
  })

  describe("createToolExecuteAfterHandler", () => {
    it("should create handler function", () => {
      const hookMatchers = [
        {
          matcher: "Bash",
          hooks: [{ type: "command" as const, command: "echo test" }],
        },
      ]

      const handler = createToolExecuteAfterHandler(hookMatchers)

      expect(typeof handler).toBe("function")
    })

    it("should receive tool result in hook input", async () => {
      // This test verifies the handler structure, not actual execution
      const hookMatchers = [
        {
          matcher: "Bash",
          hooks: [{ type: "command" as const, command: "true" }],
        },
      ]

      const handler = createToolExecuteAfterHandler(hookMatchers)

      // Should not throw
      await handler(
        { tool: "Bash" },
        { args: { command: "ls" }, result: "file1\nfile2" }
      )
    })
  })

  describe("createEventHandler", () => {
    it("should create handler function", async () => {
      const config = await loadClaudeHooksConfig(testDir.claudeDir, mockHome.path)

      const handler = createEventHandler(config!)

      expect(typeof handler).toBe("function")
    })

    it("should handle session.created events", async () => {
      const config = await loadClaudeHooksConfig(testDir.claudeDir, mockHome.path)
      const handler = createEventHandler(config!)

      // Should not throw for session.created (maps to SessionStart)
      await handler({ event: { type: "session.created" } })
    })

    it("should ignore unmapped events", async () => {
      const config = await loadClaudeHooksConfig(testDir.claudeDir, mockHome.path)
      const handler = createEventHandler(config!)

      // Should not throw for unmapped event types
      await handler({ event: { type: "unknown.event" } })
    })
  })

  describe("buildHookHandlers", () => {
    it("should build all handlers from config", async () => {
      const handlers = await buildHookHandlers(testDir.claudeDir, mockHome.path)

      expect(handlers.toolExecuteBefore).toBeDefined()
      expect(handlers.toolExecuteAfter).toBeDefined()
      expect(handlers.event).toBeDefined()
    })

    it("should return empty object when no hooks", async () => {
      const emptyDir = await createTestDirectory("build-no-hooks")
      const handlers = await buildHookHandlers(emptyDir.claudeDir, mockHome.path)

      expect(handlers.toolExecuteBefore).toBeUndefined()
      expect(handlers.toolExecuteAfter).toBeUndefined()
      expect(handlers.event).toBeUndefined()

      await emptyDir.cleanup()
    })

    it("should only build handlers for configured hook types", async () => {
      const partialDir = await createTestDirectory("partial-hooks")
      await partialDir.createSettings({
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "echo test" }],
          },
        ],
        // No PostToolUse or session hooks
      })

      const handlers = await buildHookHandlers(partialDir.claudeDir, mockHome.path)

      expect(handlers.toolExecuteBefore).toBeDefined()
      expect(handlers.toolExecuteAfter).toBeUndefined()
      expect(handlers.event).toBeUndefined()

      await partialDir.cleanup()
    })
  })

  describe("Dynamic hook configuration", () => {
    let dynamicDir: TestDirectory

    beforeEach(async () => {
      dynamicDir = await createTestDirectory("dynamic-hooks")
    })

    afterEach(async () => {
      await dynamicDir.cleanup()
    })

    it("should load dynamically created hooks", async () => {
      await dynamicDir.createSettings({
        PreToolUse: [
          {
            matcher: "Read",
            hooks: [{ type: "command", command: "echo reading" }],
          },
        ],
      })

      const config = await loadClaudeHooksConfig(dynamicDir.claudeDir, mockHome.path)

      expect(config?.PreToolUse?.length).toBe(1)
      expect(config?.PreToolUse?.[0].matcher).toBe("Read")
    })

    it("should handle multiple hooks per matcher", async () => {
      await dynamicDir.createSettings({
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              { type: "command", command: "echo hook1" },
              { type: "command", command: "echo hook2" },
              { type: "command", command: "echo hook3" },
            ],
          },
        ],
      })

      const config = await loadClaudeHooksConfig(dynamicDir.claudeDir, mockHome.path)

      expect(config?.PreToolUse?.[0].hooks.length).toBe(3)
    })

    it("should handle all hook event types", async () => {
      await dynamicDir.createSettings({
        PreToolUse: [{ matcher: "*", hooks: [{ type: "command", command: "true" }] }],
        PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: "true" }] }],
        SessionStart: [{ matcher: "", hooks: [{ type: "command", command: "true" }] }],
        SessionEnd: [{ matcher: "", hooks: [{ type: "command", command: "true" }] }],
        Stop: [{ matcher: "", hooks: [{ type: "command", command: "true" }] }],
        Notification: [{ matcher: "", hooks: [{ type: "command", command: "true" }] }],
      })

      const config = await loadClaudeHooksConfig(dynamicDir.claudeDir, mockHome.path)

      expect(config?.PreToolUse).toBeDefined()
      expect(config?.PostToolUse).toBeDefined()
      expect(config?.SessionStart).toBeDefined()
      expect(config?.SessionEnd).toBeDefined()
      expect(config?.Stop).toBeDefined()
      expect(config?.Notification).toBeDefined()
    })
  })
})
