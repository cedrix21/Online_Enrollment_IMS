# Use the optimized Laravel image
FROM serversideup/php:8.2-fpm-nginx

# Switch to root for installations
USER root

WORKDIR /var/www/html

# Install PostgreSQL PHP extension (needed for Render's managed Postgres)
RUN install-php-extensions pdo_pgsql pgsql

# Copy application files
COPY --chown=www-data:www-data . .

# Create required directories with proper ownership
RUN mkdir -p storage/framework/sessions \
    storage/framework/views \
    storage/framework/cache \
    storage/framework/testing \
    storage/logs \
    storage/app/public \
    bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy entrypoint script — serversideup runs all scripts in /etc/entrypoint.d/
# before starting nginx + php-fpm (alphabetical order, so 99- runs last)
COPY --chmod=755 entrypoint.d/99-laravel-deploy.sh /etc/entrypoint.d/99-laravel-deploy.sh

# Switch back to www-data for security
USER www-data

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create storage link
RUN php artisan storage:link

# Expose port (serversideup uses 8080 by default)
EXPOSE 8080

# No CMD needed — the base image entrypoint handles starting nginx + php-fpm
# Our 99-laravel-deploy.sh runs automatically before the server starts