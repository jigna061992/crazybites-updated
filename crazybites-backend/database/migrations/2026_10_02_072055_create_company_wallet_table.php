<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('company_wallet', function (Blueprint $table) {
             $table->id();
            $table->decimal('balance', 14, 2)->default(0);
            $table->timestamps();
        });
         // only one row  , same as singleton 
        DB::table('company_wallet')->insert(['balance' => 0, 'created_at' => now(), 'updated_at' => now()]);

        Schema::create('company_wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_user_id')->nullable()->constrained('users')->nullOnDelete();  // kone generate karyu
            $table->unsignedInteger('slot_number');
            $table->decimal('amount', 12, 2);
            $table->enum('reason', ['slot_of_sponsor', 'root_recycle']);   // why company get this 
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_wallet_transactions');
        Schema::dropIfExists('company_wallet');
    }
};
