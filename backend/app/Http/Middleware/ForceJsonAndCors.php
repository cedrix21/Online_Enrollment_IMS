<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceJsonAndCors
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Force the request to be treated as JSON
        $request->headers->set('Accept', 'application/json');

        // 2. Handle Preflight (OPTIONS)
        if ($request->getMethod() === "OPTIONS") {
            return response()->json('OK', 200, [
                'Access-Control-Allow-Origin' => 'https://online-enrollment-system.up.railway.app',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept',
                'Access-Control-Allow-Credentials' => 'true',
            ]);
        }

        $response = $next($request);

        // 3. Add headers to the actual response
        return $response->withHeaders([
            'Access-Control-Allow-Origin' => 'https://online-enrollment-system.up.railway.app',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept',
            'Access-Control-Allow-Credentials' => 'true',
        ]);
    }
}