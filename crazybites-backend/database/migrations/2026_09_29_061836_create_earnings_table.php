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
        Schema::create('earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();                          // kone paisa malya (sponsor)
            $table->foreignId('from_user_id')->nullable()->constrained('users')->nullOnDelete();      // kya leg (referral) thi
            $table->foreignId('from_purchase_id')->nullable()->constrained('purchases')->nullOnDelete();
            $table->unsignedInteger('slot_number');            //  slot activate by leg
            $table->decimal('amount', 12, 2);                  // this entry's amount
            $table->enum('type', ['credit', 'upgrade_used']);  // credit: in wallet , upgrade_used: used for next slot 
            $table->unsignedInteger('upgraded_to_slot')->nullable(); // type=which slot open if upgrade_used
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('earnings');
    }
};
