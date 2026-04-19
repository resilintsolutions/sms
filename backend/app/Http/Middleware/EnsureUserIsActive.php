<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Reject requests from authenticated users whose is_active flag is false.
 * This prevents deactivated users with unexpired tokens from accessing the API.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            // Revoke the token so the user cannot retry
            if ($user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }

            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated. Please contact the administrator.',
            ], 403);
        }

        return $next($request);
    }
}
