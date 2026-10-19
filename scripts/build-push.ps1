[CmdletBinding()]
param(
    [string]$Registry = "ghcr.io",
    [string]$Namespace = "kresnawijayaa",
    [string]$Tag = "latest",
    [string]$Platform = "linux/amd64"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
foreach ($value in @($Registry, $Namespace, $Tag)) {
    if ($value -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._/-]*$') {
        throw "Registry, Namespace, atau Tag tidak valid."
    }
}

& docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw "Docker belum siap. Jalankan Docker Desktop dengan Linux containers." }
& git rev-parse --short=12 HEAD
if ($LASTEXITCODE -ne 0) { throw "Jalankan skrip dari checkout Git REMI." }
$revision = (& git rev-parse --short=12 HEAD).Trim()
$image = "$Registry/$Namespace/remi-pkb-gpib"
$commitTag = "git-$revision"

& npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "Lint gagal; image belum dibangun." }
& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Test gagal; image belum dibangun." }

$changes = & git status --porcelain
if ($changes) { throw "Masih ada perubahan belum di-commit. Commit dahulu agar tag Git sesuai isi image." }

Write-Host "Membangun dan mengunggah ${image}:$Tag ($commitTag)..."
& docker buildx build --platform $Platform --tag "${image}:$Tag" --tag "${image}:$commitTag" --label "org.opencontainers.image.revision=$revision" --push .
if ($LASTEXITCODE -ne 0) { throw "Build/push gagal. Periksa Docker dan login registry." }
Write-Host "Selesai. Image versi ini: ${image}:$commitTag"
Write-Host "VPS: git pull --ff-only; bash scripts/deploy.sh"
