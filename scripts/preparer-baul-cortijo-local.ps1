$ErrorActionPreference = "Stop"

$Documents = [Environment]::GetFolderPath("MyDocuments")
$BaulRoot = if ($env:CORTIJO_BAUL_DIR) { $env:CORTIJO_BAUL_DIR } else { Join-Path $Documents "FINCA_MARIA\BAUL_PRIVE" }
$Inbox = Join-Path $BaulRoot "00_A_CLASSER\00_RECEPTION_A_VALIDER"
$Validated = Join-Path $BaulRoot "01_CLASSES_VALIDES"
$Exports = Join-Path $BaulRoot "02_EXPORTS_PREPARES"
$Originals = Join-Path $BaulRoot "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB"

$Folders = @(
  "01_FACTURES",
  "02_AGRI_SAN_JUAN",
  "03_PAC_SUBVENTIONS",
  "04_PELAEZ",
  "05_PHOTOS_VIDEOS_TERRAIN",
  "06_CASA_MAISON_LOCATION",
  "07_REUNIONS_DECISIONS",
  "08_WHATSAPP_MAILS_CAPTURE",
  "09_CADASTRE_SIGPAC_PLANS",
  "10_A_VERIFIER_URGENT"
)

@($Inbox, $Validated, $Exports, $Originals) | ForEach-Object {
  New-Item -ItemType Directory -Force -Path $_ | Out-Null
}

foreach ($Folder in $Folders) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Validated $Folder) | Out-Null
}

$Readme = Join-Path $BaulRoot "A_LIRE_BAUL_CORTIJO.txt"
@"
BAUL PRIVE — FINCA MARIA

Ce dossier contient les documents reels du projet Finca Maria.
Il reste local sur cet ordinateur et ne doit pas etre envoye sur GitHub.

CHEMIN PRINCIPAL
$BaulRoot

ORGANISATION
00_A_CLASSER\00_RECEPTION_A_VALIDER
  Documents recus par le logiciel en attente de validation.

01_CLASSES_VALIDES
  Documents ranges apres confirmation humaine.

02_EXPORTS_PREPARES
  Index et dossiers prepares pour une transmission.

99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB
  Originaux conserves. Ne pas supprimer.

REGLE
Le BAUL peut proposer un classement, mais une personne doit le valider.
"@ | Set-Content -Encoding UTF8 -Path $Readme

$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Ouvrir BAUL Finca Maria.lnk"
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BaulRoot
$Shortcut.WorkingDirectory = $BaulRoot
$Shortcut.Description = "Ouvrir le BAUL prive Finca Maria"
$Shortcut.Save()

$StartMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
New-Item -ItemType Directory -Force -Path $StartMenu | Out-Null
$StartShortcutPath = Join-Path $StartMenu "Ouvrir BAUL Finca Maria.lnk"
$StartShortcut = $Shell.CreateShortcut($StartShortcutPath)
$StartShortcut.TargetPath = $BaulRoot
$StartShortcut.WorkingDirectory = $BaulRoot
$StartShortcut.Description = "Ouvrir le BAUL prive Finca Maria"
$StartShortcut.Save()

Write-Host "BAUL Finca Maria pret." -ForegroundColor Green
Write-Host "Dossier : $BaulRoot"
Write-Host "Sas a valider : $Inbox"
Write-Host "Raccourci bureau : $ShortcutPath"
