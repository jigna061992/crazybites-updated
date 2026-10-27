<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Earning;
use App\Models\CompanyWallet;
use App\Models\CompanyWalletTransaction;
use App\Services\RankService;
use App\Models\RankAchievement;
use App\Models\ChainWalletWithdrawal;
use App\Traits\ActivatesSlots;

class PurchaseController extends Controller
{
    use ActivatesSlots;
   

    /**
     * All slots + status.
     * While slot 1 is not activated: only slot 1 is unlocked, all others are locked.
     * Once slot 1 is activated: all other slots are unlocked (ready) as well.
     */
    public function slots(Request $request)
    {
        $user    = $request->user();
        $amounts = $this->slotAmounts();

        $statusBySlot = Purchase::where('user_id', $user->id)
            ->pluck('status', 'slot_number');

        $slot1Done = $statusBySlot->has(1);

        $slots = collect($amounts)->map(function ($amount, $index) use ($statusBySlot, $slot1Done) {
            $slotNumber = $index + 1;

            if (isset($statusBySlot[$slotNumber])) {
                $status = $statusBySlot[$slotNumber];
            } elseif ($slotNumber === 1) {
                $status = 'unlocked';
            } elseif ($slot1Done) {
                $status = 'unlocked';
            } else {
                $status = 'locked';
            }

            return [
                'slot_number' => $slotNumber,
                'amount'      => (float) $amount,
                'status'      => $status,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'activation_completed' => $slot1Done,
                'slots'                => $slots,
            ],
        ]);
    }

    /**
     * Purchase/activate a slot.
     */
    public function purchase(Request $request)
    {
         // Free activation is disabled in chain mode: the user must deposit USDT from a wallet
        if (config('chain.enabled')) {
            return response()->json([
                'success' => false,
                'message' => 'Please pay with your wallet (USDT deposit).',
            ], 403);
        }

        $validator = Validator::make($request->all(), ['amount' => 'required|numeric|min:1']);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }
        $amounts = array_map('floatval', $this->slotAmounts());
        $index   = array_search((float) $request->amount, $amounts, true);
        if ($index === false) {
            return response()->json(['success' => false, 'message' => 'Invalid slot.'], 422);
        }

        try {
            $purchase = $this->activateSlot($request->user(), $index + 1);
        } catch (\DomainException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
        return response()->json([
            'success' => true,
            'message' => 'Slot $' . number_format($amounts[$index]) . ' activated!',
            'data'    => [
                'purchase_id' => $purchase->id,
                'amount'      => $purchase->amount,
                'user'        => $request->user()->fresh(),
            ],
        ], 201);
    }


   

   





    
    

    
   

   

    /**
     * Full earnings statement of the logged-in user:
     *   - their own slot purchases (DEBIT)
     *   - earnings received from referrals (CREDIT — credit / upgrade_used / recycle / reward / royalty)
     * Everything is merged by date into a timeline with a running wallet balance.
     */
    public function earnings(Request $request)
    {
        $user = $request->user();

        $purchases = Purchase::where('user_id', $user->id)
            ->orderBy('purchased_at')
            ->get()
            ->map(fn ($p) => [
                'kind'             => 'debit',
                'label'            => 'Slot ' . $p->slot_number . ' ($' . number_format($p->amount) . ') activate',
                'from_user'        => null,
                'from_sponsor_id'  => null,
                'slot_number'      => $p->slot_number,
                'amount'           => (float) $p->amount,
                'type'             => 'purchase',
                'upgraded_to_slot' => null,
                'created_at'       => $p->purchased_at,
            ]);

        $earnings = $user->earnings()
            ->with('fromUser:id,name,username,sponsor_id')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($e) => [
                'kind'             => 'credit',
                'label'            => ($e->fromUser?->name ?? '—') . ' — Slot ' . $e->slot_number,
                'from_user'        => $e->fromUser?->name,
                'from_sponsor_id'  => $e->fromUser?->sponsor_id,
                'slot_number'      => $e->slot_number,
                'amount'           => (float) $e->amount,
                'type'             => $e->type,
                'upgraded_to_slot' => $e->upgraded_to_slot,
                'created_at'       => $e->created_at,
            ]);

        // Rank achievements — as CREDIT entries (only REWARD rows, where achieved_at is not null)
        $rankEntries = RankAchievement::where('user_id', $user->id)
            ->whereNotNull('achieved_at')
            ->get()
            ->map(fn ($r) => [
                'kind'             => 'credit',
                'label'            => $r->rank_name . ' Rank Achieved',
                'from_user'        => null,
                'from_sponsor_id'  => null,
                'slot_number'      => 0,
                'amount'           => (float) $r->reward_amount,
                'type'             => 'rank_reward',
                'upgraded_to_slot' => null,
                'created_at'       => $r->achieved_at,
            ]);

        // Royalty achievements — as CREDIT entries (where royalty_achieved_at is not null)
        $royaltyEntries = RankAchievement::where('user_id', $user->id)
            ->whereNotNull('royalty_achieved_at')
            ->get()
            ->map(fn ($r) => [
                'kind'             => 'credit',
                'label'            => $r->rank_name . ' Royalty Achieved',
                'from_user'        => null,
                'from_sponsor_id'  => null,
                'slot_number'      => 0,
                'amount'           => (float) $r->royalty_amount,
                'type'             => 'rank_royalty',
                'upgraded_to_slot' => null,
                'created_at'       => $r->royalty_achieved_at,
            ]);

        // Withdrawals from the Reward / Royalty wallet to MetaMask (as DEBIT entries)
        $withdrawals = ChainWalletWithdrawal::where('user_id', $user->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn ($w) => [
                'kind'             => 'debit',
                'label'            => ucfirst($w->kind) . ' withdrawn to MetaMask',
                'from_user'        => null,
                'from_sponsor_id'  => null,
                'slot_number'      => 0,
                'amount'           => (float) $w->amount,
                'type'             => $w->kind . '_withdraw',
                'upgraded_to_slot' => null,
                'created_at'       => $w->created_at,
            ]);

        $running  = 0.0;
        $timeline = $purchases->concat($earnings)->concat($rankEntries)->concat($royaltyEntries)->concat($withdrawals)
            ->sortBy('created_at')
            ->values()
            ->map(function ($row) use (&$running) {
                $running += $row['kind'] === 'debit' ? -$row['amount'] : $row['amount'];
                $row['running_balance'] = round($running, 2);
                return $row;
            })
            ->sortByDesc('created_at')
            ->values();

        $totalDebit     = (float) $purchases->sum('amount');
        $totalCredited  = (float) $earnings->sum('amount');
        $usedForUpgrade = (float) $earnings->where('type', 'upgrade_used')->sum('amount');
        $netEarned      = (float) $earnings->whereIn('type', ['credit', 'recycle'])->sum('amount');
        // $companyWallet  = (float) (CompanyWallet::first()->balance ?? 0);

        // How much went to the company wallet because of this user (from their own activations)
        // $sentToCompany = (float) CompanyWalletTransaction::where('from_user_id', $user->id)
                            // ->sum('amount');

        // Reward wallet's breakdown: how much from matrix , how much from rank 
        $matrixReward = (float) $earnings->where('type', 'reward')->sum('amount')
            - (float) $withdrawals->where('type', 'reward_withdraw')->sum('amount');
        $rankReward   = (float) RankAchievement::where('user_id', $user->id)->sum('reward_amount');

           $payload = [
                'success'          => true,
                'wallet_balance'   => (float) $user->wallet_balance,
                'reward_wallet'    => (float) $user->reward_wallet,
                'reward_breakdown' => [
                    'from_matrix' => $matrixReward,
                    'from_rank'   => $rankReward,
                ],
                'royalty_wallet'   => (float) $user->royalty_wallet,
                'total_debit'      => $totalDebit,
                'total_credited'   => $totalCredited,
                'used_for_upgrade' => $usedForUpgrade,
                'net_earned'       => $netEarned,
                'given_to_sponsor' => (float) $user->given_to_sponsor,
                'total'            => $timeline->count(),
                'timeline'         => $timeline,
            ];

            // Company wallet data sent to admin only (not to normal user )
            if ($user->is_admin) {
                $payload['company_wallet']         = (float) (CompanyWallet::first()->balance ?? 0);
                $payload['sent_to_company_wallet'] = (float) CompanyWalletTransaction::where('from_user_id', $user->id)->sum('amount');
            }

            return response()->json($payload);
    }
    

   
    

    /**
     * Rank progress of the logged-in user — with progress bars for the 3 ranks.
     * For every rank, the REWARD (time-limited) and the ROYALTY (time-unlimited)
     * statuses are reported separately.
     */
   public function myRank(Request $request)
    {
        $user        = $request->user();
        $rankService = app(RankService::class);

        $highestSlot = $rankService->highestSlotAchieved($user);

        $ranks     = collect(config('commission.ranks', []));
        $sinceDate = null;

        $result = $ranks->map(function ($rank) use ($user, $rankService, &$sinceDate, $highestSlot) {
            $row = RankAchievement::where('user_id', $user->id)
                ->where('rank_name', $rank['name'])
                ->first();

            $directCount = $rankService->directCount($user, $sinceDate);
            $teamSize    = $rankService->teamSize($user, $sinceDate);

            $deadline    = $user->created_at->copy()->addMonths($rank['months_limit']);
            $daysElapsed = (int) $user->created_at->diffInDays(now());
            $daysLimit   = (int) $user->created_at->diffInDays($deadline);

            $data = [
                'name'                => $rank['name'],
                'direct_needed'       => $rank['direct_needed'],
                'team_needed'         => $rank['team_needed'],
                'slot_needed'         => $rank['slot_needed'] ?? 0,
                'current_slot'        => $highestSlot,
                'months_limit'        => $rank['months_limit'],
                'days_limit'          => $daysLimit,
                'reward'              => $rank['reward'],
                'royalty'             => $rank['royalty'],
                'royalty_amount'      => round($rank['reward'] * ($rank['royalty'] / 100), 2),
                'achieved'            => (bool) ($row?->achieved_at),
                'achieved_at'         => $row?->achieved_at,
                'royalty_achieved'    => (bool) ($row?->royalty_achieved_at),
                'royalty_achieved_at' => $row?->royalty_achieved_at,
                // NEW — actual earned amounts (0 if not achieved yet)
                'reward_earned'       => $row && $row->achieved_at ? (float) $row->reward_amount : 0,
                'royalty_earned'      => $row && $row->royalty_achieved_at ? (float) $row->royalty_amount : 0,
                'current_direct'      => $directCount,
                'current_team'        => $teamSize,
                'days_elapsed'        => $daysElapsed,
                'still_eligible'      => now()->lessThanOrEqualTo($deadline),
            ];

            if ($row?->achieved_at) {
                $sinceDate = $row->achieved_at;
            }

            return $data;
        });

        // NEW — rank-only clean totals (reward/royalty earned from the matrix is NOT mixed in)
        $rankRewardTotal  = (float) RankAchievement::where('user_id', $user->id)->whereNotNull('achieved_at')->sum('reward_amount');
        $rankRoyaltyTotal = (float) RankAchievement::where('user_id', $user->id)->whereNotNull('royalty_achieved_at')->sum('royalty_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'current_rank'   => $user->current_rank,
                'reward_wallet'  => $rankRewardTotal,
                'royalty_wallet' => $rankRoyaltyTotal,
                'total_earned'   => $rankRewardTotal + $rankRoyaltyTotal,   // combined total
                'ranks'          => $result,
            ],
        ]);
    }

    /** My Earnings > Reward & Royalty — this user's rank reward / royalty */
    public function myRewardRoyalty(Request $request)
    {
        $user = $request->user();

        $rows = RankAchievement::where('user_id', $user->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($r) => [
                'id'                  => $r->id,
                'rank_name'           => $r->rank_name,
                'reward_amount'       => (float) $r->reward_amount,
                'reward_achieved_at'  => $r->achieved_at,
                'royalty_amount'      => (float) $r->royalty_amount,
                'royalty_achieved_at' => $r->royalty_achieved_at,
                'days_taken'          => $r->days_taken,
            ]);

        return response()->json([
            'success'       => true,
            'total'         => $rows->count(),
            'total_amount'  => (float) $rows->sum('reward_amount') + (float) $rows->sum('royalty_amount'),
            'total_reward'  => (float) $rows->sum('reward_amount'),
            'total_royalty' => (float) $rows->sum('royalty_amount'),
            'data'          => $rows,
        ]);
    }

    /** My Earnings > Matrix Earning — matrix cycle (recycle), upgrade_used, reward, royalty */
    public function myMatrixEarnings(Request $request)
    {
        $user = $request->user();

        $rows = Earning::where('user_id', $user->id)
            ->where('type', '!=', 'credit')
            ->with('fromUser:id,name,sponsor_id')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id'               => $e->id,
                'from_user_name'   => $e->fromUser?->name ?? '—',
                'from_sponsor_id'  => $e->fromUser?->sponsor_id ?? '—',
                'slot_number'      => $e->slot_number,
                'amount'           => (float) $e->amount,
                'type'             => $e->type,
                'upgraded_to_slot' => $e->upgraded_to_slot,
                'created_at'       => $e->created_at,
            ]);

        return response()->json([
            'success'      => true,
            'total'        => $rows->count(),
            'total_amount' => (float) $rows->whereIn('type', ['recycle', 'reward', 'royalty'])->sum('amount'),
            'cycles'       => $rows->where('type', 'recycle')->count(),
            'data'         => $rows,
        ]);
    }

    /** My Earnings > Referral Earning — the credit my referrals gave me by activating their accounts */
    public function myReferralEarnings(Request $request)
    {
        $user = $request->user();

        $rows = Earning::where('user_id', $user->id)
            ->where('type', 'credit')
            ->with('fromUser:id,name,sponsor_id')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id'              => $e->id,
                'from_user_name'  => $e->fromUser?->name ?? '—',
                'from_sponsor_id' => $e->fromUser?->sponsor_id ?? '—',
                'slot_number'     => $e->slot_number,
                'amount'          => (float) $e->amount,
                'created_at'      => $e->created_at,
            ]);

        return response()->json([
            'success'      => true,
            'total'        => $rows->count(),
            'total_amount' => (float) $rows->sum('amount'),
            'data'         => $rows,
        ]);
    }
}