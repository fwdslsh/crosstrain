Server | OpenCode    [Skip to content](#_top)

# Server


Interact with opencode server over HTTP.

The `opencode serve` command runs a headless HTTP server that exposes an OpenAPI endpoint that an opencode client can use.

* * *

### [Usage](#usage)


Terminal window
```
opencode serve [--port <number>] [--hostname <string>]
```

#### [Options](#options)


Flag

Short

Description

Default

`--port`

`-p`

Port to listen on

`4096`

`--hostname`

`-h`

Hostname to listen on

`127.0.0.1`

* * *

### [How it works](#how-it-works)


When you run `opencode` it starts a TUI and a server. Where the TUI is the client that talks to the server. The server exposes an OpenAPI 3.1 spec endpoint. This endpoint is also used to generate an [SDK](/docs/sdk).

Tip

Use the opencode server to interact with opencode programmatically.

This architecture lets opencode support multiple clients and allows you to interact with opencode programmatically.

You can run `opencode serve` to start a standalone server. If you have the opencode TUI running, `opencode serve` will start a new server.

* * *

#### [Connect to an existing server](#connect-to-an-existing-server)


When you start the TUI it randomly assigns a port and hostname. You can instead pass in the `--hostname` and `--port` [flags](/docs/cli). Then use this to connect to its server.

The [`/tui`](#tui) endpoint can be used to drive the TUI through the server. For example, you can prefill or run a prompt. This setup is used by the OpenCode [IDE](/docs/ide) plugins.

* * *

## [Spec](#spec)


The server publishes an OpenAPI 3.1 spec that can be viewed at:
```
http://<hostname>:<port>/doc
```
For example, `http://localhost:4096/doc`. Use the spec to generate clients or inspect request and response types. Or view it in a Swagger explorer.

* * *

## [APIs](#apis)


The opencode server exposes the following APIs.

* * *

### [Global Events](#global-events)


Method

Path

Description

Response

`GET`

`/global/event`

Get global events (SSE stream)

Event stream

* * *

### [Project](#project)


Method

Path

Description

Response

`GET`

`/project`

List all projects

[`Project[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/project/current`

Get the current project

[`Project`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

* * *

### [Path & VCS](#path--vcs)


Method

Path

Description

Response

`GET`

`/path`

Get the current path

[`Path`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/vcs`

Get VCS info for the current project

[`VcsInfo`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

* * *

### [Instance](#instance)


Method

Path

Description

Response

`POST`

`/instance/dispose`

Dispose the current instance

`boolean`

* * *

### [Config](#config)


Method

Path

Description

Response

`GET`

`/config`

Get config info

[`Config`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`PATCH`

`/config`

Update config

[`Config`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/config/providers`

List providers and default models

`{ providers:` [Provider\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, default: { [key: string]: string } }`

* * *

### [Provider](#provider)


Method

Path

Description

Response

`GET`

`/provider`

List all providers

`{ all:` [Provider\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, default: {...}, connected: string[] }`

`GET`

`/provider/auth`

Get provider authentication methods

`{ [providerID: string]:` [ProviderAuthMethod\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) `}`

`POST`

`/provider/{id}/oauth/authorize`

Authorize a provider using OAuth

[`ProviderAuthAuthorization`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`POST`

`/provider/{id}/oauth/callback`

Handle OAuth callback for a provider

`boolean`

* * *

### [Sessions](#sessions)


Method

Path

Description

Notes

`GET`

`/session`

List all sessions

Returns [`Session[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`POST`

`/session`

Create a new session

body: `{ parentID?, title? }`, returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/session/status`

Get session status for all sessions

Returns `{ [sessionID: string]:` [SessionStatus](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) `}`

`GET`

`/session/:id`

Get session details

Returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`DELETE`

`/session/:id`

Delete a session and all its data

Returns `boolean`

`PATCH`

`/session/:id`

Update session properties

body: `{ title? }`, returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/session/:id/children`

Get a session’s child sessions

Returns [`Session[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/session/:id/todo`

Get the todo list for a session

Returns [`Todo[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`POST`

`/session/:id/init`

Analyze app and create `AGENTS.md`

body: `{ messageID, providerID, modelID }`, returns `boolean`

`POST`

`/session/:id/fork`

Fork an existing session at a message

body: `{ messageID? }`, returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`POST`

`/session/:id/abort`

Abort a running session

Returns `boolean`

`POST`

`/session/:id/share`

Share a session

Returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`DELETE`

`/session/:id/share`

Unshare a session

Returns [`Session`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/session/:id/diff`

Get the diff for this session

query: `messageID?`, returns [`FileDiff[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`POST`

`/session/:id/summarize`

Summarize the session

body: `{ providerID, modelID }`, returns `boolean`

`POST`

`/session/:id/revert`

Revert a message

body: `{ messageID, partID? }`, returns `boolean`

`POST`

`/session/:id/unrevert`

Restore all reverted messages

Returns `boolean`

`POST`

`/session/:id/permissions/:permissionID`

Respond to a permission request

body: `{ response, remember? }`, returns `boolean`

* * *

### [Messages](#messages)


Method

Path

Description

Notes

`GET`

`/session/:id/message`

List messages in a session

query: `limit?`, returns `{ info:` [Message](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts:` [Part\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`}[]`

`POST`

`/session/:id/message`

Send a message and wait for response

body: `{ messageID?, model?, agent?, noReply?, system?, tools?, parts }`, returns `{ info:` [Message](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts:` [Part\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`}`

`GET`

`/session/:id/message/:messageID`

Get message details

Returns `{ info:` [Message](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts:` [Part\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`}`

`POST`

`/session/:id/prompt_async`

Send a message asynchronously (no wait)

body: same as `/session/:id/message`, returns `204 No Content`

`POST`

`/session/:id/command`

Execute a slash command

body: `{ messageID?, agent?, model?, command, arguments }`, returns `{ info:` [Message](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts:` [Part\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`}`

`POST`

`/session/:id/shell`

Run a shell command

body: `{ agent, model?, command }`, returns `{ info:` [Message](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`, parts:` [Part\[\]](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)`}`

* * *

### [Commands](#commands)


Method

Path

Description

Response

`GET`

`/command`

List all commands

[`Command[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

* * *

### [Files](#files)


Method

Path

Description

Response

`GET`

`/find?pattern=<pat>`

Search for text in files

Array of match objects with `path`, `lines`, `line_number`, `absolute_offset`, `submatches`

`GET`

`/find/file?query=<q>`

Find files by name

`string[]` (file paths)

`GET`

`/find/symbol?query=<q>`

Find workspace symbols

[`Symbol[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/file?path=<path>`

List files and directories

[`FileNode[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/file/content?path=<p>`

Read a file

[`FileContent`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/file/status`

Get status for tracked files

[`File[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

* * *

### [Tools (Experimental)](#tools-experimental)


Method

Path

Description

Response

`GET`

`/experimental/tool/ids`

List all tool IDs

[`ToolIDs`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/experimental/tool?provider=<p>&model=<m>`

List tools with JSON schemas for a model

[`ToolList`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

* * *

### [LSP, Formatters & MCP](#lsp-formatters--mcp)


Method

Path

Description

Response

`GET`

`/lsp`

Get LSP server status

[`LSPStatus[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/formatter`

Get formatter status

[`FormatterStatus[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

`GET`

`/mcp`

Get MCP server status

`{ [name: string]:` [MCPStatus](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts) `}`

`POST`

`/mcp`

Add MCP server dynamically

body: `{ name, config }`, returns MCP status object

* * *

### [Agents](#agents)


Method

Path

Description

Response

`GET`

`/agent`

List all available agents

[`Agent[]`](https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts)

* * *

### [Logging](#logging)


Method

Path

Description

Response

`POST`

`/log`

Write log entry. Body: `{ service, level, message, extra? }`

`boolean`

* * *

### [TUI](#tui)


Method

Path

Description

Response

`POST`

`/tui/append-prompt`

Append text to the prompt

`boolean`

`POST`

`/tui/open-help`

Open the help dialog

`boolean`

`POST`

`/tui/open-sessions`

Open the session selector

`boolean`

`POST`

`/tui/open-themes`

Open the theme selector

`boolean`

`POST`

`/tui/open-models`

Open the model selector

`boolean`

`POST`

`/tui/submit-prompt`

Submit the current prompt

`boolean`

`POST`

`/tui/clear-prompt`

Clear the prompt

`boolean`

`POST`

`/tui/execute-command`

Execute a command (`{ command }`)

`boolean`

`POST`

`/tui/show-toast`

Show toast (`{ title?, message, variant }`)

`boolean`

`GET`

`/tui/control/next`

Wait for the next control request

Control request object

`POST`

`/tui/control/response`

Respond to a control request (`{ body }`)

`boolean`

* * *

### [Auth](#auth)


Method

Path

Description

Response

`PUT`

`/auth/:id`

Set authentication credentials. Body must match provider schema

`boolean`

* * *

### [Events](#events)


Method

Path

Description

Response

`GET`

`/event`

Server-sent events stream. First event is `server.connected`, then bus events

Server-sent events stream

* * *

### [Docs](#docs)


Method

Path

Description

Response

`GET`

`/doc`

OpenAPI 3.1 specification

HTML page with OpenAPI spec