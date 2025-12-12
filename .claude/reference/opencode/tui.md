TUI | OpenCode     [Skip to content](#_top)

# TUI


Using the OpenCode terminal user interface.

OpenCode provides an interactive terminal interface or TUI for working on your projects with an LLM.

Running OpenCode starts the TUI for the current directory.

Terminal window
```
opencode
```
Or you can start it for a specific working directory.

Terminal window
```
opencode /path/to/project
```
Once you’re in the TUI, you can prompt it with a message.
```
Give me a quick summary of the codebase.
```
* * *

## [File references](#file-references)


You can reference files in your messages using `@`. This does a fuzzy file search in the current working directory.

Tip

You can also use `@` to reference files in your messages.
```
How is auth handled in @packages/functions/src/api/index.ts?
```
The content of the file is added to the conversation automatically.

* * *

## [Bash commands](#bash-commands)


Start a message with `!` to run a shell command.
```
!ls -la
```
The output of the command is added to the conversation as a tool result.

* * *

## [Commands](#commands)


When using the OpenCode TUI, you can type `/` followed by a command name to quickly execute actions. For example:
```
/help
```
Most commands also have keybind using `ctrl+x` as the leader key, where `ctrl+x` is the default leader key. [Learn more](/docs/keybinds).

Here are all available slash commands:

* * *

### [connect](#connect)


Add a provider to OpenCode. Allows you to select from available providers and add their API keys.
```
/connect
```
* * *

### [compact](#compact)


Compact the current session. _Alias_: `/summarize`
```
/compact
```
**Keybind:** `ctrl+x c`

* * *

### [details](#details)


Toggle tool execution details.
```
/details
```
**Keybind:** `ctrl+x d`

* * *

### [editor](#editor)


Open external editor for composing messages. Uses the editor set in your `EDITOR` environment variable. [Learn more](#editor-setup).
```
/editor
```
**Keybind:** `ctrl+x e`

* * *

### [exit](#exit)


Exit OpenCode. _Aliases_: `/quit`, `/q`
```
/exit
```
**Keybind:** `ctrl+x q`

* * *

### [export](#export)


Export current conversation to Markdown and open in your default editor. Uses the editor set in your `EDITOR` environment variable. [Learn more](#editor-setup).
```
/export
```
**Keybind:** `ctrl+x x`

* * *

### [help](#help)


Show the help dialog.
```
/help
```
**Keybind:** `ctrl+x h`

* * *

### [init](#init)


Create or update `AGENTS.md` file. [Learn more](/docs/rules).
```
/init
```
**Keybind:** `ctrl+x i`

* * *

### [models](#models)


List available models.
```
/models
```
**Keybind:** `ctrl+x m`

* * *

### [new](#new)


Start a new session. _Alias_: `/clear`
```
/new
```
**Keybind:** `ctrl+x n`

* * *

### [redo](#redo)


Redo a previously undone message. Only available after using `/undo`.

Tip

Any file changes will also be restored.

Internally, this uses Git to manage the file changes. So your project **needs to be a Git repository**.
```
/redo
```
**Keybind:** `ctrl+x r`

* * *

### [sessions](#sessions)


List and switch between sessions. _Aliases_: `/resume`, `/continue`
```
/sessions
```
**Keybind:** `ctrl+x l`

* * *

### [share](#share)


Share current session. [Learn more](/docs/share).
```
/share
```
**Keybind:** `ctrl+x s`

* * *

### [themes](#themes)


List available themes.
```
/themes
```
**Keybind:** `ctrl+x t`

* * *

### [undo](#undo)


Undo last message in the conversation. Removes the most recent user message, all subsequent responses, and any file changes.

Tip

Any file changes made will also be reverted.

Internally, this uses Git to manage the file changes. So your project **needs to be a Git repository**.
```
/undo
```
**Keybind:** `ctrl+x u`

* * *

### [unshare](#unshare)


Unshare current session. [Learn more](/docs/share#un-sharing).
```
/unshare
```
* * *

## [Editor setup](#editor-setup)


Both the `/editor` and `/export` commands use the editor specified in your `EDITOR` environment variable.

*   [Linux/macOS](#tab-panel-4)
*   [Windows (CMD)](#tab-panel-5)
*   [Windows (PowerShell)](#tab-panel-6)

Terminal window
```

# Example for nano or vimexport EDITOR=nanoexport EDITOR=vim

# For GUI editors, VS Code, Cursor, VSCodium, Windsurf, Zed, etc.# include --waitexport EDITOR="code --wait"

```
To make it permanent, add this to your shell profile; `~/.bashrc`, `~/.zshrc`, etc.

Terminal window
```
set EDITOR=notepad

# For GUI editors, VS Code, Cursor, VSCodium, Windsurf, Zed, etc.# include --waitset EDITOR=code --wait

```
To make it permanent, use **System Properties** > **Environment Variables**.

Terminal window
```
$env:EDITOR = "notepad"

# For GUI editors, VS Code, Cursor, VSCodium, Windsurf, Zed, etc.# include --wait$env:EDITOR = "code --wait"

```
To make it permanent, add this to your PowerShell profile.

Popular editor options include:

*   `code` - Visual Studio Code
*   `cursor` - Cursor
*   `windsurf` - Windsurf
*   `vim` - Vim editor
*   `nano` - Nano editor
*   `notepad` - Windows Notepad
*   `subl` - Sublime Text

Note

Some editors like VS Code need to be started with the `--wait` flag.

Some editors need command-line arguments to run in blocking mode. The `--wait` flag makes the editor process block until closed.

* * *

## [Configure](#configure)


You can customize TUI behavior through your OpenCode config file.

opencode.json
```
{  "$schema": "https://opencode.ai/config.json",  "tui": {    "scroll_speed": 3,    "scroll_acceleration": {      "enabled": true    }  }}
```

### [Options](#options)


*   `scroll_acceleration` - Enable macOS-style scroll acceleration for smooth, natural scrolling. When enabled, scroll speed increases with rapid scrolling gestures and stays precise for slower movements. **This setting takes precedence over `scroll_speed` and overrides it when enabled.**
*   `scroll_speed` - Controls how fast the TUI scrolls when using scroll commands (minimum: `1`). Defaults to `1` on Unix and `3` on Windows. **Note: This is ignored if `scroll_acceleration.enabled` is set to `true`.**

* * *

## [View customization](#view-customization)


You can customize various aspects of the TUI view using the command palette (`ctrl+x h` or `/help`). These settings persist across restarts.

### [Username display](#username-display)


Toggle whether your username appears in chat messages. Access this through:

*   Command palette: Search for “username” or “hide username”
*   The setting persists automatically and will be remembered across TUI sessions