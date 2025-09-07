# Staff Email Service Starter
Write-Host "Starting Staff Email Service..." -ForegroundColor Green
Write-Host ""

# Change to project directory
Set-Location "d:\project\Staff"

# Run the email service
Write-Host "Running automation service..." -ForegroundColor Yellow
node automation-service.js

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")