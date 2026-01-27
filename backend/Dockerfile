# Use the official PHP 8.2 Apache image
FROM php:8.2-apache

# 1. Install system dependencies for PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    curl \
    unzip \
    libzip-dev

# 2. Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Install PHP extensions needed for Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# 4. Enable Apache mod_rewrite for Laravel routing
RUN a2enmod rewrite

# 5. Set working directory
WORKDIR /var/www/html

# 6. Copy the project files into the container
COPY . /var/www/html

# 7. Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader

# 8. Set permissions for Laravel
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 9. Handle the Storage Link (Force it to avoid the "Already Exists" error)
RUN rm -rf public/storage && php artisan storage:link

# 10. Configure Apache to point to the /public folder
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/000-default.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

# 11. Expose the port Railway uses
EXPOSE 8080

# 12. Start Apache
CMD ["apache2-foreground"]