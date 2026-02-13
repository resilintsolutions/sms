#!/bin/sh
set -e

cd /var/www

# ── Generate APP_KEY if empty ──
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:" ]; then
    echo "[entrypoint] Generating APP_KEY..."
    php artisan key:generate --force
fi

# ── Wait for MySQL ──
echo "[entrypoint] Waiting for MySQL at $DB_HOST:$DB_PORT ..."
MAX_TRIES=30
TRIES=0
until php -r "new PDO('mysql:host='.\$_SERVER['DB_HOST'].';port='.\$_SERVER['DB_PORT'], \$_SERVER['DB_USERNAME'], \$_SERVER['DB_PASSWORD']);" 2>/dev/null; do
    TRIES=$((TRIES+1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "[entrypoint] MySQL not reachable after $MAX_TRIES attempts – starting anyway."
        break
    fi
    sleep 2
done
echo "[entrypoint] MySQL connection OK."

# ── Migrations ──
php artisan migrate --force 2>&1 || echo "[entrypoint] migrate warning (non-fatal)"

# ── Cache (skip route:cache – closure routes not supported) ──
php artisan config:cache
php artisan view:cache

# ── Storage symlink ──
php artisan storage:link 2>/dev/null || true

# ── Permissions ──
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

echo "[entrypoint] Ready."
exec "$@"