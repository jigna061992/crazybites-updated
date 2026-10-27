<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
     protected $fillable = ['user_id', 'slot_number', 'amount', 'status', 'purchased_at'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
