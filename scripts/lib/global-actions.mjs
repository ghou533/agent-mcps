import os from "node:os";
import path from "node:path";
import { readTextOrDefault } from "./common.mjs";
import { parseCodexConfig, writeCodexConfig } from "./codex-config.mjs";
import { renderSingleCodexServer } from "../renderers/codex.mjs";

function getCodexGlobalConfigPath() {
  return path.join(os.homedir(), ".codex", "config.toml");
}

async function upsertCodexGlobalServers(servers) {
  if (!servers || servers.length === 0) {
    return null;
  }

  const filePath = getCodexGlobalConfigPath();
  const raw = await readTextOrDefault(filePath, "");
  const parsed = parseCodexConfig(raw);

  for (const server of servers) {
    const rendered = renderSingleCodexServer(server);
    if (!parsed.servers.has(server.id)) {
      parsed.order.push(server.id);
    }
    parsed.servers.set(server.id, { top: { ...rendered }, env: {} });
  }

  await writeCodexConfig(filePath, parsed, { sortServers: false });
  return filePath;
}

const GLOBAL_AGENT_HANDLERS = {
  codex: {
    async add({ server }) {
      if (!server.clients.includes("codex")) {
        return null;
      }
      return upsertCodexGlobalServers([server]);
    },
    async sync({ codexServers }) {
      return upsertCodexGlobalServers(codexServers);
    }
  }
};

export async function applyGlobalActions({ mode, selectedAgents, server, codexServers }) {
  const written = [];
  const unsupported = [];

  for (const agent of selectedAgents) {
    const handler = GLOBAL_AGENT_HANDLERS[agent];
    if (!handler) {
      unsupported.push(agent);
      continue;
    }

    const filePath =
      mode === "add"
        ? await handler.add({ server })
        : await handler.sync({ codexServers });

    if (filePath) {
      written.push(filePath);
    }
  }

  return {
    written: [...new Set(written)],
    unsupported: [...new Set(unsupported)]
  };
}
