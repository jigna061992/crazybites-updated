<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Smart contract (CrazyBitsMatrixV2) ma user e withdrawReward / withdrawRoyalty karyu tenu record
        Schema::create('chain_wallet_withdrawals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('kind', 10);                  // reward | royalty
            $t->decimal('amount', 18, 2);
            $t->string('amount_wei', 40);
            $t->string('tx_hash', 66);
            $t->unsignedInteger('log_index');
            $t->unsignedBigInteger('block_number');
            $t->timestamp('created_at')->useCurrent();

            $t->unique(['tx_hash', 'log_index']);    // process event only one time
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chain_wallet_withdrawals');
    }
};
