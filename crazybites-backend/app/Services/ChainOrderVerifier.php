<?php

namespace App\Services;

use App\Models\ChainDeposit;
use App\Models\ChainOrder;
use Illuminate\Database\UniqueConstraintViolationException;
use kornrunner\Keccak;

class ChainOrderVerifier
{
    public function __construct(
        private ChainRpc $rpc,
        private ChainDepositProcessor $processor
    ) {
    }

    /**
     * Return: pending | confirming | paid | failed_needs_refund | tx_failed | tx_invalid
     * The user's tx hash is only a "pointer". We read the real data solely from the
     * on-chain receipt, so even if a fake tx hash is supplied, no payment/activation happens.
     */
    public function check(ChainOrder $order): string
    {
        if ($order->status !== 'pending' || ! $order->tx_hash) {
            return $order->status;
        }

        try {
            $receipt = $this->rpc->getTransactionReceipt($order->tx_hash);

            if (! $receipt) {
                return 'pending';                       // not mined yet
            }

            if (($receipt['status'] ?? '0x0') !== '0x1') {
                $order->update(['tx_hash' => null]);    // tx reverted, user can try again
                return 'tx_failed';
            }

            $block = (int) hexdec($receipt['blockNumber']);
            if ($this->rpc->blockNumber() - $block < config('chain.confirmations')) {
                return 'confirming';
            }
        } catch (\Throwable $e) {
            return 'pending';                           // RPC busy, UI will poll again
        }

       
     $topic0 = '0x' . Keccak::hash(
                    'Deposited(address,address,uint256,uint256,uint256)',
                    256
      );
      foreach ($receipt['logs'] ?? [] as $log) {
          if (
              strtolower($log['address'] ?? '') !==
              strtolower(config('chain.vault_address'))
          ) {
              continue;
          }

          $topics = $log['topics'] ?? [];

          if (
              strtolower($topics[0] ?? '') !== strtolower($topic0) ||
              count($topics) < 3
          ) {
              continue;
          }

          // Indexed fields: user, recipient
          $from = '0x' . substr($topics[1], -40);
          $recipient = '0x' . substr($topics[2], -40);

          // Non-indexed data: amount, orderId, slotNumber
          $data = substr($log['data'] ?? '', 2);

          if (strlen($data) < 192) {
              continue;
          }

          $amountWei = gmp_strval(gmp_init(substr($data, 0, 64), 16));
          $orderId = (int) gmp_strval(gmp_init(substr($data, 64, 64), 16));
          $slotNumber = (int) gmp_strval(gmp_init(substr($data, 128, 64), 16));

          if (
              $orderId !== (int) $order->id ||
              $slotNumber !== (int) $order->slot_number
          ) {
              continue;
          }

          if (
              strtolower($from) !==
              strtolower((string) $order->user->wallet_address)
          ) {
              continue;
          }

          if (
              gmp_cmp(
                  gmp_init($amountWei),
                  gmp_init((string) $order->amount_wei)
              ) !== 0
          ) {
              continue;
          }

          try {
              $deposit = ChainDeposit::create([
                  'tx_hash' => strtolower($receipt['transactionHash']),
                  'log_index' => (int) hexdec($log['logIndex']),
                  'block_number' => (int) hexdec($log['blockNumber']),
                  'from_address' => strtolower($from),
                  'recipient_address' => strtolower($recipient),
                  'amount_wei' => $amountWei,
                  'order_id' => $orderId,
                  'slot_number' => $slotNumber,
              ]);
          } catch (UniqueConstraintViolationException $e) {
              return $order->fresh()->status;
          }

          $this->processor->process($deposit);

          return $order->fresh()->status;
      }

    $order->update(['tx_hash' => null]);

      return 'tx_invalid';


          
      }
}