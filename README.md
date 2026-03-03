# agent-mcps

Project-local MCP catalog and installers for Claude, Codex, and Cursor.

## Global local usage with pnpm (no publish)

Use this repo as a global CLI from your machine:

1. Link this local clone globally (recommended for live updates):
`pnpm link --global`
2. Verify:
`which agent-mcps`
3. Use in any project directory:
`agent-mcps add chrome-devtools`
4. Or full sync:
`agent-mcps sync`
5. Choose explicit agents:
`agent-mcps add chrome-devtools -a claude -a codex -a cursor`

Alternative snapshot install from local path:

`pnpm add -g /Users/robot/Documents/Projects/agent-mcps`

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

## Commands

Global CLI:

1. Validate catalog:
`agent-mcps validate`
2. Add or update one server:
`agent-mcps add <server-id> [--target /path] [-a <agent>]... [-y]`
3. Full sync:
`agent-mcps sync [--target /path] [-a <agent>]... [-y]`

Legacy local scripts (still available):

1. `npm run validate`
2. `npm run add -- <server-id> --target /path`
3. `npm run sync -- --target /path`

## Generated targets (under selected target path)

1. Claude: `<target>/.mcp.json`
2. Cursor: `<target>/.cursor/mcp.json`
3. Codex: `<target>/.codex/config.toml`
4. Codex project wrapper: `<target>/scripts/codex-local` and `<target>/scripts/codex-local.ps1`

Use the wrapper so Codex uses project-local MCP config:

```bash
cd /absolute/path/to/project
./scripts/codex-local mcp list
```

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
