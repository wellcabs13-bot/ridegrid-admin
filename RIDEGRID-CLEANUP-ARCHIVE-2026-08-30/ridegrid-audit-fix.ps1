$ErrorActionPreference = "Continue"
$Root = Get-Location
$Out = Join-Path $Root "ridegrid-audit"
$ApiFiles = @(Get-ChildItem "$Root\app\api" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "route\.(ts|tsx|js|jsx)$" })

$SecurityGapRoutes = @()

foreach ($File in $ApiFiles) {
    $Text = (Get-Content $File.FullName -ErrorAction SilentlyContinue) -join "`n"

    $HasAuth =
        $Text -match "getServerSession" -or
        $Text -match "auth\(" -or
        $Text -match "authenticate" -or
        $Text -match "requireAuth" -or
        $Text -match "verifyToken" -or
        $Text -match "getUser" -or
        $Text -match "session"

    if (-not $HasAuth) {
        $SecurityGapRoutes += $File.FullName.Substring($Root.Path.Length).TrimStart("\")
    }
}

$SecurityGapRoutes | Set-Content "$Out\api-security-gaps.txt"

@"
# Phase 1 Security Scan

API routes scanned: $($ApiFiles.Count)
Routes without detected authentication: $($SecurityGapRoutes.Count)

## Routes

$($SecurityGapRoutes -join "`n")

NOTE:
This is a static detection scan only. Each flagged route must be manually verified before modification.
"@ | Set-Content "$Out\PHASE1-SECURITY-REPORT.md"

Write-Host "`nPHASE 1 SECURITY RESCAN COMPLETE" -ForegroundColor Green
Get-Content "$Out\PHASE1-SECURITY-REPORT.md"
