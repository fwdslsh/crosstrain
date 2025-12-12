Plugins | OpenCode     [Skip to content](#_top)

# Plugins


Write your own plugins to extend OpenCode.

Plugins allow you to extend OpenCode by hooking into various events and customizing behavior. You can create plugins to add new features, integrate with external services, or modify OpenCode’s default behavior.

For examples, check out the [plugins](/docs/ecosystem#plugins) created by the community.

* * *

## [Create a plugin](#create-a-plugin)


A plugin is a **JavaScript/TypeScript module** that exports one or more plugin functions. Each function receives a context object and returns a hooks object.

* * *

### [Location](#location)


Plugins are loaded from:

1.  `.opencode/plugin` directory either in your project
2.  Or, globally in `~/.config/opencode/plugin`

* * *

### [Basic structure](#basic-structure)


.opencode/plugin/example.js
```
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {  console.log("Plugin initialized!")
  return {    // Hook implementations go here  }}
```
The plugin function receives:

*   `project`: The current project information.
*   `directory`: The current working directory.
*   `worktree`: The git worktree path.
*   `client`: An opencode SDK client for interacting with the AI.
*   `$`: Bun’s [shell API](https://bun.com/docs/runtime/shell) for executing commands.

* * *

### [TypeScript support](#typescript-support)


For TypeScript plugins, you can import types from the plugin package:

my-plugin.ts
```
import type { Plugin } from "@opencode-ai/plugin"
export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {  return {    // Type-safe hook implementations  }}
```
* * *

### [Events](#events)


Plugins can subscribe to events as seen below in the Examples section. Here is a list of the different events available.

#### [Command Events](#command-events)


*   `command.executed`

#### [File Events](#file-events)


*   `file.edited`
*   `file.watcher.updated`

#### [Installation Events](#installation-events)


*   `installation.updated`

#### [LSP Events](#lsp-events)


*   `lsp.client.diagnostics`
*   `lsp.updated`

#### [Message Events](#message-events)


*   `message.part.removed`
*   `message.part.updated`
*   `message.removed`
*   `message.updated`

#### [Permission Events](#permission-events)


*   `permission.replied`
*   `permission.updated`

#### [Server Events](#server-events)


*   `server.connected`

#### [Session Events](#session-events)


*   `session.created`
*   `session.compacted`
*   `session.deleted`
*   `session.diff`
*   `session.error`
*   `session.idle`
*   `session.status`
*   `session.updated`

#### [Todo Events](#todo-events)


*   `todo.updated`

#### [Tool Events](#tool-events)


*   `tool.execute.after`
*   `tool.execute.before`

#### [TUI Events](#tui-events)


*   `tui.prompt.append`
*   `tui.command.execute`
*   `tui.toast.show`

* * *

## [Examples](#examples)


Here are some examples of plugins you can use to extend opencode.

* * *

### [Send notifications](#send-notifications)


Send notifications when certain events occur:

.opencode/plugin/notification.js
```
export const NotificationPlugin = async ({ project, client, $, directory, worktree }) => {  return {    event: async ({ event }) => {      // Send notification on session completion      if (event.type === "session.idle") {        await $`osascript -e 'display notification "Session completed!" with title "opencode"'`      }    },  }}
```
We are using `osascript` to run AppleScript on macOS. Here we are using it to send notifications.

* * *

### [.env protection](#env-protection)


Prevent opencode from reading `.env` files:

.opencode/plugin/env-protection.js
```
export const EnvProtection = async ({ project, client, $, directory, worktree }) => {  return {    "tool.execute.before": async (input, output) => {      if (input.tool === "read" && output.args.filePath.includes(".env")) {        throw new Error("Do not read .env files")      }    },  }}
```
* * *

### [Custom tools](#custom-tools)


Plugins can also add custom tools to opencode:

.opencode/plugin/custom-tools.ts
```
import { type Plugin, tool } from "@opencode-ai/plugin"
export const CustomToolsPlugin: Plugin = async (ctx) => {  return {    tool: {      mytool: tool({        description: "This is a custom tool",        args: {          foo: tool.schema.string(),        },        async execute(args, ctx) {          return `Hello ${args.foo}!`        },      }),    },  }}
```
The `tool` helper creates a custom tool that opencode can call. It takes a Zod schema function and returns a tool definition with:

*   `description`: What the tool does
*   `args`: Zod schema for the tool’s arguments
*   `execute`: Function that runs when the tool is called

Your custom tools will be available to opencode alongside built-in tools.