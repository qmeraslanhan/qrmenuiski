param([string]$Message = "")

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== QR Menu Deploy ===" -ForegroundColor Cyan

# 1) Degisiklik var mi?
$changes = git status --porcelain
if (-not $changes) {
  Write-Host "Degisiklik yok. Push yapilmadi." -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "Degisen dosyalar:" -ForegroundColor Cyan
git status --short
Write-Host ""

# 2) Commit mesaji
if (-not $Message) {
  $Message = Read-Host "Commit mesaji (Enter'a basarsan otomatik tarih)"
}
if (-not $Message) {
  $Message = "update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# 3) Add + Commit + Push
Write-Host ""
Write-Host "-> git add ." -ForegroundColor DarkGray
git add .

Write-Host "-> git commit -m `"$Message`"" -ForegroundColor DarkGray
git commit -m $Message

Write-Host "-> git push" -ForegroundColor DarkGray
git push

# 4) Bilgi
Write-Host ""
Write-Host "Push tamamlandi. Vercel ~30-60 saniyede deploy eder." -ForegroundColor Green
Write-Host "  Canli       : https://qrmenuiski.vercel.app" -ForegroundColor Green
Write-Host "  Deploy log  : https://vercel.com/qmeraslanhan-2953s-projects/qrmenuiski" -ForegroundColor Green
Write-Host ""
