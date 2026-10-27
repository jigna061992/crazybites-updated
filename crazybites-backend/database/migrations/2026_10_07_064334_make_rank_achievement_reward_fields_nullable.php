<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rank_achievements', function (Blueprint $table) {
            DB::statement('ALTER TABLE rank_achievements MODIFY reward_amount DECIMAL(12,2) NULL');
            DB::statement('ALTER TABLE rank_achievements MODIFY achieved_at TIMESTAMP NULL');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rank_achievements', function (Blueprint $table) {
            DB::statement('ALTER TABLE rank_achievements MODIFY reward_amount DECIMAL(12,2) NOT NULL');
            DB::statement('ALTER TABLE rank_achievements MODIFY achieved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        });
    }
};
