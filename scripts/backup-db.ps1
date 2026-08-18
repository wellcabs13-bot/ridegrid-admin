param(
  [string]$Output = "./backups",
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required."
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw "pg_dump was not found in PATH."
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw "pg_restore was not found in PATH."
}

New-Item -ItemType Directory -Force -Path $Output | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $Output "ridegrid-$stamp.dump"

pg_dump $env:DATABASE_URL --format=custom --file=$outFile

if ($LASTEXITCODE -ne 0) {
  if (Test-Path $outFile) {
    Remove-Item $outFile -Force
  }
  throw "Database backup failed."
}

pg_restore --list $outFile | Out-Null

if ($LASTEXITCODE -ne 0) {
  Remove-Item $outFile -Force
  throw "Backup verification failed."
}

$cutoff = (Get-Date).AddDays(-$RetentionDays)

Get-ChildItem -Path $Output -Filter "ridegrid-*.dump" -File |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Host "Backup created: $outFile"
Write-Host "Backup verified successfully."
Write-Host "Retention: $RetentionDays days."
