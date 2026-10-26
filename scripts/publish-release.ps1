param(
    [string]$Version = "1.3.0",
    [string]$Message = "Release Marko v1.3.0"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Marko Release Helper - v$Version" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure git working directory is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "[!] Working tree has uncommitted changes. Staging and committing..." -ForegroundColor Yellow
    git add .
    git commit -m "feat: Marko v$Version - Zen Fullscreen, Live Updates & Automated Releases"
    Write-Host "[+] Changes committed." -ForegroundColor Green
} else {
    Write-Host "[+] Working tree clean." -ForegroundColor Green
}

# 2. Check tag
$tagName = "v$Version"
$existingTag = git tag -l $tagName
if ($existingTag) {
    git tag -d $tagName
}
Write-Host "[+] Creating git tag $tagName..." -ForegroundColor Cyan
git tag -a $tagName -m "$Message"

# 3. Push main branch and tag
Write-Host "[+] Pushing commits to origin main..." -ForegroundColor Cyan
git push origin main

Write-Host "[+] Pushing tag $tagName to origin..." -ForegroundColor Cyan
git push origin $tagName --force

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host " [OK] SUCCESS: Tag $tagName pushed to GitHub!" -ForegroundColor Green
Write-Host " GitHub Actions is now automatically building and releasing:" -ForegroundColor Green
Write-Host " https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/actions" -ForegroundColor Cyan
Write-Host " Once complete, your release will be live at:" -ForegroundColor Green
Write-Host " https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/releases" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Green
