@echo off
echo ========================================
echo    YELO Fleet Report - Starting Server
echo ========================================
echo.

echo Installing dependencies...
call npm install

echo.
echo Starting development server...
echo Open your browser to: http://localhost:5173
echo.

call npm run dev

pause