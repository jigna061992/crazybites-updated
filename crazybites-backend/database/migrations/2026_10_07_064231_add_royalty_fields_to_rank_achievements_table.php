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
            $table->decimal('royalty_amount', 12, 2)->nullable()->after('reward_amount');
            $table->timestamp('royalty_achieved_at')->nullable()->after('achieved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rank_achievements', function (Blueprint $table) {
            $table->dropColumn(['royalty_amount', 'royalty_achieved_at']);
        });
    }
};
