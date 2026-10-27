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
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('leg1_earning', 12, 2)->default(0)->after('total_debit');
            $table->decimal('leg2_earning', 12, 2)->default(0)->after('leg1_earning');
            $table->decimal('leg3_earning', 12, 2)->default(0)->after('leg2_earning');
            $table->decimal('leg4_earning', 12, 2)->default(0)->after('leg3_earning');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
             $table->dropColumn(['leg1_earning', 'leg2_earning', 'leg3_earning', 'leg4_earning']);
        });
    }
};
