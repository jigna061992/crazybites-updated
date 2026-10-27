<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Earning extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'from_user_id', 'from_purchase_id',
        'slot_number', 'amount', 'type', 'upgraded_to_slot', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'amount'     => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function fromUser()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }
}