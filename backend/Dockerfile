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

# Copy and prepare the start script
COPY --chown=www-data:www-data docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh

# Switch back to www-data for security
USER www-data

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create storage link
RUN php artisan storage:link

# Expose port (serversideup uses 8080 by default)
EXPOSE 8080

# Run migrations + cache + start server
CMD ["/usr/local/bin/docker-start.sh"]