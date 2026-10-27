<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Earning;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    private function slotAmounts(): array
    {
        return array_map('floatval', config('commission.investment_slots', [50, 100, 200, 400, 800, 1600, 3200, 6400]));
    }

    public function myTeam(Request $request)
    {
        $user = $request->user();

        $directReferrals = $user->directReferrals()
            ->withCount('purchases')
            ->withSum('purchases', 'amount')
            ->get()
            ->map(function ($ref) {
                return [
                    'id'              => $ref->id,
                    'name'            => $ref->name,
                    'sponsor_id'      => $ref->sponsor_id,
                    'username'        => $ref->username,
                    'id_status'       => $ref->user_status,
                    'joined_on'       => $ref->created_at->format('d-m-Y'),
                    'total_purchases' => $ref->purchases_count,
                    'purchase_amount' => $ref->purchases_sum_amount ?? 0,
                ];
            });

        return response()->json([
            'status' => true,
            'data'   => $directReferrals,
        ]);
    }

    /**
     * For the My Referrals page: list of direct referrals.
     * Response: { success, total, referrals: [...] }
     */
    public function myReferrals(Request $request)
    {
        $user = $request->user();

        // [from_user_id => total earned] — how much I earned from each referral
        $earningsByUser = Earning::where('user_id', $user->id)
            ->selectRaw('from_user_id, SUM(amount) as total')
            ->groupBy('from_user_id')
            ->pluck('total', 'from_user_id');

        // POSITION of each direct referral in the slot 1 matrix (by order, repeating 1-5)
        $slot1LegOrder = Purchase::where('slot_number', 1)
            ->whereIn('user_id', $user->directReferrals()->pluck('id'))
            ->orderBy('id')
            ->pluck('user_id')
            ->values();

        $positionByUser = [];
        foreach ($slot1LegOrder as $index => $referralId) {
            $positionByUser[$referralId] = ($index % 5) + 1;   // 1,2,3,4,5,1,2,3,4,5...
        }

        $referrals = $user->directReferrals()
            ->withSum('purchases', 'amount')
            ->withMin(['purchases as activated_at' => function ($q) {
                $q->where('slot_number', 1);          // time when slot 1 was activated
            }], 'purchased_at')
            ->orderByDesc('id')
            ->get()
            ->map(function ($ref) use ($earningsByUser, $positionByUser) {
                return [
                    'id'           => $ref->id,
                    'name'         => $ref->name,
                    'username'     => $ref->username,
                    'user_status'  => $ref->user_status,
                    'activated_at' => $ref->activated_at,
                    'total_topup'  => (float) ($ref->purchases_sum_amount ?? 0),
                    'earned_from'  => (float) ($earningsByUser[$ref->id] ?? 0),
                    'leg_position' => $positionByUser[$ref->id] ?? null,
                    'created_at'   => $ref->created_at,
                ];
            })
            ->values();

        return response()->json([
            'success'   => true,
            'total'     => $referrals->count(),
            'referrals' => $referrals,
        ]);
    }

    /**
     * Referral tree of the logged-in user (the team they sponsored, nested).
     * Queried level by level, so there is no N+1 problem.
     */
    public function tree(Request $request)
    {
        $root     = $request->user();
        $maxDepth = 10;   // how many levels deep to load the tree

        $byParent  = [];          // [referred_by => [user, user, ...]]
        $parentIds = [$root->id];

        for ($level = 1; $level <= $maxDepth && ! empty($parentIds); $level++) {
            $children = User::whereIn('referred_by', $parentIds)
                ->withMax('purchases', 'slot_number')
                ->orderBy('id')
                ->get();

            foreach ($children as $child) {
                $byParent[$child->referred_by][] = $child;
            }

            $parentIds = $children->pluck('id')->all();
        }

        $build = function (User $user) use (&$build, $byParent) {
            $children = collect($byParent[$user->id] ?? [])
                ->map(fn ($child) => $build($child))
                ->values();

            return [
                'id'           => $user->id,
                'name'         => $user->name,
                'sponsor_id'   => $user->sponsor_id,
                'username'     => $user->username,
                'status'       => $user->user_status,
                'slot'         => (int) ($user->purchases_max_slot_number ?? 0),
                'joined_on'    => optional($user->created_at)->format('d-m-Y'),
                'direct_count' => $children->count(),
                'children'     => $children,
            ];
        };

        return response()->json([
            'status' => true,
            'data'   => $build($root),
        ]);
    }

    /**
     * For the dashboard: all slots of the user + the 5x5 matrix of each slot
     * (which direct activated this slot, how much, and at which position).
     * Logic is the same as PurchaseController::processSponsorUpgrade.
     */
    public function matrix(Request $request)
    {
        $user    = $request->user();
        $amounts = $this->slotAmounts();

        $directs = User::where('referred_by', $user->id)
            ->get(['id', 'name', 'username', 'sponsor_id'])
            ->keyBy('id');

        $myPurchases = Purchase::where('user_id', $user->id)->get()->keyBy('slot_number');

        $slots = [];

        foreach ($amounts as $index => $amount) {
            $slotNumber = $index + 1;
            $mine       = $myPurchases->get($slotNumber);

            if ($mine) {
                $status = $mine->status;                 // active / completed
            } elseif ($slotNumber === 1) {
                $status = 'unlocked';
            } else {
                $status = 'locked';
            }

            $legs   = [];
            $earned = 0.0;

            if ($mine && $directs->isNotEmpty()) {
                $purchases = Purchase::where('slot_number', $slotNumber)
                    ->where('id', '>', $mine->id)         // only counted after the sponsor's own slot was activated
                    ->whereIn('user_id', $directs->keys())
                    ->orderBy('id')
                    ->get()
                    ->values();

                foreach ($purchases as $i => $p) {
                    $position = ($i % 5) + 1;
                    $type     = in_array($position, [1, 4], true) ? 'your'
                              : (in_array($position, [2, 3], true) ? 'next_slot' : 'recycle');

                    // position 5 (recycle) money goes to the upline, not to this user
                    if ($position !== 5) {
                        $earned += (float) $p->amount;
                    }

                    $legs[] = [
                        'position'     => $position,
                        'cycle'        => intdiv($i, 5) + 1,
                        'type'         => $type,
                        'user_id'      => $p->user_id,
                        'name'         => $directs[$p->user_id]->name ?? '-',
                        'sponsor_id'   => $directs[$p->user_id]->sponsor_id ?? null,
                        'amount'       => (float) $p->amount,
                        'purchased_at' => $p->purchased_at,
                    ];
                }
            }

            $slots[] = [
                'slot_number'   => $slotNumber,
                'amount'        => $amount,
                'status'        => $status,
                'activated_at'  => $mine?->purchased_at,
                'total_legs'    => count($legs),
                'current_cycle' => intdiv(count($legs), 5) + 1,
                'earned'        => $earned,
                'legs'          => $legs,
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => $slots,
        ]);
    }
}