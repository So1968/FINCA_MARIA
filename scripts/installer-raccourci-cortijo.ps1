$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$Launcher = Join-Path $ScriptDir "ouvrir-cortijo-local.ps1"

if (-not (Test-Path $Launcher)) {
  Write-Host "Lanceur Cortijo introuvable : $Launcher" -ForegroundColor Red
  exit 1
}

$Shell = New-Object -ComObject WScript.Shell
$PowerShellPath = (Get-Command powershell).Source
$Arguments = "-ExecutionPolicy Bypass -File `"$Launcher`""

function New-CortijoShortcut([string]$ShortcutPath) {
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $PowerShellPath
  $Shortcut.Arguments = $Arguments
  $Shortcut.WorkingDirectory = $ProjectRoot
  $Shortcut.Description = "Ouvrir Finca Maria en local"
  $Shortcut.Save()
}

$Desktop = [Environment]::GetFolderPath("Desktop")
$DesktopShortcut = Join-Path $Desktop "Ouvrir Finca Maria.lnk"
New-CortijoShortcut $DesktopShortcut

$StartMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
New-Item -ItemType Directory -Force -Path $StartMenu | Out-Null
$StartShortcut = Join-Path $StartMenu "Ouvrir Finca Maria.lnk"
New-CortijoShortcut $StartShortcut

Write-Host "Raccourci Finca Maria installe." -ForegroundColor Green
Write-Host "Bureau : $DesktopShortcut"
Write-Host "Menu Demarrer : $StartShortcut"
