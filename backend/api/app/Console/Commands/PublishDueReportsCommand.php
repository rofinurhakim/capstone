<?php

namespace App\Console\Commands;

use App\Services\PublishDueReports;
use Illuminate\Console\Command;

class PublishDueReportsCommand extends Command
{
    protected $signature = 'reports:publish-due';

    protected $description = 'Publish approved student reports whose individual publication time has arrived';

    public function handle(PublishDueReports $publisher): int
    {
        $count = $publisher->publish();
        $this->info("Published {$count} report(s).");

        return self::SUCCESS;
    }
}
