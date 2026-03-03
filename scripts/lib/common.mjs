import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_CLIENTS = ["claude", "codex", "cursor"];

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const CATALOG_PATH = path.join(REPO_ROOT, "catalog", "servers.json");

export function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

export function parseCliArgs(argv) {
  const args = {
    positionals: [],
    options: {}
  };

  function pushOption(key, value) {
    if (!(key in args.options)) {
      args.options[key] = value;
      return;
    }
    const existing = args.options[key];
    if (Array.isArray(existing)) {
      existing.push(value);
      return;
    }
    args.options[key] = [existing, value];
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      args.positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith("--")) {
      if (!token.startsWith("-") || token === "-") {
        args.positionals.push(token);
        continue;
      }

      const short = token.slice(1);
      const [rawKey, inlineValue] = short.split("=", 2);
      if (inlineValue !== undefined) {
        pushOption(rawKey, inlineValue);
        continue;
      }

      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        pushOption(rawKey, next);
        i += 1;
        continue;
      }

      pushOption(rawKey, true);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      pushOption(rawKey, inlineValue);
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("-")) {
      pushOption(rawKey, next);
      i += 1;
      continue;
    }

    pushOption(rawKey, true);
  }

  return args;
}

export function getOptionValues(options, key) {
  if (!(key in options)) {
    return [];
  }
  const value = options[key];
  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean);
  }
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseAgents(values) {
  const requested = values.map((v) => v.trim()).filter(Boolean);
  const unknown = requested.filter((client) => !ALLOWED_CLIENTS.includes(client));
  if (unknown.length > 0) {
    fail(`Unknown agent(s): ${unknown.join(", ")}. Allowed: ${ALLOWED_CLIENTS.join(", ")}.`);
  }

  if (requested.length === 0) {
    fail(`At least one agent is required. Allowed: ${ALLOWED_CLIENTS.join(", ")}.`);
  }

  return [...new Set(requested)];
}

export function parseTargetPath(value, options = {}) {
  const { defaultToCwd = false } = options;

  if (!value || typeof value !== "string") {
    if (defaultToCwd) {
      return path.resolve(process.cwd());
    }
    fail("Missing required `--target /absolute/path`.");
  }

  if (path.isAbsolute(value)) {
    return path.normalize(value);
  }

  return path.resolve(process.cwd(), value);
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function readJsonOrDefault(filePath, fallback) {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readTextOrDefault(filePath, fallback = "") {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeTextFile(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

export function envMapFromNames(envVars) {
  const out = {};
  for (const name of envVars) {
    out[name] = `\${${name}}`;
  }
  return out;
}

export function serverSupportsClient(server, client) {
  return server.enabled && server.clients.includes(client);
}
