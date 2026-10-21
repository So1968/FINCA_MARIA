$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$AppDir = Join-Path $ProjectRoot "app"
$Url = "http://127.0.0.1:5173/"
$PrepareBaul = Join-Path $ScriptDir "preparer-baul-cortijo-local.ps1"
$LogFile = Join-Path $env:TEMP "cortijo-alemanes-local.log"

if (-not (Test-Path (Join-Path $AppDir "package.json"))) {
  Write-Host "Application Cortijo introuvable : $AppDir" -ForegroundColor Red
  Read-Host "Appuie sur Entree pour fermer"
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm n'est pas installe. Installe Node.js puis relance Cortijo." -ForegroundColor Red
  Read-Host "Appuie sur Entree pour fermer"
  exit 1
}


function Test-CortijoServer {
  try {
    $Identity = Invoke-RestMethod -Uri ($Url + "api/finca/local-identity") -TimeoutSec 1
    return $Identity.application -eq "finca-maria" -and $Identity.checkout -eq $AppDir
  } catch {
    return $false
  }
}

if (-not (Test-CortijoServer)) {
  $Occupied = $false
  try { Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1 | Out-Null; $Occupied = $true } catch { if ($_.Exception.Response) { $Occupied = $true } }
  if ($Occupied) { throw "Le port 5173 est occupe par une autre application ou une autre copie de FINCA MARIA." }
  $Command = @"
Set-Location '$AppDir'
if (-not (Test-Path 'node_modules')) { npm ci }
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort *>&1 | Tee-Object -FilePath '$LogFile'
"@

  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $Command
  ) -WorkingDirectory $AppDir

  for ($i = 0; $i -lt 45; $i++) {
    if (Test-CortijoServer) { break }
    Start-Sleep -Seconds 1
  }
}

if (-not (Test-CortijoServer)) {
  Write-Host "Cortijo n'a pas demarre." -ForegroundColor Red
  Write-Host "Journal : $LogFile"
  if (Test-Path $LogFile) {
    Get-Content $LogFile -Tail 15
  }
  Read-Host "Appuie sur Entree pour fermer"
  exit 1
}

Start-Process $Url
Write-Host "Cortijo ouvert : $Url" -ForegroundColor Green
