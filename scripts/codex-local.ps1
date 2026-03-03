$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$env:CODEX_HOME = Join-Path $projectRoot ".codex"

& codex @args
exit $LASTEXITCODE
