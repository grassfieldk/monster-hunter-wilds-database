param(
  [Parameter(Mandatory = $true)]
  [string]$MergedDataDirectory
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$builder = Join-Path $PSScriptRoot 'internal\build-site-data.mjs'

Push-Location $projectDirectory
try {
  node $builder $MergedDataDirectory
}
finally {
  Pop-Location
}
