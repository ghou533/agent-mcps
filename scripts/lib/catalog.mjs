import { CATALOG_PATH, readJsonFile } from "./common.mjs";

const SERVER_REQUIRED_FIELDS = [
  "id",
  "description",
  "transport",
  "envVars",
  "clients",
  "enabled",
  "versionPolicy"
];

const SERVER_ALLOWED_FIELDS = new Set([
  ...SERVER_REQUIRED_FIELDS,
  "command",
  "args",
  "url"
]);

const ALLOWED_TRANSPORTS = new Set(["stdio", "http"]);
const ALLOWED_CLIENTS = new Set(["claude", "codex", "cursor"]);
const ALLOWED_VERSION_POLICIES = new Set(["pinned"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export async function loadCatalog() {
  return readJsonFile(CATALOG_PATH);
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return ["Catalog root must be an object."];
  }

  if (!Number.isInteger(catalog.version) || catalog.version < 1) {
    errors.push("`version` must be an integer >= 1.");
  }

  if (!Array.isArray(catalog.servers)) {
    errors.push("`servers` must be an array.");
    return errors;
  }

  const seenIds = new Set();

  catalog.servers.forEach((server, index) => {
    const path = `servers[${index}]`;
    if (!server || typeof server !== "object" || Array.isArray(server)) {
      errors.push(`${path} must be an object.`);
      return;
    }

    for (const key of Object.keys(server)) {
      if (!SERVER_ALLOWED_FIELDS.has(key)) {
        errors.push(`${path}.${key} is not allowed.`);
      }
    }

    for (const field of SERVER_REQUIRED_FIELDS) {
      if (!(field in server)) {
        errors.push(`${path}.${field} is required.`);
      }
    }

    if (typeof server.id !== "string" || !ID_PATTERN.test(server.id)) {
      errors.push(`${path}.id must match ${ID_PATTERN}.`);
    } else if (seenIds.has(server.id)) {
      errors.push(`${path}.id "${server.id}" is duplicated.`);
    } else {
      seenIds.add(server.id);
    }

    if (typeof server.description !== "string" || server.description.trim() === "") {
      errors.push(`${path}.description must be a non-empty string.`);
    }

    if (!ALLOWED_TRANSPORTS.has(server.transport)) {
      errors.push(`${path}.transport must be one of: stdio, http.`);
    }

    if (!Array.isArray(server.envVars)) {
      errors.push(`${path}.envVars must be an array.`);
    } else {
      const envSeen = new Set();
      for (const envVar of server.envVars) {
        if (typeof envVar !== "string" || !ENV_VAR_PATTERN.test(envVar)) {
          errors.push(`${path}.envVars contains invalid name "${envVar}".`);
          continue;
        }
        if (envSeen.has(envVar)) {
          errors.push(`${path}.envVars contains duplicate "${envVar}".`);
          continue;
        }
        envSeen.add(envVar);
      }
    }

    if (!Array.isArray(server.clients) || server.clients.length === 0) {
      errors.push(`${path}.clients must be a non-empty array.`);
    } else {
      const clientSeen = new Set();
      for (const client of server.clients) {
        if (!ALLOWED_CLIENTS.has(client)) {
          errors.push(`${path}.clients contains unknown client "${client}".`);
          continue;
        }
        if (clientSeen.has(client)) {
          errors.push(`${path}.clients contains duplicate "${client}".`);
          continue;
        }
        clientSeen.add(client);
      }
    }

    if (typeof server.enabled !== "boolean") {
      errors.push(`${path}.enabled must be boolean.`);
    }

    if (!ALLOWED_VERSION_POLICIES.has(server.versionPolicy)) {
      errors.push(`${path}.versionPolicy must be "pinned".`);
    }

    if (server.transport === "stdio") {
      if (typeof server.command !== "string" || server.command.trim() === "") {
        errors.push(`${path}.command is required for stdio transport.`);
      }
      if (!Array.isArray(server.args)) {
        errors.push(`${path}.args must be an array for stdio transport.`);
      } else if (!server.args.every((arg) => typeof arg === "string")) {
        errors.push(`${path}.args must contain only strings.`);
      }
      if (server.command === "npx" && Array.isArray(server.args)) {
        const pkgArg = server.args.find((arg) => !arg.startsWith("-"));
        if (!pkgArg) {
          errors.push(`${path}.args must include a package spec when command is npx.`);
        } else {
          const atIndex = pkgArg.lastIndexOf("@");
          if (atIndex <= 0 || atIndex === pkgArg.length - 1) {
            errors.push(`${path}.args package spec "${pkgArg}" must pin an explicit version.`);
          } else if (pkgArg.endsWith("@latest")) {
            errors.push(`${path}.args package spec "${pkgArg}" cannot use @latest.`);
          }
        }
      }
    }

    if (server.transport === "http") {
      if (typeof server.url !== "string" || server.url.trim() === "") {
        errors.push(`${path}.url is required for http transport.`);
      }
    }
  });

  return errors;
}

export function sortServersById(servers) {
  return [...servers].sort((a, b) => a.id.localeCompare(b.id));
}

export function indexServersById(servers) {
  const map = new Map();
  for (const server of servers) {
    map.set(server.id, server);
  }
  return map;
}
