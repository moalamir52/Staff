@echo off

REM 1. Build the project
call npm run build

REM 2. Navigate into the build output directory
cd build

REM 3. Initialize a new git repository
git init

REM 4. Add and commit all files
git add -A
git commit -m "Deploy to GitHub Pages"

REM 5. Push to the gh-pages branch
git push -f https://github.com/moalamir52/Staff.git master:gh-pages

REM 6. Navigate back to the project root and clean up
cd ..
rmdir /s /q build

echo.
echo ======================================================
echo = 🚀 DEPLOYMENT COMPLETE!                      =
echo ======================================================
echo.

pause
