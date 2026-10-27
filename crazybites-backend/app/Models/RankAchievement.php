<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RankAchievement extends Model
{
    public $timestamps = false;

      protected $fillable = [
        'user_id', 'rank_name',
        'reward_amount', 'direct_count_at_time', 'team_size_at_time', 'days_taken', 'achieved_at',
        'royalty_amount', 'royalty_achieved_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}