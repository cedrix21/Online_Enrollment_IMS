<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Activitylog\Models\Activity;
use Carbon\Carbon;

class CleanActivityLogs extends Command
{
    protected $signature = 'activity-log:clean';
    protected $description = 'Delete activity logs older than 90 days';

    public function handle()
    {
        $cutoffDate = Carbon::now()->subDays(90);
        $deleted = Activity::where('created_at', '<', $cutoffDate)->delete();

        $this->info("Deleted {$deleted} log entries older than 90 days.");
    }
}