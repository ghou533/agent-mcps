import { writeTextFile } from "./common.mjs";

const MCP_HEADER = /^mcp_servers\.([A-Za-z0-9_-]+)(?:\.(env))?$/;
const TABLE_HEADER = /^\s*\[([A-Za-z0-9_.-]+)\]\s*$/;

function parseTomlValue(raw) {
  const value = raw.trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return Number.parseFloat(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner === "") {
      return [];
    }
    const out = [];
    let current = "";
    let inString = false;
    let escaped = false;

    for (const ch of inner) {
      if (escaped) {
        current += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        current += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        current += ch;
        continue;
      }
      if (ch === "," && !inString) {
        out.push(parseTomlValue(current));
        current = "";
        continue;
      }
      current += ch;
    }
    out.push(parseTomlValue(current));
    return out;
  }

  return value;
}

function formatTomlValue(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatTomlValue(item)).join(", ")}]`;
  }
  throw new Error(`Unsupported TOML value type: ${typeof value}`);
}

function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { header: null, lines: [] };

  for (const line of lines) {
    const match = line.match(TABLE_HEADER);
    if (match) {
      sections.push(current);
      current = { header: match[1], lines: [line] };
      continue;
    }
    current.lines.push(line);
  }
  sections.push(current);
  return sections;
}

export function parseCodexConfig(text) {
  const sections = parseSections(text);
  const nonMcp = [];
  const servers = new Map();
  const order = [];

  for (const section of sections) {
    if (!section.header) {
      const content = section.lines.join("\n").trim();
      if (content !== "") {
        nonMcp.push(section.lines.join("\n").trimEnd());
      }
      continue;
    }

    const mcpMatch = section.header.match(MCP_HEADER);
    if (!mcpMatch) {
      nonMcp.push(section.lines.join("\n").trimEnd());
      continue;
    }

    const serverId = mcpMatch[1];
    const isEnv = mcpMatch[2] === "env";
    if (!servers.has(serverId)) {
      servers.set(serverId, { top: {}, env: {} });
      order.push(serverId);
    }
    const target = servers.get(serverId);

    for (let i = 1; i < section.lines.length; i += 1) {
      const rawLine = section.lines[i];
      const line = rawLine.trim();
      if (line === "" || line.startsWith("#")) {
        continue;
      }
      const eq = line.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = line.slice(0, eq).trim();
      const rawValue = line.slice(eq + 1);
      const parsed = parseTomlValue(rawValue);
      if (isEnv) {
        target.env[key] = parsed;
      } else {
        target.top[key] = parsed;
      }
    }
  }

  return {
    nonMcp,
    servers,
    order
  };
}

export function serializeCodexConfig(parsed, { sortServers = false } = {}) {
  const parts = [];
  for (const block of parsed.nonMcp) {
    const trimmed = block.trimEnd();
    if (trimmed !== "") {
      parts.push(trimmed);
    }
  }

  const ids = sortServers
    ? [...parsed.servers.keys()].sort((a, b) => a.localeCompare(b))
    : parsed.order.filter((id) => parsed.servers.has(id));

  for (const id of ids) {
    const server = parsed.servers.get(id);
    if (!server) {
      continue;
    }

    const lines = [`[mcp_servers.${id}]`];
    const keyOrder = ["command", "args", "url", "cwd", "startup_timeout_sec", "tool_timeout_sec", "env_vars"];
    const extraTopKeys = Object.keys(server.top).filter((k) => !keyOrder.includes(k)).sort((a, b) => a.localeCompare(b));

    for (const key of [...keyOrder, ...extraTopKeys]) {
      if (!(key in server.top)) {
        continue;
      }
      lines.push(`${key} = ${formatTomlValue(server.top[key])}`);
    }

    const envKeys = Object.keys(server.env).sort((a, b) => a.localeCompare(b));
    if (envKeys.length > 0) {
      lines.push("");
      lines.push(`[mcp_servers.${id}.env]`);
      for (const key of envKeys) {
        lines.push(`${key} = ${formatTomlValue(server.env[key])}`);
      }
    }

    parts.push(lines.join("\n"));
  }

  return `${parts.join("\n\n").trim()}\n`;
}

export function buildManagedCodexConfig(serversById) {
  const servers = new Map();
  const order = [];

  for (const id of Object.keys(serversById).sort((a, b) => a.localeCompare(b))) {
    servers.set(id, {
      top: { ...serversById[id] },
      env: {}
    });
    order.push(id);
  }

  return serializeCodexConfig({ nonMcp: [], servers, order }, { sortServers: true });
}

export async function writeCodexConfig(filePath, parsed, options) {
  const text = serializeCodexConfig(parsed, options);
  await writeTextFile(filePath, text);
}
