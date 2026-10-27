<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
class CompanyWalletTransaction extends Model
{
    public $timestamps = false;
    protected $table = 'company_wallet_transactions';
    protected $fillable = ['from_user_id', 'slot_number', 'amount', 'reason', 'created_at'];

    public function fromUser()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }
}
