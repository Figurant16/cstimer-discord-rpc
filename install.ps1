# Usage: powershell -ExecutionPolicy Bypass -File install.ps1 <discord_application_id>
#        powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall
param(
  [string]$ClientId,
  [string[]]$RegistryKey = @(),
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$HostName = 'local.cstimer_discord_rpc'
$ExtensionId = 'maceonlipciopmaiampojajefeebaibk'
$HostDir = Join-Path $PSScriptRoot 'host'
$ManifestPath = Join-Path $HostDir "$HostName.json"
$Browsers = @(
  'Google\Chrome',
  'Chromium',
  'BraveSoftware\Brave-Browser',
  'Microsoft\Edge',
  'Vivaldi'
) + $RegistryKey
$Keys = $Browsers | ForEach-Object { "HKCU:\Software\$_\NativeMessagingHosts\$HostName" }

if ($Uninstall) {
  $Keys | Where-Object { Test-Path $_ } | ForEach-Object { Remove-Item $_ -Force }
  Write-Host 'Native host uninstalled.'
  exit 0
}

if ($ClientId -notmatch '^[0-9]+$') {
  Write-Error 'Usage: install.ps1 <discord_application_id>'
}

# PowerShell 5 adds a BOM with -Encoding UTF8, which JSON.parse rejects.
function Write-TextFile($Path, $Text) {
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

$Node = (Get-Command node).Source

Write-TextFile (Join-Path $HostDir 'config.json') "{ `"clientId`": `"$ClientId`" }`r`n"
Write-TextFile (Join-Path $HostDir 'run.bat') "@echo off`r`n`"$Node`" `"%~dp0host.js`"`r`n"
Write-TextFile $ManifestPath @"
{
  "name": "$HostName",
  "description": "csTimer Discord RPC",
  "path": "run.bat",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$ExtensionId/"]
}
"@

foreach ($Key in $Keys) {
  New-Item -Path $Key -Force | Out-Null
  Set-Item -Path $Key -Value $ManifestPath
  Write-Host "Native host registered: $Key"
}
