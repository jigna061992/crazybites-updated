<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\RankAchievement;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RankService
{
    public function directCount(User $user, ?string $sinceDate = null): int
    {
        $query = User::where('referred_by', $user->id);
        if ($sinceDate) {
            $query->where('created_at', '>', $sinceDate);
        }
        return $query->count();
    }

    public function teamSize(User $user, ?string $sinceDate = null): int
    {
        // Team = direct + everyone below the directs (directs also count as team).
        // So 5 directs + their 20 referrals = 25 team. Same as the contract (RankModule).
        $total     = 0;
        $parentIds = [$user->id];

        while (! empty($parentIds)) {
            $query = User::whereIn('referred_by', $parentIds);
            if ($sinceDate) {
                $query->where('created_at', '>', $sinceDate);
            }
            $total += $query->count();

            $parentIds = User::whereIn('referred_by', $parentIds)->pluck('id')->all();
        }

        return $total;
    }

    /**
     * Joining date = the date the user's slot 1 was ACTIVATED (same as the contract's RankModule).
     * If there is no slot 1 purchase, fall back to the date the account was created.
     */
    public function joiningDate(User $user): Carbon
    {
        $date = Purchase::where('user_id', $user->id)
            ->where('slot_number', 1)
            ->min('purchased_at');

        return $date ? Carbon::parse($date) : $user->created_at->copy();
    }

    public function highestSlotAchieved(User $user): int
    {
        return (int) Purchase::where('user_id', $user->id)->max('slot_number');
    }

    /**
     * REWARD and ROYALTY — both in the same rank_achievements row, but with different conditions:
     *   - REWARD: earned only if the conditions are met WITHIN the deadline (months_limit) (one-time).
     *   - ROYALTY: SAME conditions, but NO DEADLINE — earned whenever the mode is completed.
     * Two sets of columns per rank: reward_amount/achieved_at (reward) and
     * royalty_amount/royalty_achieved_at (royalty) — both independent.
     */
  public function checkAndAward(User $user): void
{
    $ranks = config('commission.ranks', []);

    $lastRewardAchievement = RankAchievement::where('user_id', $user->id)
        ->whereNotNull('achieved_at')
        ->orderByDesc('achieved_at')
        ->first();

    $sinceDate   = $lastRewardAchievement?->achieved_at;
    $highestSlot = $this->highestSlotAchieved($user);

    foreach ($ranks as $rank) {
        $row = RankAchievement::firstOrNew([
            'user_id'   => $user->id,
            'rank_name' => $rank['name'],
        ]);

        $rewardAlreadyGiven  = ! is_null($row->achieved_at);
        $royaltyAlreadyGiven = ! is_null($row->royalty_achieved_at);

        if ($rewardAlreadyGiven && $royaltyAlreadyGiven) {
            continue;   // both already received, check the next rank
        }

        // ── Reward already received, royalty still pending ──
        // The conditions were already PROVEN when the reward was given,
        // so there is no need to check again — give the royalty directly.
        if ($rewardAlreadyGiven && ! $royaltyAlreadyGiven) {
            $royaltyAmount = round($rank['reward'] * ($rank['royalty'] / 100), 2);

            $row->royalty_amount      = $royaltyAmount;
            $row->royalty_achieved_at = now();

            $user->royalty_wallet = (float) $user->royalty_wallet + $royaltyAmount;

            DB::transaction(function () use ($user, $row) {
                $user->save();
                $row->save();
            });

            continue;   // move on and check the next rank
        }

        // ── Reward not received yet — check the conditions fresh ──
        $directCount = $this->directCount($user, $sinceDate);
        $teamSize    = $this->teamSize($user, $sinceDate);
        $meetsDirect = $directCount >= $rank['direct_needed'];
        $meetsTeam   = $teamSize >= $rank['team_needed'];
        $meetsSlot   = $highestSlot >= ($rank['slot_needed'] ?? 0);
        $conditionsMet = $meetsDirect && $meetsTeam && $meetsSlot;

        if (! $conditionsMet) {
            continue;
        }

        $joinedOn   = $this->joiningDate($user);
        $deadline   = $joinedOn->copy()->addMonths($rank['months_limit']);
        $withinTime = now()->lessThanOrEqualTo($deadline);

        $royaltyAmount = round($rank['reward'] * ($rank['royalty'] / 100), 2);

        if ($withinTime) {
            // ── Within the deadline — give REWARD + ROYALTY TOGETHER ──
            $row->reward_amount        = $rank['reward'];
            $row->direct_count_at_time = $directCount;
            $row->team_size_at_time    = $teamSize;
            $row->days_taken           = $joinedOn->diffInDays(now());
            $row->achieved_at          = now();
            $row->royalty_amount       = $royaltyAmount;
            $row->royalty_achieved_at  = now();

            $user->reward_wallet  = (float) $user->reward_wallet + $rank['reward'];
            $user->royalty_wallet = (float) $user->royalty_wallet + $royaltyAmount;
            $user->current_rank   = $rank['name'];

            DB::transaction(function () use ($user, $row) {
                $user->save();
                $row->save();
            });

            return;   // fresh window for the next call, the next rank will be checked later
        }

        // ── Deadline passed — NO reward, but ROYALTY (no deadline) is still earned ──
        $row->royalty_amount       = $royaltyAmount;
        $row->royalty_achieved_at  = now();
        $row->direct_count_at_time = $directCount;
        $row->team_size_at_time    = $teamSize;

        $user->royalty_wallet = (float) $user->royalty_wallet + $royaltyAmount;

        DB::transaction(function () use ($user, $row) {
            $user->save();
            $row->save();
        });
    }
}
}