<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'wallet_address')) {
            Schema::table('users', function (Blueprint $t) {
                $t->string('wallet_address', 42)->nullable()->unique();
            });
        }

        if (! Schema::hasTable('chain_orders')) {
            Schema::create('chain_orders', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->unsignedTinyInteger('slot_number');
                $t->string('amount_wei', 40);
                $t->string('status', 30)->default('pending');   // pending, paid, failed_needs_refund
                $t->string('tx_hash', 66)->nullable();
                $t->timestamp('expires_at');
                $t->timestamps();
            });
        }

        if (! Schema::hasTable('chain_deposits')) {
            Schema::create('chain_deposits', function (Blueprint $t) {
                $t->id();
                $t->string('tx_hash', 66);
                $t->unsignedInteger('log_index');
                $t->unsignedBigInteger('block_number');
                $t->string('from_address', 42);
                $t->string('amount_wei', 40);
                $t->unsignedBigInteger('order_id');
                $t->string('status', 20)->default('pending');   // processed, rejected
                $t->string('reject_reason')->nullable();
                $t->timestamps();

                $t->unique(['tx_hash', 'log_index']); // process event only one time  
            });
        }

        if (! Schema::hasTable('chain_state')) {
            Schema::create('chain_state', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('last_block')->default(0);
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('chain_state');
        Schema::dropIfExists('chain_deposits');
        Schema::dropIfExists('chain_orders');
    }
};