<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceJsonAndCors
{
    public function handle(Request $request, Closure $next)
{
    // Handle OPTIONS Preflight immediately
    if ($request->isMethod('OPTIONS')) {
        return response('', 200)
            ->header('Access-Control-Allow-Origin', 'https://online-enrollment-system.up.railway.app')
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
            ->header('Access-Control-Allow-Credentials', 'true');
    }

    $response = $next($request);

    // If the response is a redirect or error, we still need CORS headers
    if (method_exists($response, 'header')) {
        $response->header('Access-Control-Allow-Origin', 'https://online-enrollment-system.up.railway.app')
                 ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                 ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
                 ->header('Access-Control-Allow-Credentials', 'true');
    }

    return $response;
}
}