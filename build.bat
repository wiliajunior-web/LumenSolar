@echo off
title SolarPropV — Gerando .exe...
color 0A
echo.
echo  =====================================================
echo   SolarPropV — Gerador de .exe
echo   LUMEN SOLUCOES LTDA
echo  =====================================================
echo.

:: Verifica se Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERRO] Node.js nao encontrado!
    echo.
    echo  Por favor, instale o Node.js em: https://nodejs.org
    echo  Baixe a versao LTS e instale normalmente.
    echo  Depois feche e reabra este arquivo.
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

echo  [OK] Node.js encontrado: 
node --version
echo.
echo  [1/3] Instalando dependencias (pode demorar na primeira vez)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)

echo.
echo  [2/3] Compilando o app...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo  [ERRO] Falha na compilacao.
    pause
    exit /b 1
)

echo.
echo  [3/3] Gerando o .exe instalavel...
call npx electron-builder --win portable --x64
if %errorlevel% neq 0 (
    color 0C
    echo  [ERRO] Falha ao gerar o .exe.
    pause
    exit /b 1
)

echo.
color 0A
echo  =====================================================
echo   PRONTO! O arquivo .exe esta na pasta "release"
echo  =====================================================
echo.

:: Abre a pasta release automaticamente
start "" "%~dp0release"
pause
