function renderCodexServer(server) {
  if (server.transport === "stdio") {
    const out = {
      command: server.command,
      args: [...server.args]
    };
    if (server.envVars.length > 0) {
      out.env_vars = [...server.envVars];
    }
    return out;
  }

  return {
    url: server.url
  };
}

export function renderSingleCodexServer(server) {
  return renderCodexServer(server);
}

export function renderCodexServersById(servers) {
  const out = {};
  for (const server of [...servers].sort((a, b) => a.id.localeCompare(b.id))) {
    out[server.id] = renderCodexServer(server);
  }
  return out;
}
