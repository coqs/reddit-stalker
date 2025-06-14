@echo off
echo Installing @google/generative-ai...

REM Use call to make sure npm install completes properly in the batch script
call npm install @google/generative-ai

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] npm install failed with code %ERRORLEVEL%
    echo Press any key to exit...
    pause >nul
    exit /b %ERRORLEVEL%
)

echo.
echo Running main.js...
call node main.js

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] node main.js exited with code %ERRORLEVEL%
)

echo.
echo Press any key to close...
pause >nul
