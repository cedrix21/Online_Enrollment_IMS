#!/bin/bash
set -e

echo "=== Online Enrollment IMS - Production Boot ==="

echo "[1/4] Clearing old caches..."
php artisan config:clear
php artisan route:clear

echo "[2/4] Caching config & routes..."
php artisan config:cache
php artisan route:cache

echo "[3/4] Running migrations..."
php artisan migrate --force

echo "[4/4] Starting server..."
exec /start.sh