#!/usr/bin/env node
import { parseCliArgs } from "./lib/common.mjs";
import { loadCatalog, sortServersById, validateCatalog } from "./lib/catalog.mjs";

const { options } = parseCliArgs(process.argv.slice(2));
const asJson = Boolean(options.json || options.j);

const catalog = await loadCatalog();
const errors = validateCatalog(catalog);

if (errors.length > 0) {
  console.error("Catalog validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const servers = sortServersById(catalog.servers);

if (asJson) {
  console.log(JSON.stringify(servers, null, 2));
  process.exit(0);
}

if (servers.length === 0) {
  console.log("No MCP servers found in catalog.");
  process.exit(0);
}

console.log(`MCP servers in catalog (${servers.length}):`);
for (const server of servers) {
  const clients = server.clients.join(",");
  const target = server.transport === "stdio" ? `${server.command} ${server.args.join(" ")}` : server.url;
  console.log(`- ${server.id} | ${server.transport} | ${server.enabled ? "enabled" : "disabled"} | clients=${clients}`);
  console.log(`  install: agent-mcps add ${server.id}`);
  console.log(`  target: ${target}`);
}
