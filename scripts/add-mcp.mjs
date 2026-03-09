#!/usr/bin/env node
import path from "node:path";
import {
  fail,
  getOptionValues,
  parseCliArgs,
  parseAgents,
  parseTargetPath,
  readJsonOrDefault,
  readTextOrDefault,
  ALLOWED_CLIENTS,
  serverSupportsClient,
  writeJsonFile
} from "./lib/common.mjs";
import { indexServersById, loadCatalog, validateCatalog } from "./lib/catalog.mjs";
import { parseCodexConfig, writeCodexConfig } from "./lib/codex-config.mjs";
import { applyGlobalActions } from "./lib/global-actions.mjs";
import { selectAgentsInteractive } from "./lib/interactive.mjs";
import { writeCodexWrappers } from "./lib/wrappers.mjs";
import { renderSingleClaudeServer } from "./renderers/claude.mjs";
import { renderSingleCodexServer } from "./renderers/codex.mjs";
import { renderSingleCursorServer } from "./renderers/cursor.mjs";

function usage() {
  console.log("Usage: agent-mcps add <server-id> [--target /path] [-a <agent>]... [--global] [-y]");
}

function ensureMcpJsonShape(value, filePath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${filePath} must contain a JSON object.`);
  }
  if (!value.mcpServers || typeof value.mcpServers !== "object" || Array.isArray(value.mcpServers)) {
    value.mcpServers = {};
  }
  return value;
}

async function upsertClaude(targetPath, server) {
  const filePath = path.join(targetPath, ".mcp.json");
  let existing = await readJsonOrDefault(filePath, { mcpServers: {} });
  existing = ensureMcpJsonShape(existing, filePath);
  existing.mcpServers[server.id] = renderSingleClaudeServer(server);
  await writeJsonFile(filePath, existing);
  return filePath;
}

async function upsertCursor(targetPath, server) {
  const filePath = path.join(targetPath, ".cursor", "mcp.json");
  let existing = await readJsonOrDefault(filePath, { mcpServers: {} });
  existing = ensureMcpJsonShape(existing, filePath);
  existing.mcpServers[server.id] = renderSingleCursorServer(server);
  await writeJsonFile(filePath, existing);
  return filePath;
}

async function upsertCodex(targetPath, server) {
  const filePath = path.join(targetPath, ".codex", "config.toml");
  const raw = await readTextOrDefault(filePath, "");
  const parsed = parseCodexConfig(raw);
  const rendered = renderSingleCodexServer(server);

  if (!parsed.servers.has(server.id)) {
    parsed.order.push(server.id);
  }
  parsed.servers.set(server.id, { top: { ...rendered }, env: {} });

  await writeCodexConfig(filePath, parsed, { sortServers: false });
  await writeCodexWrappers(targetPath);
  return filePath;
}

const { positionals, options } = parseCliArgs(process.argv.slice(2));
if (options.help || options.h) {
  usage();
  process.exit(0);
}
if (positionals.length !== 1) {
  usage();
  fail("Expected exactly one <server-id> positional argument.");
}

const serverId = positionals[0];
const targetPath = parseTargetPath(options.target, { defaultToCwd: true });
const useGlobal = Boolean(options.global || options.g);
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

const byId = indexServersById(catalog.servers);
if (!byId.has(serverId)) {
  const known = [...byId.keys()].sort((a, b) => a.localeCompare(b)).join(", ");
  fail(`Unknown server "${serverId}". Available IDs: ${known}`);
}

const server = byId.get(serverId);
if (!server.enabled) {
  fail(`Server "${serverId}" exists but is disabled.`);
}

const written = [];
for (const client of selectedClients) {
  if (!serverSupportsClient(server, client)) {
    console.log(`Skipping ${client}: ${serverId} does not target this client.`);
    continue;
  }

  if (client === "claude") {
    written.push(await upsertClaude(targetPath, server));
    continue;
  }
  if (client === "cursor") {
    written.push(await upsertCursor(targetPath, server));
    continue;
  }
  if (client === "codex") {
    written.push(await upsertCodex(targetPath, server));
  }
}

console.log(`Added/updated "${serverId}" for ${selectedClients.join(", ")} in ${targetPath}`);
for (const filePath of written) {
  console.log(`- ${filePath}`);
}

if (useGlobal) {
  const { written: globalWritten, unsupported } = await applyGlobalActions({
    mode: "add",
    selectedAgents: selectedClients,
    server
  });

  if (globalWritten.length > 0) {
    console.log("Global updates:");
    for (const filePath of globalWritten) {
      console.log(`- ${filePath}`);
    }
  }

  if (unsupported.length > 0) {
    console.log(`No global setup implemented yet for: ${unsupported.join(", ")}`);
  }
}
