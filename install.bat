@echo off
echo ==========================================
echo   Instalando Frenetic Invaders...
echo ==========================================

:: Verifica se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado! Por favor, instale o Node.js em https://nodejs.org/
    pause
    exit /b
)

echo [1/2] Instalando dependencias (npm install)...
call npm install

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b
)

echo [2/2] Iniciando o jogo (npm run dev)...
echo O jogo abrira em seu navegador em instantes.
call npm run dev

pause
