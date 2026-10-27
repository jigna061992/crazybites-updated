<?php

namespace App\Services;

use App\Models\ChainWalletWithdrawal;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use kornrunner\Keccak;

/**
 * Reads the contract's RewardWithdrawn / RoyaltyWithdrawn events and
 * deducts that amount from the user's reward_wallet / royalty_wallet in the DB.
 * (One single MetaMask address; the contract holds a ledger balance, and on withdrawal the USDT goes to the user's own wallet.)
 */
class ChainWithdrawalProcessor
{
    public static function topics(): array
    {
        return [
            'reward'  => '0x' . Keccak::hash('RewardWithdrawn(address,uint256)', 256),
            'royalty' => '0x' . Keccak::hash('RoyaltyWithdrawn(address,uint256)', 256),
        ];
    }

    /** Return: true = new withdrawal processed, false = skipped (duplicate / unknown user) */
    public function process(array $log): bool
    {
        $topics = $log['topics'] ?? [];
        $data   = substr($log['data'] ?? '', 2);

        if (count($topics) < 2 || strlen($data) < 64) {
            return false;
        }

        $kind = array_search(strtolower($topics[0]), array_map('strtolower', self::topics()), true);
        if ($kind === false) {
            return false;
        }

        $wallet    = '0x' . strtolower(substr($topics[1], -40));
        $amountWei = gmp_strval(gmp_init(substr($data, 0, 64), 16));
        $amount    = (float) bcdiv($amountWei, bcpow('10', (string) config('chain.decimals')), 2);

        return DB::transaction(function () use ($log, $kind, $wallet, $amountWei, $amount) {
            $user = User::where('wallet_address', $wallet)->lockForUpdate()->first();
            if (! $user) {
                return false;
            }

            try {
                ChainWalletWithdrawal::create([
                    'user_id'      => $user->id,
                    'kind'         => $kind,
                    'amount'       => $amount,
                    'amount_wei'   => $amountWei,
                    'tx_hash'      => strtolower($log['transactionHash']),
                    'log_index'    => (int) hexdec($log['logIndex']),
                    'block_number' => (int) hexdec($log['blockNumber']),
                    'created_at'   => now(),
                ]);
            } catch (UniqueConstraintViolationException $e) {
                return false;   // already processed earlier
            }

            $column = $kind === 'reward' ? 'reward_wallet' : 'royalty_wallet';
            $user->{$column} = max(0, (float) $user->{$column} - $amount);
            $user->save();

            return true;
        });
    }
}