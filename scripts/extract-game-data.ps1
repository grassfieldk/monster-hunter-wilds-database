param(
  [string]$GameDirectory
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$toolkitDirectory = Join-Path $projectDirectory 'tools\mhdb-wilds-data'

if (-not $GameDirectory) {
  $gameDirectoryCandidates = @()

  if ($env:MH_WILDS_GAME_DIR) {
    $gameDirectoryCandidates += $env:MH_WILDS_GAME_DIR
  }

  $steamSettings = Get-ItemProperty -Path 'HKCU:\Software\Valve\Steam' -ErrorAction SilentlyContinue
  if ($steamSettings.SteamPath) {
    $steamDirectory = $steamSettings.SteamPath
    $gameDirectoryCandidates += Join-Path $steamDirectory 'steamapps\common\MonsterHunterWilds'
    $libraryFile = Join-Path $steamDirectory 'steamapps\libraryfolders.vdf'

    if (Test-Path -LiteralPath $libraryFile) {
      foreach ($match in Select-String -LiteralPath $libraryFile -Pattern '"path"\s+"([^"]+)"' -AllMatches) {
        foreach ($library in $match.Matches) {
          $libraryDirectory = $library.Groups[1].Value.Replace('\\', '\')
          $gameDirectoryCandidates += Join-Path $libraryDirectory 'steamapps\common\MonsterHunterWilds'
        }
      }
    }
  }

  $GameDirectory = $gameDirectoryCandidates |
    Where-Object { Test-Path -LiteralPath (Join-Path $_ 're_chunk_000.pak') } |
    Select-Object -First 1
}

if (-not $GameDirectory) {
  throw 'ゲームのインストール先を検出できません。GameDirectory 引数または MH_WILDS_GAME_DIR を指定してください'
}

$mainPak = Join-Path $GameDirectory 're_chunk_000.pak'

if (-not (Test-Path -LiteralPath $mainPak)) {
  throw "ゲームファイルが見つかりません: $mainPak"
}

if (-not (Test-Path -LiteralPath $toolkitDirectory)) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $toolkitDirectory) | Out-Null
  git clone --depth 1 https://github.com/LartTyler/mhdb-wilds-data.git $toolkitDirectory
}

$extractor = Join-Path $toolkitDirectory 'tools\ree-pak-gui\ree-pak-gui.exe'
$nativeData = Join-Path $toolkitDirectory 'data\natives'

Write-Host '抽出画面でゲームフォルダー内の PAK ファイルを追加してください'
Write-Host '出力先には toolkit の data フォルダーを指定し、user と msg ファイルを抽出してください'
Start-Process -FilePath $extractor -Wait

if (-not (Test-Path -LiteralPath $nativeData)) {
  throw "抽出データが見つかりません: $nativeData"
}

Push-Location $toolkitDirectory
try {
  & .\extract.bat
  & .\merge.bat
}
finally {
  Pop-Location
}

& (Join-Path $PSScriptRoot 'update-game-data.ps1') -MergedDataDirectory (Join-Path $toolkitDirectory 'output\merged')
