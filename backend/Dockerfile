FROM php:8.2-apache

# 1. Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    curl \
    unzip \
    libzip-dev

# 2. Fix "More than one MPM loaded" error
# We disable 'event' and 'worker' to ensure only 'prefork' (required for PHP) is active
RUN a2dismod mpm_event mpm_worker || true && a2enmod mpm_prefork rewrite

# 3. Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# 4. Set working directory
WORKDIR /var/www/html

# 5. Copy the project files
COPY . /var/www/html

# 6. Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --optimize-autoloader

# 7. Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 8. Handle the Storage Link
RUN rm -rf public/storage && php artisan storage:link

# 9. Configure Apache port (Railway usually uses 8080)
RUN sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf
RUN sed -i 's/:80/:8080/' /etc/apache2/sites-available/000-default.conf

# 10. Point Apache to the Laravel /public folder
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/000-default.conf
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf

EXPOSE 8080

CMD ["apache2-foreground"]