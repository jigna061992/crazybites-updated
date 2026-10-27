<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChainDeposit extends Model
{
    protected $table = 'chain_deposits';

    protected $fillable = [
        'tx_hash',
        'log_index',
        'block_number',
        'from_address',
        'recipient_address',
        'amount_wei',
        'order_id',
        'slot_number',
        'status',
        'reject_reason',
    ];
}