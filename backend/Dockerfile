# Use the optimized Laravel image
FROM serversideup/php:8.2-fpm-nginx

WORKDIR /var/www/html

COPY . .

# 1. Create missing folders (just in case .gitignore excluded them)
RUN mkdir -p storage/framework/sessions \
    storage/framework/views \
    storage/framework/cache \
    storage/logs \
    bootstrap/cache

# 2. Fix Permissions FIRST (So Composer can write to them)
RUN chmod -R 775 storage bootstrap/cache

# 3. Install dependencies (Now safe to run scripts)
RUN composer install --no-dev --optimize-autoloader

# 4. Create the storage link
RUN php artisan storage:link