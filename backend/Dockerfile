# Use a pre-configured image designed for Laravel (Nginx + PHP)
FROM serversideup/php:8.2-fpm-nginx

# Set the working directory
WORKDIR /var/www/html

# Copy your project files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Fix permissions for storage
RUN chmod -R 775 storage bootstrap/cache

# CRITICAL FIX: Create the storage link during the build phase
# This prevents the "Link Already Exists" crash loop at runtime
RUN php artisan storage:link