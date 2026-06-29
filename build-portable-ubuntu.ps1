$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
if (-not $repoRoot) {
  $repoRoot = (Get-Location).Path
}

function Assert-InRepo {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path
  )

  $root = (Resolve-Path -LiteralPath $repoRoot).Path
  $full = if (Test-Path -LiteralPath $Path) {
    (Resolve-Path -LiteralPath $Path).Path
  } else {
    [System.IO.Path]::GetFullPath($Path)
  }

  if (-not ($full -eq $root -or $full.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar))) {
    throw "Refusing to operate outside the repository: $full"
  }

  return $full
}

function Remove-RepoPath {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path
  )

  if (Test-Path -LiteralPath $Path) {
    $safePath = Assert-InRepo -Path $Path
    Remove-Item -LiteralPath $safePath -Recurse -Force
  }
}

function Require-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found on PATH."
  }
}

Push-Location $repoRoot
try {
  Require-Command -Name "node"
  Require-Command -Name "npm"
  Require-Command -Name "tar"

  if (-not (Test-Path -LiteralPath "package.json")) {
    throw "Run this script from the project root, or keep it in the project root."
  }

  Write-Host "Building Next.js standalone output..."
  npm run build

  $standaloneDir = Join-Path $repoRoot ".next\standalone"
  if (-not (Test-Path -LiteralPath (Join-Path $standaloneDir "server.js"))) {
    throw "Missing .next\standalone\server.js. Make sure next.config.ts contains output: `"standalone`"."
  }

  $portableRoot = Join-Path $repoRoot "portable"
  $outputDir = Join-Path $portableRoot "mizekar-ubuntu-x64"
  $packDir = Join-Path $portableRoot "_npm-linux-packs"
  $archivePath = Join-Path $portableRoot "mizekar-ubuntu-x64.tar.gz"

  New-Item -ItemType Directory -Path $portableRoot -Force | Out-Null
  Remove-RepoPath -Path $outputDir
  Remove-RepoPath -Path $packDir
  if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath (Assert-InRepo -Path $archivePath) -Force
  }

  Write-Host "Assembling portable runtime folder..."
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  Get-ChildItem -LiteralPath $standaloneDir -Force | Copy-Item -Destination $outputDir -Recurse -Force

  if (Test-Path -LiteralPath "public") {
    Copy-Item -LiteralPath "public" -Destination (Join-Path $outputDir "public") -Recurse -Force
  }

  New-Item -ItemType Directory -Path (Join-Path $outputDir ".next") -Force | Out-Null
  Copy-Item -LiteralPath ".next\static" -Destination (Join-Path $outputDir ".next\static") -Recurse -Force

  if (Test-Path -LiteralPath ".env") {
    Copy-Item -LiteralPath ".env" -Destination (Join-Path $outputDir ".env") -Force
    Write-Host "Copied .env into the portable folder. Keep the archive private."
  } else {
    Write-Host "No .env file found; create one beside server.js on Ubuntu before running."
  }

  $sharpPackageJson = Join-Path $outputDir "node_modules\sharp\package.json"
  if (-not (Test-Path -LiteralPath $sharpPackageJson)) {
    throw "Missing sharp in standalone node_modules. The build output is incomplete."
  }

  $sharpVersion = node -p "require(process.argv[1]).version" $sharpPackageJson
  $libvipsVersion = node -p "require(process.argv[1]).optionalDependencies['@img/sharp-libvips-linux-x64']" $sharpPackageJson
  if (-not $sharpVersion -or -not $libvipsVersion) {
    throw "Could not detect sharp Linux package versions."
  }

  Write-Host "Adding Ubuntu x64 sharp runtime packages..."
  New-Item -ItemType Directory -Path $packDir -Force | Out-Null
  npm pack --pack-destination $packDir "@img/sharp-linux-x64@$sharpVersion" "@img/sharp-libvips-linux-x64@$libvipsVersion" | Out-Host

  $imgRoot = Join-Path $outputDir "node_modules\@img"
  New-Item -ItemType Directory -Path $imgRoot -Force | Out-Null

  $linuxPackages = @(
    @{
      Tarball = Join-Path $packDir "img-sharp-linux-x64-$sharpVersion.tgz"
      Target = Join-Path $imgRoot "sharp-linux-x64"
    },
    @{
      Tarball = Join-Path $packDir "img-sharp-libvips-linux-x64-$libvipsVersion.tgz"
      Target = Join-Path $imgRoot "sharp-libvips-linux-x64"
    }
  )

  foreach ($package in $linuxPackages) {
    if (-not (Test-Path -LiteralPath $package.Tarball)) {
      throw "Expected package tarball was not created: $($package.Tarball)"
    }

    Remove-RepoPath -Path $package.Target
    New-Item -ItemType Directory -Path $package.Target -Force | Out-Null
    tar -xzf $package.Tarball -C $package.Target --strip-components 1
  }

  Remove-RepoPath -Path (Join-Path $imgRoot "sharp-win32-x64")
  Remove-RepoPath -Path $packDir

  Write-Host "Creating Ubuntu archive..."
  tar -czf $archivePath -C $portableRoot "mizekar-ubuntu-x64"

  $archive = Get-Item -LiteralPath $archivePath
  $sizeMb = [Math]::Round($archive.Length / 1MB, 2)
  Write-Host "Created: $($archive.FullName)"
  Write-Host "Size: $sizeMb MB"

  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker found; testing sharp inside a Linux Node container..."
    try {
      $linuxPath = (Resolve-Path -LiteralPath $outputDir).Path.Replace("\", "/")
      docker run --rm -v "${linuxPath}:/app" -w /app node:20-bookworm-slim node -e "const sharp = require('sharp'); console.log('sharp ok', sharp.versions.sharp, sharp.versions.vips)"
    } catch {
      Write-Host "Docker smoke test failed or Docker is not running. The archive was still created."
    }
  } else {
    Write-Host "Docker not found; skipped Linux smoke test."
  }

  Write-Host ""
  Write-Host "Ubuntu run commands:"
  Write-Host "  tar -xzf mizekar-ubuntu-x64.tar.gz"
  Write-Host "  cd mizekar-ubuntu-x64"
  Write-Host "  PORT=3000 HOSTNAME=0.0.0.0 node server.js"
}
finally {
  Pop-Location
}
