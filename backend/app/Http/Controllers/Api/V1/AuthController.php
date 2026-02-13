<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => [__('auth.inactive')],
            ]);
        }

        $user->update(['last_login_at' => now()]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $user->load('roles.permissions', 'institution');
        $roleNames = $user->roles->pluck('name')->toArray();
        $permissions = $user->roles->flatMap(fn ($role) => $role->permissions->pluck('name'))->unique()->values()->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'token' => $token,
                'token_type' => 'Bearer',
                'roles' => $roleNames,
                'permissions' => $permissions,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }
        return response()->json(['success' => true, 'message' => __('auth.logged_out')]);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => __('auth.unauthenticated')], 401);
        }

        $user->load('roles.permissions', 'institution');
        $roleNames = $user->roles->pluck('name')->toArray();
        $permissions = $user->roles->flatMap(fn ($role) => $role->permissions->pluck('name'))->unique()->values()->toArray();

        return response()->json([
            'success' => true,
            'data' => $user,
            'roles' => $roleNames,
            'permissions' => $permissions,
        ]);
    }
}
