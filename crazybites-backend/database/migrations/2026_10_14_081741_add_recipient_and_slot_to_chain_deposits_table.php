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
        Schema::table('chain_deposits', function (Blueprint $table) {
             $table->string('recipient_address', 42)->nullable();
            $table->unsignedTinyInteger('slot_number')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chain_deposits', function (Blueprint $table) {
            $table->dropColumn(['recipient_address', 'slot_number']);

        });
    }
};
