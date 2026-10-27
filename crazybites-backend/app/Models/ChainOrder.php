<?php
// ChainOrder.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChainOrder extends Model
{
    protected $guarded = [];
    protected $casts = ['expires_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }
}