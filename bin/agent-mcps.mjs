#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(BIN_DIR, "..");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");

const SUBCOMMAND_SCRIPTS = {
  add: path.join(REPO_ROOT, "scripts", "add-mcp.mjs"),
  list: path.join(REPO_ROOT, "scripts", "list-mcp.mjs"),
  sync: path.join(REPO_ROOT, "scripts", "sync-mcp.mjs"),
  validate: path.join(REPO_ROOT, "scripts", "validate-catalog.mjs")
};

function printUsage() {
  console.log(`agent-mcps

Usage:
  agent-mcps add <server-id> [--target /path] [-a <agent>]... [--global] [-y]
  agent-mcps list [--json]
  agent-mcps sync [--target /path] [-a <agent>]... [--global] [-y]
  agent-mcps validate

Notes:
  - If --target is omitted for add/sync, current directory is used.
  - If no -a flags are given in a TTY, an interactive selector is shown.
  - --global applies agent-specific global setup (currently Codex).
`);
}

function printVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
  console.log(pkg.version);
}

const argv = process.argv.slice(2);
const command = argv[0];

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  printVersion();
  process.exit(0);
}

const scriptPath = SUBCOMMAND_SCRIPTS[command];
if (!scriptPath) {
  printUsage();
  console.error(`Error: Unknown subcommand "${command}".`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [scriptPath, ...argv.slice(1)], {
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
