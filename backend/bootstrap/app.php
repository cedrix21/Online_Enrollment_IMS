<?php

use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\ForceJsonAndCors; // Add this import for clarity
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // 1. PREPEND - This makes it the "Outer" layer.
        // It catches the request BEFORE anything else can fail.
        $middleware->prepend(ForceJsonAndCors::class);

        // 2. Trust Railway's Proxy (Load Balancer)
        $middleware->trustProxies(at: '*');

        // 3. Register your Role alias
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // 4. Disable CSRF for your API routes
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // 5. Sanctum stateful support
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();