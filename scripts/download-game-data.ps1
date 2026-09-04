param(
  [string]$Revision = 'c50a1eb892f4a1ad9bb35c147801658804be2cc2'
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$downloadDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "mhdb-wilds-data-$([guid]::NewGuid().ToString('N'))"
$builder = Join-Path $PSScriptRoot 'update-game-data.ps1'

$sourceFiles = @(
  'Item.json',
  'LargeMonsters.json',
  'Stage.json',
  'Species.json',
  'PartNames.json',
  'Armor.json',
  'Amulet.json',
  'weapons/Bow.json',
  'weapons/ChargeBlade.json',
  'weapons/DualBlades.json',
  'weapons/GreatSword.json',
  'weapons/Gunlance.json',
  'weapons/Hammer.json',
  'weapons/HeavyBowgun.json',
  'weapons/HuntingHorn.json',
  'weapons/InsectGlaive.json',
  'weapons/Lance.json',
  'weapons/LightBowgun.json',
  'weapons/LongSword.json',
  'weapons/SwitchAxe.json',
  'weapons/SwordShield.json'
)

try {
  New-Item -ItemType Directory -Force -Path $downloadDirectory | Out-Null

  foreach ($relativePath in $sourceFiles) {
    $destination = Join-Path $downloadDirectory $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null

    $encodedPath = ($relativePath -split '/') -join '/'
    $url = "https://raw.githubusercontent.com/LartTyler/mhdb-wilds-data/$Revision/output/merged/$encodedPath"
    Write-Host "ダウンロード中: $relativePath"
    Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
  }

  Push-Location $projectDirectory
  try {
    & $builder -MergedDataDirectory $downloadDirectory -SourceRevision $Revision
  }
  finally {
    Pop-Location
  }
}
finally {
  if (Test-Path -LiteralPath $downloadDirectory) {
    Remove-Item -LiteralPath $downloadDirectory -Recurse -Force
  }
}
