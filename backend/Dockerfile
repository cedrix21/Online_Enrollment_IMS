# Use the optimized Laravel image
FROM serversideup/php:8.2-fpm-nginx

# Switch to root to create directories
USER root

WORKDIR /var/www/html

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

# Switch back to www-data user for security
USER www-data

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create storage link
RUN php artisan storage:link

# Expose port
EXPOSE 8080