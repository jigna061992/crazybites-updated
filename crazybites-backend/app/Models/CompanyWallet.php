<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyWallet extends Model
{
    protected $table = 'company_wallet';
    protected $fillable = ['balance'];

}
