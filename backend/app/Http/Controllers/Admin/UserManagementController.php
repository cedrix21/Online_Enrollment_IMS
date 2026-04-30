<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;

class UserManagementController extends Controller
{
    /**
     * Get all locked users (Admin only).
     */
    public function lockedUsers()
    {
        $lockedUsers = User::whereNotNull('locked_until')
            ->where('locked_until', '>', now())
            ->select(['id', 'name', 'email', 'role', 'locked_until', 'failed_attempts'])
            ->get();

        return response()->json([
            'locked_users' => $lockedUsers
        ]);
    }

    /**
     * Unlock a specific user account (Admin only).
     */
    public function unlockUser($userId)
    {
        $user = User::findOrFail($userId);
        $user->unlock();

        return response()->json([
            'message' => "User '{$user->name}' has been unlocked successfully.",
            'user' => [
                'id'   => $user->id,
                'name' => $user->name,
                'email'=> $user->email,
            ]
        ]);
    }
}