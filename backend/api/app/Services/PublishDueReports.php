<?php

namespace App\Services;

use App\Models\Enrollment;

class PublishDueReports
{
    public function publish(): int
    {
        return Enrollment::where('status', 'confirmed')
            ->whereNotNull('teacher_verified_at')
            ->whereNotNull('academic_verified_at')
            ->whereNotNull('report_publish_at')
            ->where('report_publish_at', '<=', now())
            ->whereNull('published_at')
            ->update([
                'published_at' => now(),
                'revision_requested_at' => null,
                'updated_at' => now(),
            ]);
    }
}
