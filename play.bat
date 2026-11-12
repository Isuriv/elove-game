@echo off
cd /d "%~dp0"
where python >nul 2>&1
if errorlevel 1 (
  echo Python 3 is required to play. Install it from https://www.python.org/downloads/ then run play.bat again.
  pause
  exit /b 1
)
echo ELOVE GAME: http://localhost:8081/
echo Keep this window open. Close it to stop the game.
start "" "http://localhost:8081/"
python -m http.server 8081
