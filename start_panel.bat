@echo off
title 420 Mixtape - KIRTSOY Twitch Music Panel
color 0a

echo ========================================================
echo       KIRTSOY 420 MIXTAPE - TWITCH MUSIC PANEL
echo ========================================================
echo.
echo Starting local music streaming server...
echo URL: http://localhost:8505
echo.

start "" "http://localhost:8505"
python "%~dp0server.py"

pause
