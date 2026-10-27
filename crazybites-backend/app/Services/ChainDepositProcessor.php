<?php

namespace App\Services;

use App\Models\ChainDeposit;
use App\Models\ChainOrder;
use App\Models\Purchase;
use App\Models\User;
use App\Traits\ActivatesSlots;
use Illuminate\Support\Facades\DB;

class ChainDepositProcessor
{
    use ActivatesSlots;

    public function process(ChainDeposit $deposit): void
    {
        DB::transaction(function () use ($deposit) {

            // Prevent the same deposit from being processed twice.
            $deposit = ChainDeposit::lockForUpdate()->find($deposit->id);

            if (!$deposit || $deposit->status !== 'pending') {
                return;
            }

            $order = ChainOrder::with('user')
                ->lockForUpdate()
                ->find($deposit->order_id);

            if (!$order) {
                $this->reject($deposit, 'unknown_order');
                return;
            }

            if ($order->status !== 'pending') {
                $this->reject($deposit, 'order_not_pending');
                return;
            }

            if (!$order->user) {
                $this->reject($deposit, 'unknown_user');
                return;
            }

            // Verify sender wallet.
            if (
                strtolower((string) $order->user->wallet_address) !==
                strtolower((string) $deposit->from_address)
            ) {
                $this->reject($deposit, 'wallet_mismatch');
                return;
            }

            // Verify exact token amount.
            if (
                gmp_cmp(
                    gmp_init((string) $deposit->amount_wei),
                    gmp_init((string) $order->amount_wei)
                ) !== 0
            ) {
                $this->reject($deposit, 'amount_mismatch');
                return;
            }

            // Verify slot number from the event matches the order.
            if (
                (int) $deposit->slot_number !==
                (int) $order->slot_number
            ) {
                $this->reject($deposit, 'slot_number_mismatch');
                return;
            }

            // In the 5x5 matrix contract, the funds first go to the contract itself,
            // and the contract then distributes them internally.
            // So the recipient must always be this matrix contract.
            if (
                strtolower((string) $deposit->recipient_address) !==
                strtolower((string) config('chain.vault_address'))
            ) {
                $order->update([
                    'status' => 'failed_needs_refund',
                    'tx_hash' => $deposit->tx_hash,
                ]);

                $this->reject($deposit, 'recipient_not_matrix_contract');

                return;
            }

            try {
                // Create Laravel purchase without duplicating sponsor rewards.
                $this->activateSlot(
                    $order->user,
                    (int) $order->slot_number,
                    true
                );
            } catch (\DomainException $e) {
                // On-chain payment already happened; this does NOT refund it.
                $order->update([
                    'status' => 'failed_needs_refund',
                    'tx_hash' => $deposit->tx_hash,
                ]);

                $this->reject(
                    $deposit,
                    'activation_failed: ' . $e->getMessage()
                );

                return;
            }

            // Mark order/deposit complete only after successful activation.
            $order->update([
                'status' => 'paid',
                'tx_hash' => $deposit->tx_hash,
            ]);

            $deposit->update([
                'status' => 'processed',
                'reject_reason' => null,
            ]);
        });
    }

    private function reject(
        ChainDeposit $deposit,
        string $reason
    ): void {
        $deposit->update([
            'status' => 'rejected',
            'reject_reason' => $reason,
        ]);
    }
}