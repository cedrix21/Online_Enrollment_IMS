<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AuthController extends Controller
{
    // Admin / Registrar login
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $email = $request->input('email');

        // Find user by email
        $user = User::where('email', $email)->first();

        // Check if user exists and is locked
        if ($user && $user->isLocked()) {
            $remainingSeconds = $user->locked_until->diffInSeconds(Carbon::now());
            $minutes = ceil($remainingSeconds / 60);
            return response()->json([
                'message' => "Account temporarily locked. Please try again in approximately {$minutes} minute(s)."
            ], 423); // HTTP 423 Locked
        }

        // Attempt authentication
        if (Auth::attempt($request->only('email', 'password'))) {
            $user = $request->user();
            
            // Reset failed attempts on successful login
            $user->resetFailedAttempts();
            
            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json([
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'user'         => [
                    'id'              => $user->id,
                    'name'            => $user->name,
                    'email'           => $user->email,
                    'role'            => $user->role,
                    'password_changed' => (bool) $user->password_changed,
                ]
            ]);
        }

        // Failed login
        if ($user) {
            // Increment failed attempts; user exists but wrong password
            $locked = $user->incrementFailedAttempts(3, 720);
            $remainingAttempts = max(0, 3 - $user->failed_attempts);
            
            if ($locked) {
                return response()->json([
                    'message' => 'Too many failed attempts. Your account has been locked for 12 hours.'
                ], 423);
            }
            
            return response()->json([
                'message' => "Invalid credentials. {$remainingAttempts} attempt(s) remaining."
            ], 401);
        }

        // Generic message for non-existent user (prevents email enumeration)
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    // Logout
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    // Update user credentials
    public function updateCredentials(Request $request)
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'current_password' => 'required|string',
            'email'            => 'required|email|unique:users,email,' . $user->id,
            'new_password'     => 'nullable|string|min:6',
        ]);

        // Verify current password
        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        // Update email
        $user->email = $validated['email'];

        // Update password if provided
        if (! empty($validated['new_password'])) {
            $user->password = Hash::make($validated['new_password']);
            $user->password_changed = true;
        }

        $user->save();

        return response()->json([
            'message' => 'Credentials updated successfully!',
            'user'    => $user,
        ]);
    }
}