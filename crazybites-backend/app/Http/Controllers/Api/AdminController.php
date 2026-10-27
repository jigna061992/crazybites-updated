<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\User;
use App\Models\Earning;
use App\Models\RankAchievement;
use App\Models\CompanyWallet;
use App\Models\CompanyWalletTransaction;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private function assertAdmin(Request $request)
    {
        if (! $request->user()->is_admin) {
            abort(response()->json(['success' => false, 'message' => 'Unauthorized.'], 403));
        }
    }

    /**
     * User list (pagination + search).
     *   GET /admin/users?page=1&per_page=10&search=abc
     * per_page: 5 to 100 (default 10)
     */
    public function users(Request $request)
    {
        $this->assertAdmin($request);

        $perPage = min(max((int) $request->query('per_page', 10), 5), 100);
        $search  = trim((string) $request->query('search', ''));

        $query = User::with('sponsor:id,name,sponsor_id')
            ->withMin(['purchases as activated_at' => function ($q) {
                $q->where('slot_number', 1);
            }], 'purchased_at')
            ->orderByDesc('id');

        if ($search !== '') {
            $query->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                  ->orWhere('sponsor_id', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage)->through(fn ($u) => [
            'id'               => $u->id,
            'name'             => $u->name,
            'username'         => $u->username,
            'sponsor_id'       => $u->sponsor_id,
            'referred_by'      => $u->sponsor?->sponsor_id ?? '—',
            'referred_by_name' => $u->sponsor?->name ?? '—',
            'wallet_balance'   => (float) $u->wallet_balance,
            'status'           => $u->user_status,
            'activation_on'    => $u->activated_at,
            'signup_on'        => $u->created_at,
            'wallet_address'   => $u->wallet_address,
        ]);

        return response()->json([
            'success'      => true,
            'total'        => $paginator->total(),
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'from'         => $paginator->firstItem(),
            'to'           => $paginator->lastItem(),
            'data'         => $paginator->items(),
        ]);
    }

    /**
     * Lets an admin open any non-admin user's dashboard in VIEW-ONLY mode.
     * Issues a new Sanctum token for that user with the ability 'view-only'.
     * The BlockViewOnlyToken middleware blocks every POST/PUT/DELETE made with this token.
     */
    public function impersonate(Request $request, $id)
    {
        $this->assertAdmin($request);

        $user = User::where('is_admin', false)->find($id);
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found (admin accounts cannot be opened).',
            ], 404);
        }

        $token = $user->createToken('view_only_by_admin_' . $request->user()->id, ['view-only'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data'    => [
                'user'       => $user,
                'token'      => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    /**
     * Reward & Royalty Earning — rank achievements of all users.
     */
    public function rewardRoyaltyEarnings(Request $request)
    {
        $this->assertAdmin($request);

        $rows = RankAchievement::with('user:id,name,sponsor_id')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($r) => [
                'id'                  => $r->id,
                'user_name'           => $r->user?->name,
                'user_sponsor_id'     => $r->user?->sponsor_id,
                'rank_name'           => $r->rank_name,
                'reward_amount'       => (float) $r->reward_amount,
                'reward_achieved_at'  => $r->achieved_at,
                'royalty_amount'      => (float) $r->royalty_amount,
                'royalty_achieved_at' => $r->royalty_achieved_at,
            ]);

        return response()->json([
            'success'        => true,
            'total'          => $rows->count(),
            'total_reward'   => (float) $rows->sum('reward_amount'),
            'total_royalty'  => (float) $rows->sum('royalty_amount'),
            'data'           => $rows,
        ]);
    }

    /**
     * Company Earning — list of company_wallet_transactions.
     */
    public function companyEarnings(Request $request)
    {
        $this->assertAdmin($request);

        $rows = CompanyWalletTransaction::with('fromUser:id,name,sponsor_id')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($t) => [
                'id'               => $t->id,
                'from_user_name'   => $t->fromUser?->name ?? '—',
                'from_sponsor_id'  => $t->fromUser?->sponsor_id ?? '—',
                'slot_number'      => $t->slot_number,
                'amount'           => (float) $t->amount,
                'reason'           => $t->reason,
                'created_at'       => $t->created_at,
            ]);

        $balance = (float) (CompanyWallet::first()->balance ?? 0);

        return response()->json([
            'success'        => true,
            'company_balance'=> $balance,
            'total'          => $rows->count(),
            'total_amount'   => (float) $rows->sum('amount'),
            'data'           => $rows,
        ]);
    }

    /**
     * Matrix Earning — credits received by all users from the 5x5 matrix
     * (credit / upgrade_used / recycle / reward / royalty — from the Earning table).
     */
    public function matrixEarnings(Request $request)
    {
        $this->assertAdmin($request);

        $rows = Earning::with(['user:id,name,sponsor_id', 'fromUser:id,name,sponsor_id'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id'               => $e->id,
                'to_user_name'     => $e->user?->name,
                'to_sponsor_id'    => $e->user?->sponsor_id,
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
            'total_amount' => (float) $rows->sum('amount'),
            'data'         => $rows,
        ]);
    }

    /**
     * Referral Earning — only the credits received from a direct referral's activation
     * (positions 1 & 4, type='credit').
     */
    public function referralEarnings(Request $request)
    {
        $this->assertAdmin($request);

        $rows = Earning::where('type', 'credit')
            ->with(['user:id,name,sponsor_id', 'fromUser:id,name,sponsor_id'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($e) => [
                'id'              => $e->id,
                'to_user_name'    => $e->user?->name,
                'to_sponsor_id'   => $e->user?->sponsor_id,
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

    public function dashboardStats(Request $request)
    {
        $this->assertAdmin($request);

        $base = User::where('is_admin', false);

        $totalUsers    = (clone $base)->count();
        $activeUsers   = (clone $base)->where('user_status', 'Active')->count();
        $inactiveUsers = $totalUsers - $activeUsers;

        $todayJoined = (clone $base)->whereDate('created_at', today())->count();

        $todayActivated = (clone $base)->whereHas('purchases', function ($q) {
            $q->where('slot_number', 1)->whereDate('purchased_at', today());
        })->count();

        $companyBalance = (float) (CompanyWallet::first()->balance ?? 0);

        return response()->json([
            'success' => true,
            'data' => [
                'total_users'     => $totalUsers,
                'active_users'    => $activeUsers,
                'inactive_users'  => $inactiveUsers,
                'today_joined'    => $todayJoined,
                'today_activated' => $todayActivated,
                'company_wallet'  => $companyBalance,
            ],
        ]);
    }
}