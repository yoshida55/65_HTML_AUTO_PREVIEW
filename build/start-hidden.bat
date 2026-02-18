@echo off
cd /d "%~dp0"
powershell -WindowStyle Hidden -Command "Start-Process '..\node\node.exe' -ArgumentList '..\clipboard-watch.js' -WindowStyle Hidden"
