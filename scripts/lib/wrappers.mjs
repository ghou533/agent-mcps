import fs from "node:fs/promises";
import path from "node:path";
import { writeTextFile } from "./common.mjs";

const BASH_WRAPPER = `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "\${SCRIPT_DIR}/.." && pwd)"
export CODEX_HOME="\${PROJECT_ROOT}/.codex"

exec codex "$@"
`;

const POWERSHELL_WRAPPER = `$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$env:CODEX_HOME = Join-Path $projectRoot ".codex"

& codex @args
exit $LASTEXITCODE
`;

export async function writeCodexWrappers(targetProjectPath) {
  const scriptsDir = path.join(targetProjectPath, "scripts");
  const bashPath = path.join(scriptsDir, "codex-local");
  const psPath = path.join(scriptsDir, "codex-local.ps1");

  await writeTextFile(bashPath, BASH_WRAPPER);
  await fs.chmod(bashPath, 0o755);
  await writeTextFile(psPath, POWERSHELL_WRAPPER);
}

export function getCodexWrapperContents() {
  return {
    bash: BASH_WRAPPER,
    powershell: POWERSHELL_WRAPPER
  };
}
