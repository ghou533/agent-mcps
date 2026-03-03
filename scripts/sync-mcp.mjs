#!/usr/bin/env node
import path from "node:path";
import {
  fail,
  getOptionValues,
  parseCliArgs,
  parseAgents,
  parseTargetPath,
  ALLOWED_CLIENTS,
  serverSupportsClient,
  writeJsonFile,
  writeTextFile
} from "./lib/common.mjs";
import { loadCatalog, sortServersById, validateCatalog } from "./lib/catalog.mjs";
import { buildManagedCodexConfig } from "./lib/codex-config.mjs";
import { selectAgentsInteractive } from "./lib/interactive.mjs";
import { writeCodexWrappers } from "./lib/wrappers.mjs";
import { renderClaudeConfig } from "./renderers/claude.mjs";
import { renderCodexServersById } from "./renderers/codex.mjs";
import { renderCursorConfig } from "./renderers/cursor.mjs";

function usage() {
  console.log("Usage: agent-mcps sync [--target /path] [-a <agent>]... [-y]");
}

const { positionals, options } = parseCliArgs(process.argv.slice(2));
if (options.help || options.h) {
  usage();
  process.exit(0);
}
if (positionals.length > 0) {
  usage();
  fail("`sync` does not take positional arguments.");
}

const targetPath = parseTargetPath(options.target, { defaultToCwd: true });
if (options.clients) {
  fail("`--clients` is not supported. Use `-a <agent>` for each target agent.");
}

if (
  options.a === true ||
  (Array.isArray(options.a) && options.a.some((value) => value === true))
) {
  fail("Missing value for `-a`. Use `-a claude -a codex`.");
}

const rawAgents = getOptionValues(options, "a");
let selectedClients = [];
if (rawAgents.length > 0) {
  selectedClients = parseAgents(rawAgents);
} else if (options.y || options.yes) {
  selectedClients = [...ALLOWED_CLIENTS];
} else if (process.stdin.isTTY && process.stdout.isTTY) {
  selectedClients = await selectAgentsInteractive(ALLOWED_CLIENTS);
} else {
  selectedClients = [...ALLOWED_CLIENTS];
}

const catalog = await loadCatalog();
const validationErrors = validateCatalog(catalog);
if (validationErrors.length > 0) {
  fail(`Catalog is invalid:\n${validationErrors.map((e) => `- ${e}`).join("\n")}`);
}

const enabledServers = sortServersById(catalog.servers.filter((s) => s.enabled));
const written = [];

if (selectedClients.includes("claude")) {
  const servers = enabledServers.filter((server) => serverSupportsClient(server, "claude"));
  const payload = renderClaudeConfig(servers);
  const filePath = path.join(targetPath, ".mcp.json");
  await writeJsonFile(filePath, payload);
  written.push(filePath);
}

if (selectedClients.includes("cursor")) {
  const servers = enabledServers.filter((server) => serverSupportsClient(server, "cursor"));
  const payload = renderCursorConfig(servers);
  const filePath = path.join(targetPath, ".cursor", "mcp.json");
  await writeJsonFile(filePath, payload);
  written.push(filePath);
}

if (selectedClients.includes("codex")) {
  const servers = enabledServers.filter((server) => serverSupportsClient(server, "codex"));
  const byId = renderCodexServersById(servers);
  const toml = buildManagedCodexConfig(byId);
  const filePath = path.join(targetPath, ".codex", "config.toml");
  await writeTextFile(filePath, toml);
  await writeCodexWrappers(targetPath);
  written.push(filePath);
}

console.log(`Synced ${enabledServers.length} enabled server(s) to ${targetPath}.`);
for (const filePath of written) {
  console.log(`- ${filePath}`);
}
