$ErrorActionPreference="SilentlyContinue"
$Root=(Get-Location).Path
$BP=Join-Path $Root "RideGrid_Master_Blueprint_v2.0_COMPLETE (3).docx"
$Out=Join-Path $Root "ridegrid-audit\REAL-BLUEPRINT-V2"
New-Item -ItemType Directory -Force $Out|Out-Null
if(!(Test-Path $BP)){throw "BLUEPRINT NOT FOUND: $BP"}

$word=New-Object -ComObject Word.Application
$word.Visible=$false
$doc=$word.Documents.Open($BP,$false,$true)
$BT=$doc.Content.Text
$doc.Close();$word.Quit()
$BT|Set-Content "$Out\BLUEPRINT.txt" -Encoding UTF8

$exclude='\\(node_modules|\.next|\.git|ridegrid-audit|\.agents)\\'
$Files=Get-ChildItem $Root -Recurse -File|Where-Object{
 $_.FullName -notmatch $exclude -and $_.Extension -in '.ts','.tsx','.js','.jsx','.prisma','.sql','.json','.yml','.yaml','.md'
}

$Data=@{}
foreach($f in $Files){
 try{$Data[$f.FullName]=(Get-Content $f.FullName -Raw)}catch{}
}

$Modules=@(
'Platform Architecture','Database Architecture','Authentication & RBAC','Notification Engine','AI Engine','Event Bus',
'Customer Module','Vendor Module','Driver Module','Vehicle Module','Marketplace Listing Engine','Search Engine',
'Booking Engine','Smart Return','Digital Marketplace Twin','Pricing Engine','Wallet Engine','Payment Gateway',
'Settlement Engine','Invoice Engine','Refund Engine','Penalty Engine','Corporate Module','Company Structure',
'Employee Module','Travel Policy Engine','Approval Workflow','Budget Management','Cost Center Management',
'Corporate Digital Twin','Lead Management','Account Management','Opportunity Management','Task & Activity Management',
'Reports','Business Intelligence','Analytics','Security','Compliance','Audit Logs','Support Ticket System',
'Document Management','File Management','Settings & Configuration','Monitoring & Logging','Admin Dashboard',
'Customer Website','Customer App','Vendor Portal & Vendor App','Driver App','Corporate Portal','Corporate App',
'API Catalogue','DevOps','CI/CD','Production Deployment','Backup & Disaster Recovery','Performance Optimization','Product Roadmap'
)

$Aliases=@{
'Platform Architecture'='app;lib;prisma;components'
'Database Architecture'='prisma/schema.prisma;prisma/migrations'
'Authentication & RBAC'='lib/auth;lib/security;lib/rbac;middleware;app/api/auth'
'Notification Engine'='lib/notification;lib/notifications;app/api/notifications;notifications'
'AI Engine'='lib/ai;app/api/ai'
'Event Bus'='lib/events;event;dispatcher'
'Customer Module'='customer;customers'
'Vendor Module'='vendor;vendors'
'Driver Module'='driver;drivers'
'Vehicle Module'='vehicle;vehicles'
'Marketplace Listing Engine'='marketplace;listing'
'Search Engine'='search;marketplace'
'Booking Engine'='booking;bookings'
'Smart Return'='smart-return;smartreturn'
'Digital Marketplace Twin'='marketplace;twin'
'Pricing Engine'='pricing'
'Wallet Engine'='wallet'
'Payment Gateway'='payment;payments'
'Settlement Engine'='settlement;settlements'
'Invoice Engine'='invoice;invoices'
'Refund Engine'='refund;refunds'
'Penalty Engine'='penalty;penalties'
'Corporate Module'='corporate'
'Company Structure'='corporate;company;branch;department'
'Employee Module'='employee;employees'
'Travel Policy Engine'='travel-policy;travelpolicy;policy'
'Approval Workflow'='approval;approvals;workflow'
'Budget Management'='budget'
'Cost Center Management'='cost-center;costcenter'
'Corporate Digital Twin'='corporate;twin;analytics'
'Lead Management'='crm;lead;leads'
'Account Management'='crm;account;accounts'
'Opportunity Management'='crm;opportunity;opportunities'
'Task & Activity Management'='crm;task;tasks;activity;activities'
'Reports'='reports'
'Business Intelligence'='analytics;bi;dashboard'
'Analytics'='analytics'
'Security'='security'
'Compliance'='compliance;kyc'
'Audit Logs'='audit'
'Support Ticket System'='support;tickets'
'Document Management'='document;documents'
'File Management'='file;files;media;storage'
'Settings & Configuration'='settings;configuration;config'
'Monitoring & Logging'='monitoring;logging;health'
'Admin Dashboard'='dashboard;admin'
'API Catalogue'='docs/api;API_CATALOGUE;app/api'
'DevOps'='Dockerfile;docker;deployment'
'CI/CD'='.github/workflows;ci.yml'
'Production Deployment'='deployment;production;Dockerfile'
'Backup & Disaster Recovery'='backup;restore;disaster'
'Performance Optimization'='cache;performance;optimization'
'Product Roadmap'='roadmap'
}

$Rows=@()
for($i=0;$i -lt 59;$i++){
 $n=$i+1;$m=$Modules[$i]
 if($n -ge 47 -and $n -le 52){
  $Rows+=New-Object psobject -Property @{Module=$n;Name=$m;Status='EXCLUDED';Evidence='Website/App excluded from current build'}
  continue
 }

 $terms=$Aliases[$m]
 $hits=@()
 foreach($t in ($terms -split ';')){
  $hits += $Files|Where-Object{
   $_.Name -like "*$t*" -or $_.DirectoryName -like "*$t*"
  }
 }
 $hits=$hits|Sort-Object FullName -Unique

 $real=$hits|Where-Object{
  $_.FullName -notmatch '\\docs\\|\\data\\' -or
  $_.Extension -in '.ts','.tsx','.js','.jsx','.prisma','.sql'
 }

 if($real.Count -ge 3){
  $s='IMPLEMENTED-EVIDENCE'
 }elseif($real.Count -gt 0){
  $s='NEEDS-VERIFICATION'
 }else{
  $s='MISSING-EVIDENCE'
 }

 $ev=($real|Select-Object -First 8|ForEach-Object{
  $_.FullName.Substring($Root.Length).TrimStart('\')
 }) -join ' | '

 $Rows+=New-Object psobject -Property @{Module=$n;Name=$m;Status=$s;Evidence=$ev}
}

$Rows|Export-Csv "$Out\MODULE-AUDIT.csv" -NoTypeInformation -Encoding UTF8

$api=(Get-ChildItem "$Root\app\api" -Recurse -File -ErrorAction SilentlyContinue|Where-Object{$_.Name -match '^route\.'})
$prisma=Get-Content "$Root\prisma\schema.prisma" -Raw
$models=([regex]::Matches($prisma,'(?m)^\s*model\s+\w+')).Count
$enums=([regex]::Matches($prisma,'(?m)^\s*enum\s+\w+')).Count
$tests=$Files|Where-Object{$_.Name -match '\.(test|spec)\.'}
$services=$Files|Where-Object{$_.FullName -match '\\lib\\services\\'}
$repos=$Files|Where-Object{$_.FullName -match '\\lib\\repositories\\'}

$R=@"
# RIDEGRID — MASTER BLUEPRINT V2 REAL LIVE AUDIT

Blueprint: $BP
Project: $Root
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## RESULT

IMPLEMENTED EVIDENCE : $(($Rows|Where-Object Status -eq 'IMPLEMENTED-EVIDENCE').Count)
NEEDS VERIFICATION   : $(($Rows|Where-Object Status -eq 'NEEDS-VERIFICATION').Count)
MISSING EVIDENCE     : $(($Rows|Where-Object Status -eq 'MISSING-EVIDENCE').Count)
EXCLUDED             : $(($Rows|Where-Object Status -eq 'EXCLUDED').Count)

## LIVE PROJECT

Files inspected: $($Files.Count)
API routes: $($api.Count)
Prisma models: $models
Prisma enums: $enums
Service files: $($services.Count)
Repository files: $($repos.Count)
Test files: $($tests.Count)
Dockerfile: $(Test-Path "$Root\Dockerfile")
CI/CD: $(Test-Path "$Root\.github\workflows")

## MODULE STATUS

$(
$Rows|ForEach-Object{
"[$($_.Status)] MODULE $($_.Module) — $($_.Name)
Evidence: $($_.Evidence)
"
}
)

## IMPORTANT

This is an implementation-evidence audit, not a claim that runtime behavior is certified.
No application source code was modified.
Website/App Modules 47-52 are intentionally excluded.
.agents, node_modules, .next, .git and previous audit output were excluded as implementation evidence.
"@

$R|Set-Content "$Out\FINAL-AUDIT.md" -Encoding UTF8

# Compact console output — prevents cutoff
Write-Host "`n===== REAL BLUEPRINT V2 AUDIT COMPLETE =====" -ForegroundColor Green
$Rows|Group-Object Status|Select Name,Count|Format-Table
Write-Host "`nFULL REPORT:" -ForegroundColor Cyan
Write-Host "$Out\FINAL-AUDIT.md"
Write-Host "`nCSV:" -ForegroundColor Cyan
Write-Host "$Out\MODULE-AUDIT.csv"
