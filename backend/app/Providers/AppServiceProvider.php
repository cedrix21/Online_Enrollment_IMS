<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Bridge\Sendgrid\Transport\SendgridApiTransport;
use Symfony\Component\HttpClient\HttpClient;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS in production
        if (config('app.env') === 'production' || $this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Register SendGrid mail transport                                         
         Mail::extend('sendgrid', function (array $config) {
        return new SendgridApiTransport(
            $config['api_key'],
            HttpClient::create()
        );
    });
    }
}