param(
  [Parameter(Mandatory = $true)]
  [string]$MergedDataDirectory,
  [string]$SourceRevision
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$builder = Join-Path $PSScriptRoot 'internal\build-site-data.mjs'

Push-Location $projectDirectory
try {
  if ($SourceRevision) {
    node $builder $MergedDataDirectory $SourceRevision
  }
  else {
    node $builder $MergedDataDirectory
  }
}
finally {
  Pop-Location
}
