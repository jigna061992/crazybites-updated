<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChainOrder;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Http\Request;
use App\Services\ChainOrderVerifier;

class ChainController extends Controller
{
    public function saveWallet(Request $request)
    {
        \Log::info('Wallet connection debug', [
            'authenticated_user_id' => $request->user()->id,
            'authenticated_user_name' => $request->user()->name,
            'submitted_wallet' => strtolower($request->address),
        ]);

        $request->validate([
            'address' => ['required', 'regex:/^0x[a-fA-F0-9]{40}$/']
        ]);

        $address = strtolower($request->address);

        if (
            User::where('wallet_address', $address)
                ->where('id', '!=', $request->user()->id)
                ->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'This wallet is linked to another account.',
            ], 422);
        }

        $request->user()->update([
            'wallet_address' => $address,
        ]);

        return response()->json([
            'success' => true,
            'wallet_address' => $address,
        ]);
    }

    public function createOrder(Request $request)
    {
        $request->validate([
            'slot_number' => 'required|integer|min:1|max:15',
        ]);

        $user = $request->user();
        $slot = (int) $request->slot_number;

        if (! $user->wallet_address) {
            return response()->json([
                'success' => false,
                'message' => 'Connect your wallet first.',
            ], 422);
        }

        if (
            Purchase::where('user_id', $user->id)
                ->where('slot_number', $slot)
                ->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'This slot is already activated.',
            ], 422);
        }

        if (
            $slot !== 1 &&
            ! Purchase::where('user_id', $user->id)
                ->where('slot_number', 1)
                ->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Activate Slot 1 first.',
            ], 422);
        }

        $prices = config('commission.investment_slots');

        $amountWei = gmp_strval(gmp_mul(
            gmp_init((string) (int) $prices[$slot - 1]),
            gmp_pow(10, config('chain.decimals'))
        ));

        // For Slot 1, the contract requires the sponsor's wallet address.
        // If the user is the root user, the sponsor wallet remains null.
        $sponsorWallet = null;

        if ($slot === 1 && $user->referred_by) {
            $sponsor = User::find($user->referred_by);

            if (! $sponsor || ! $sponsor->wallet_address) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your sponsor has not connected a wallet yet.',
                ], 422);
            }

            if (
                ! Purchase::where('user_id', $sponsor->id)
                    ->where('slot_number', 1)
                    ->exists()
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your sponsor has not activated yet.',
                ], 422);
            }

            $sponsorWallet = $sponsor->wallet_address;
        }

        $order = ChainOrder::create([
            'user_id' => $user->id,
            'slot_number' => $slot,
            'amount_wei' => $amountWei,
            'expires_at' => now()->addMinutes(30),
        ]);

        return response()->json([
            'success' => true,
            'order' => [
                'id' => $order->id,
                'slot_number' => $order->slot_number,
                'amount_wei' => $order->amount_wei,
                'expires_at' => $order->expires_at,
                'sponsor_wallet' => $sponsorWallet,
            ],
        ], 201);
    }

    public function submitTx(
        Request $request,
        ChainOrder $order,
        ChainOrderVerifier $verifier
    ) {
        abort_unless($order->user_id === $request->user()->id, 403);

        $request->validate([
            'tx_hash' => ['required', 'regex:/^0x[a-fA-F0-9]{64}$/'],
        ]);

        if ($order->status === 'pending') {
            $order->update([
                'tx_hash' => strtolower($request->tx_hash),
            ]);
        }

        return response()->json([
            'success' => true,
            'status' => $verifier->check($order->fresh()),
        ]);
    }

    public function showOrder(
        Request $request,
        ChainOrder $order,
        ChainOrderVerifier $verifier
    ) {
        abort_unless($order->user_id === $request->user()->id, 403);

        return response()->json([
            'success' => true,
            'status' => $verifier->check($order),
            'tx_hash' => $order->fresh()->tx_hash,
        ]);
    }
}
