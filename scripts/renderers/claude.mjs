import { envMapFromNames } from "../lib/common.mjs";

function renderClaudeServer(server) {
  if (server.transport === "stdio") {
    return {
      type: "stdio",
      command: server.command,
      args: [...server.args],
      env: envMapFromNames(server.envVars)
    };
  }

  return {
    type: "http",
    url: server.url
  };
}

export function renderClaudeConfig(servers) {
  const sorted = [...servers].sort((a, b) => a.id.localeCompare(b.id));
  const mcpServers = {};
  for (const server of sorted) {
    mcpServers[server.id] = renderClaudeServer(server);
  }
  return { mcpServers };
}

export function renderSingleClaudeServer(server) {
  return renderClaudeServer(server);
}
