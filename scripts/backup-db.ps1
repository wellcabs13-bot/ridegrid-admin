param(
  [string]$Output = "./backups"
)

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required."
}

New-Item -ItemType Directory -Force -Path $Output | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $Output "ridegrid-$stamp.dump"

pg_dump $env:DATABASE_URL --format=custom --file=$outFile

if ($LASTEXITCODE -ne 0) {
  throw "Database backup failed."
}

Write-Host "Backup created: $outFile"
