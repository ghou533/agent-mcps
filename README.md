# agent-mcps

Project-local MCP catalog and installers for Claude, Codex, and Cursor.

## Install

### Option A: clone + global link (recommended)

```bash
git clone https://github.com/ghou533/agent-mcps.git ~/agent-mcps
cd ~/agent-mcps
pnpm link --global
which agent-mcps
agent-mcps --help
```

### Option B: global install directly from git URL

```bash
pnpm add -g git+https://github.com/ghou533/agent-mcps.git
# ssh option:
# pnpm add -g git+ssh://git@github.com/ghou533/agent-mcps.git
which agent-mcps
agent-mcps --help
```

Update later by re-running the same `pnpm add -g ...` command.

Use in any project directory:

1. List available servers:
`agent-mcps list`
2. Add one server:
`agent-mcps add chrome-devtools -a claude -a codex -a cursor`
3. Full sync from catalog:
`agent-mcps sync`

Uninstall/reset:

1. Remove global package:
`pnpm remove -g agent-mcps`
2. If you used link mode, unlink from this repo:
`pnpm unlink --global`

## What this repo does

Two workflows:

1. Add one server by ID without replacing other project entries:
`agent-mcps add chrome-devtools [--target /path/to/project] [-a <agent>]...`
2. Deterministically sync all enabled catalog servers:
`agent-mcps sync [--target /path/to/project] [-a <agent>]...`

`--target` is optional. If omitted, the current directory is used.
`-a` can be repeated per agent, for example `-a claude -a codex`.
If no `-a` flags are provided in an interactive terminal, a checklist UI appears (space to select, enter to confirm).

MCP catalog table lives in `catalog/README.md`.

## Commands

Global CLI:

1. Validate catalog:
`agent-mcps validate`
2. List catalog servers:
`agent-mcps list [--json]`
3. Add or update one server:
`agent-mcps add <server-id> [--target /path] [-a <agent>]... [-y]`
4. Full sync:
`agent-mcps sync [--target /path] [-a <agent>]... [-y]`

## Generated targets (under selected target path)

1. Claude: `<target>/.mcp.json`
2. Cursor: `<target>/.cursor/mcp.json`
3. Codex: `<target>/.codex/config.toml`
4. Codex project wrapper: `<target>/.agent-mcps/scripts/codex-local` and `<target>/.agent-mcps/scripts/codex-local.ps1`

Use the wrapper so Codex uses project-local MCP config:

```bash
cd /absolute/path/to/project
./.agent-mcps/scripts/codex-local mcp list
```

## Existing files behavior

1. `add` mode updates only the selected server key and preserves other existing MCP entries.
2. Existing directories are reused (`.cursor`, `.codex`, `.agent-mcps/scripts`).
3. Existing files are updated in place:
`<target>/.mcp.json`, `<target>/.cursor/mcp.json`, `<target>/.codex/config.toml`.
4. `sync` mode rewrites the managed client config files deterministically from the enabled catalog.

## Catalog format

Catalog lives in `catalog/servers.json`.

Each server must define:

1. `id`
2. `description`
3. `transport` (`stdio` or `http`)
4. `command` + `args` (stdio) or `url` (http)
5. `envVars` (variable names only)
6. `clients` (`claude`, `codex`, `cursor`)
7. `enabled`
8. `versionPolicy` (`pinned`)

Schema: `catalog/schema.json`

## Notes

1. Secrets are never stored in the catalog. Only env var names are stored.
2. Claude/Cursor files use placeholders like `${API_KEY}`.
3. Codex output uses `env_vars = ["API_KEY"]`.
4. For `npx` entries, package versions must be pinned (no `@latest`).
