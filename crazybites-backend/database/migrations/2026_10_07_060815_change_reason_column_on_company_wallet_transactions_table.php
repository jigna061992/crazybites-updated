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
        Schema::table('company_wallet_transactions', function (Blueprint $table) {
            DB::statement("ALTER TABLE company_wallet_transactions MODIFY reason VARCHAR(50) NOT NULL DEFAULT ''");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_wallet_transactions', function (Blueprint $table) {
                    DB::statement("ALTER TABLE company_wallet_transactions MODIFY reason ENUM('slot_of_sponsor', 'root_recycle') NOT NULL");

        });
    }
};
