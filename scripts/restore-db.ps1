param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile,

  [switch]$Clean
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required."
}

if (-not (Test-Path $BackupFile -PathType Leaf)) {
  throw "Backup file not found: $BackupFile"
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw "pg_restore was not found in PATH."
}

pg_restore --list $BackupFile | Out-Null

if ($LASTEXITCODE -ne 0) {
  throw "Backup verification failed. Restore aborted."
}

$arguments = @(
  "--dbname=$env:DATABASE_URL"
  "--no-owner"
  "--no-privileges"
)

if ($Clean) {
  $arguments += "--clean"
  $arguments += "--if-exists"
}

$arguments += $BackupFile

pg_restore @arguments

if ($LASTEXITCODE -ne 0) {
  throw "Database restore failed."
}

Write-Host "Database restore completed successfully."
