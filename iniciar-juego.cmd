@echo off
setlocal

set "CODEX_PYTHON=C:\Users\bernh\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "JUEGO_DIR=%~dp0dist"
set "JUEGO_PORT=4174"
set "JUEGO_URL=http://localhost:%JUEGO_PORT%/?version=posorden-m2-7-32"

if not exist "%CODEX_PYTHON%" (
  echo No se encontro el Python incluido con Codex.
  echo Ruta esperada: %CODEX_PYTHON%
  pause
  exit /b 1
)

if not exist "%JUEGO_DIR%\index.html" (
  echo No se encontro el juego en: %JUEGO_DIR%
  pause
  exit /b 1
)

echo Iniciando Taller de Estructuras...
echo Abrir manualmente: %JUEGO_URL%
echo Para detenerlo, presiona Ctrl+C.
echo.

start "" /b "%CODEX_PYTHON%" -c "import time, webbrowser; time.sleep(1); webbrowser.open('%JUEGO_URL%')"
"%CODEX_PYTHON%" -m http.server %JUEGO_PORT% --directory "%JUEGO_DIR%"

endlocal
