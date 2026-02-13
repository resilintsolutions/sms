#!/bin/bash
set -e

cd /var/www

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
until mysqladmin ping -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" --silent 2>/dev/null; do
    sleep 2
done
echo "MySQL is ready."

# Run migrations
php artisan migrate --force

# Clear & cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Fix storage permissions
chown -R www-data:www-data storage bootstrap/cache

# Create storage link
php artisan storage:link 2>/dev/null || true

exec "$@"
