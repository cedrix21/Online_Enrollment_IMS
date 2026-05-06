#!/bin/sh
set -e

echo "=== [1/3] Caching config & routes... ==="
php artisan config:clear
php artisan config:cache
php artisan route:cache

echo "=== [2/3] Running migrations... ==="
php artisan migrate --force

echo "=== [3/3] Seeding database... ==="
php artisan db:seed --force

echo "=== Done! Starting server... ==="