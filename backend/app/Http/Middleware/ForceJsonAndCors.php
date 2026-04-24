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

        // 2. Dynamically determine the origin from environment variable
        $origin = $request->headers->get('Origin');

        // Read allowed origins from ALLOWED_ORIGINS env var (comma-separated)
        // Falls back to localhost for local development
        $allowedOrigins = array_filter(array_map('trim', explode(',', env(
            'ALLOWED_ORIGINS',
            'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:8000'
        ))));

        $actualOrigin = in_array($origin, $allowedOrigins) ? $origin : ($allowedOrigins[0] ?? '*');

        // 3. Handle OPTIONS Preflight immediately
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $actualOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        $response = $next($request);

        // 4. Attach CORS headers to every response
        if (isset($response->headers)) {
            $response->headers->set('Access-Control-Allow-Origin', $actualOrigin);
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}