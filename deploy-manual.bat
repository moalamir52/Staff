@echo off

echo ======================================================
echo = 🚀 STARTING DEPLOYMENT...                    =
echo ======================================================

REM 1. Add and commit changes to main branch
echo 📝 Committing changes to main branch...
git add .
git status
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update project files
git commit -m "%commit_msg%"

REM 2. Push to main branch
echo 📤 Pushing to main branch...
git push origin main

REM 3. Terminate Node.js processes
echo.
echo 🔪 Terminating any running Node.js processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo.

REM 4. Build the project
echo 🔨 Building project...
call npm run build

REM 5. Deploy to GitHub Pages
echo 🌐 Deploying to GitHub Pages...
call npm run deploy

echo.
echo ======================================================
echo = ✅ DEPLOYMENT COMPLETE!                      =
echo = 📋 Main branch updated                       =
echo = 🌐 GitHub Pages deployed                     =
echo ======================================================
echo.

pause