#!/usr/bin/env pwsh
# Tek komutla: git commit + push + Cloudflare Workers deploy
# Kullanim:
#   .\deploy.ps1 "commit mesaji"   -> git commit + push + cf:deploy
#   .\deploy.ps1                    -> sadece cf:deploy (git'e dokunmaz)

param([string]$Message = "")

$ErrorActionPreference = "Stop"

function Write-Step($text) {
  Write-Host ""
  Write-Host "> $text" -ForegroundColor Cyan
}

# 1) Git tarafi (mesaj verildiyse)
if ($Message) {
  Write-Step "Git: degisiklikleri commit ediyorum"
  $status = git status --porcelain
  if (-not $status) {
    Write-Host "  (commit edilecek degisiklik yok, geciyorum)" -ForegroundColor Yellow
  } else {
    git add .
    if ($LASTEXITCODE -ne 0) { exit 1 }
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Write-Step "Git: GitHub'a push ediyorum"
    git push origin main
    if ($LASTEXITCODE -ne 0) { exit 1 }
  }
} else {
  Write-Host "  (mesaj verilmedi, git adimlari atlaniyor - sadece Cloudflare'a deploy)" -ForegroundColor Yellow
}

# 2) Cloudflare deploy
Write-Step "Cloudflare: build + deploy"
npm run cf:deploy
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "X Deploy basarisiz" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "OK - Canlida: https://omeraslanhan.com" -ForegroundColor Green
