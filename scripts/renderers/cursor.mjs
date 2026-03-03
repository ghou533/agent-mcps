import { envMapFromNames } from "../lib/common.mjs";

function renderCursorServer(server) {
  if (server.transport === "stdio") {
    return {
      command: server.command,
      args: [...server.args],
      env: envMapFromNames(server.envVars)
    };
  }

  return {
    url: server.url
  };
}

export function renderCursorConfig(servers) {
  const sorted = [...servers].sort((a, b) => a.id.localeCompare(b.id));
  const mcpServers = {};
  for (const server of sorted) {
    mcpServers[server.id] = renderCursorServer(server);
  }
  return { mcpServers };
}

export function renderSingleCursorServer(server) {
  return renderCursorServer(server);
}
