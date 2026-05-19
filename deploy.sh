#!/usr/bin/env bash
set -e

PROJECT_DIR="/home/sigedin/sigedin_agendas"

echo "[1/8] Entrando al proyecto..."
cd "$PROJECT_DIR"

echo "[2/8] Verificando archivos necesarios..."

if [ ! -f "docker-compose.yml" ]; then
  echo "ERROR: No existe docker-compose.yml"
  exit 1
fi

if [ ! -f "backend/.env" ]; then
  echo "ERROR: No existe backend/.env"
  echo "Crea backend/.env en el servidor antes de desplegar."
  exit 1
fi

echo "[3/8] Verificando Docker..."
docker --version
docker compose version

echo "[4/8] Verificando contenedor MariaDB..."
docker ps --format '{{.Names}}' | grep -q '^sigedin_mariadb$' || {
  echo "ERROR: No está corriendo el contenedor sigedin_mariadb"
  exit 1
}

echo "[5/8] Actualizando código desde GitHub..."
git pull origin main

echo "[6/8] Deteniendo backend/frontend anteriores..."
docker compose down

echo "[7/8] Construyendo backend/frontend..."
docker compose build --no-cache

echo "[8/8] Levantando servicios..."
docker compose up -d

echo "Estado final:"
docker ps

echo "Logs recientes:"
docker compose logs --tail=80