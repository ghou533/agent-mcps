#!/usr/bin/env node
import { loadCatalog, validateCatalog } from "./lib/catalog.mjs";

const catalog = await loadCatalog();
const errors = validateCatalog(catalog);

if (errors.length > 0) {
  console.error("Catalog validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Catalog is valid. ${catalog.servers.length} server(s) loaded.`);
