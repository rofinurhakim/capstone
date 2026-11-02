<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('scores')->where('skill', 'Speaking')->update(['skill' => 'Participation']);
        DB::table('scores')->where('skill', 'Listening')->update(['skill' => 'Assignment']);
        DB::table('scores')->where('skill', 'Reading')->update(['skill' => 'Mid Term Test']);
        DB::table('scores')->where('skill', 'Writing')->update(['skill' => 'Final Test']);
    }

    public function down(): void
    {
        DB::table('scores')->where('skill', 'Participation')->update(['skill' => 'Speaking']);
        DB::table('scores')->where('skill', 'Assignment')->update(['skill' => 'Listening']);
        DB::table('scores')->where('skill', 'Mid Term Test')->update(['skill' => 'Reading']);
        DB::table('scores')->where('skill', 'Final Test')->update(['skill' => 'Writing']);
    }
};
