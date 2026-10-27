<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChainWalletWithdrawal extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'kind', 'amount', 'amount_wei', 'tx_hash', 'log_index', 'block_number', 'created_at',
    ];

    protected $casts = [
        'amount'     => 'float',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
