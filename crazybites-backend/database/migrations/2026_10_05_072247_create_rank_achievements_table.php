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
        Schema::create('rank_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('rank_name');           // Silver, Gold, Diamond
            $table->decimal('reward_amount', 12, 2);
            $table->unsignedInteger('direct_count_at_time');
            $table->unsignedInteger('team_size_at_time');
            $table->unsignedInteger('days_taken');  //how many days take for complete after joining
            $table->timestamp('achieved_at')->useCurrent();

            $table->unique(['user_id', 'rank_name']);   // get one rank only one time
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rank_achievements');
    }
};
