<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class BlockViewOnlyToken
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->user()?->currentAccessToken();

        $isViewOnly = $token
            && is_array($token->abilities ?? null)
            && in_array('view-only', $token->abilities, true);

        if ($isViewOnly && ! $request->isMethod('GET') && ! $request->is('api/logout')) {
            return response()->json([
                'success' => false,
                'message' => 'View-only mode: no changes can be made while viewing a user account.',
            ], 403);
        }

        return $next($request);
    }
}