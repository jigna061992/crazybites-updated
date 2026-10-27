<?php

namespace App\Console\Commands;

use App\Models\ChainDeposit;
use App\Models\ChainState;
use App\Services\ChainDepositProcessor;
use App\Services\ChainRpc;
use App\Services\ChainWithdrawalProcessor;
use Illuminate\Console\Command;
use Illuminate\Database\UniqueConstraintViolationException;
use kornrunner\Keccak;

class ChainSync extends Command
{
    protected $signature = 'chain:sync';
    protected $description = 'Matrix contract na Deposited events vanchi ne slot activate kare (fallback)';

    public function handle(ChainRpc $rpc, ChainDepositProcessor $processor, ChainWithdrawalProcessor $withdrawals): int
    {
        $state = ChainState::first()
            ?? ChainState::create(['last_block' => max(0, config('chain.start_block') - 1)]);

        $safeBlock = $rpc->blockNumber() - config('chain.confirmations');

        // ChainOrderVerifier જેવું જ signature: Deposited(user, recipient, amount, orderId, slotNumber)
        $topic0 = '0x' . Keccak::hash('Deposited(address,address,uint256,uint256,uint256)', 256);

        for ($i = 0; $i < config('chain.max_chunks_per_run'); $i++) {
            $from = $state->last_block + 1;

            if ($from > $safeBlock) {
                $this->info('Up to date.');
                break;
            }

            $to   = min($safeBlock, $from + config('chain.chunk') - 1);
            $logs = $rpc->getLogs($from, $to, config('chain.vault_address'), [$topic0]);

            foreach ($logs as $log) {
                $topics = $log['topics'] ?? [];
                $data   = substr($log['data'] ?? '', 2);

                if (count($topics) < 3 || strlen($data) < 192) {
                    continue;
                }

                try {
                    $deposit = ChainDeposit::create([
                        'tx_hash'           => strtolower($log['transactionHash']),
                        'log_index'         => (int) hexdec($log['logIndex']),
                        'block_number'      => (int) hexdec($log['blockNumber']),
                        'from_address'      => '0x' . substr($topics[1], -40),
                        'recipient_address' => '0x' . substr($topics[2], -40),
                        'amount_wei'        => gmp_strval(gmp_init(substr($data, 0, 64), 16)),
                        'order_id'          => (int) gmp_strval(gmp_init(substr($data, 64, 64), 16)),
                        'slot_number'       => (int) gmp_strval(gmp_init(substr($data, 128, 64), 16)),
                    ]);
                } catch (UniqueConstraintViolationException $e) {
                    continue;   // pehla thi process thai gayo
                }

                $processor->process($deposit);
                $this->info("Deposit {$deposit->tx_hash} => {$deposit->fresh()->status}");
            }

            // Reward / Royalty withdraw events (CrazyBitsMatrixV2) => DB wallet ma thi ghatado
            $wLogs = $rpc->getLogs($from, $to, config('chain.vault_address'), [array_values(ChainWithdrawalProcessor::topics())]);
            foreach ($wLogs as $wLog) {
                if ($withdrawals->process($wLog)) {
                    $this->info("Withdrawal {$wLog['transactionHash']} processed");
                }
            }

            $state->update(['last_block' => $to]);
            $this->info("Synced blocks {$from} to {$to}");

            usleep(300000);   // RPC ne thodo shvas
        }

        return self::SUCCESS;
    }
}
