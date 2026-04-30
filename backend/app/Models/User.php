<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Carbon\Carbon;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    use LogsActivity;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'password_changed',
        'locked_until',
        'failed_attempts',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'locked_until'      => 'datetime',
        ];
    }

    /**
     * Check if the user account is currently locked.
     */
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    /**
     * Lock the user account for a specified number of minutes.
     */
    public function lock(int $minutes = 15): void
    {
        $this->locked_until = Carbon::now()->addMinutes($minutes);
        $this->failed_attempts = 0; // Reset attempts after lock
        $this->save();
    }

    /**
     * Unlock the user account.
     */
    public function unlock(): void
    {
        $this->locked_until = null;
        $this->failed_attempts = 0;
        $this->save();
    }

    /**
     * Increment the failed login attempts counter.
     * Locks the account if attempts reach the maximum.
     */
    public function incrementFailedAttempts(int $maxAttempts = 3, int $lockMinutes = 15): bool
    {
        $this->failed_attempts++;
        
        if ($this->failed_attempts >= $maxAttempts) {
            $this->lock($lockMinutes);
            $this->save();
            return true; // Account is now locked
        }
        
        $this->save();
        return false;
    }

    /**
     * Reset failed attempts (on successful login).
     */
    public function resetFailedAttempts(): void
    {
        $this->failed_attempts = 0;
        $this->locked_until = null;
        $this->save();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'role'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Get the teacher associated with this user.
     */
    public function teacher()
    {
        return $this->hasOne(Teacher::class, 'email', 'email');
    }
}