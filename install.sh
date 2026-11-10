#!/bin/bash

echo "=========================================="
echo "  Instalando Frenetic Invaders..."
echo "=========================================="

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "[ERRO] Node.js nao encontrado! Por favor, instale o Node.js em https://nodejs.org/"
    exit 1
fi

echo "[1/2] Instalando dependencias (npm install)..."
npm install

if [ $? -ne 0 ]; then
    echo "[ERRO] Falha ao instalar dependencias."
    exit 1
fi

echo "[2/2] Iniciando o jogo (npm run dev)..."
echo "O jogo abrira em seu navegador em instantes."
npm run dev
