param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile -PathType Leaf)) {
  throw "Backup file not found: $BackupFile"
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw "pg_restore was not found in PATH."
}

pg_restore --list $BackupFile | Out-Null

if ($LASTEXITCODE -ne 0) {
  throw "Backup verification failed."
}

Write-Host "Backup verification PASS: $BackupFile"
