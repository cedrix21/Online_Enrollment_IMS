<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceJsonAndCors
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Force every request to be treated as JSON
        $request->headers->set('Accept', 'application/json');

        // 2. Determine the allowed origin
        $origin = $request->headers->get('Origin');
        $actualOrigin = $this->resolveOrigin($origin);

        // 3. Handle OPTIONS preflight immediately
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $actualOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Allow-Credentials', 'true')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        // 4. Attach CORS headers to every response
        if (isset($response->headers)) {
            $response->headers->set('Access-Control-Allow-Origin', $actualOrigin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }

    private function resolveOrigin(?string $origin): string
    {
        if (!$origin) {
            return env('FRONTEND_URL', 'http://localhost:3000');
        }

        // Allow any Vercel preview or production deployment
        if (preg_match('/^https:\/\/[\w-]+\.vercel\.app$/', $origin)) {
            return $origin;
        }

        // Allow localhost for local development
        if (preg_match('/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
            return $origin;
        }

        // Allow explicitly listed origins from env var (comma-separated)
        $explicitOrigins = array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS', ''))));
        if (in_array($origin, $explicitOrigins)) {
            return $origin;
        }

        // Default fallback — return the frontend URL
        return env('FRONTEND_URL', 'http://localhost:3000');
    }
}