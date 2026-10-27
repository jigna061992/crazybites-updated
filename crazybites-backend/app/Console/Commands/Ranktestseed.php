<?php

namespace App\Console\Commands;

use App\Models\ChainOrder;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * TEST ONLY: Heena ni niche DB ma nakli users + darek mate DB (chain) order banave.
 * Pachi hardhat script (rank-test-activate.js) te order id sathe chain par activate kare,
 * ane chain:sync DB ma slot activate kare. Eni mate Gold rank test sahelo bane.
 *
 * Step 1 (hardhat):  npx hardhat run scripts/rank-test-wallets.js     => rank-test-wallets.json
 * Step 2 (aa):       php artisan ranktest:seed --heena=HEENAPATEL305
 */
class RankTestSeed extends Command
{
    protected $signature = 'ranktest:seed
        {--heena=HEENAPATEL305 : Heena username}
        {--slots=10 : create db order for heena 10 slot }
        {--wallets= : wallets json (default ../blockchain/rank-test-wallets.json)}
        {--out= : orders json (default ../blockchain/rank-test-orders.json)}';

    protected $description = 'TEST: Heena referal users + create DB orders  (For Gold rank test )';

    public function handle(): int
    {
        $walletsFile = $this->option('wallets') ?: base_path('../blockchain/rank-test-wallets.json');
        $outFile     = $this->option('out') ?: base_path('../blockchain/rank-test-orders.json');

        if (! is_file($walletsFile)) {
            $this->error("No Wallets file : {$walletsFile}. First run in hardhat rank-test-wallets.js.");
            return self::FAILURE;
        }

        $wallets = json_decode(file_get_contents($walletsFile), true);
        if (! is_array($wallets) || empty($wallets)) {
            $this->error('Wallets file is invalid or empty.');
            return self::FAILURE;
        }

        $heena = User::where('username', $this->option('heena'))->first();
        if (! $heena) {
            $this->error('dont get user as Heena: ' . $this->option('heena'));
            return self::FAILURE;
        }
        if (! $heena->wallet_address) {
            $this->error('Heena dont connect wallet yet. First coonect wallet.');
            return self::FAILURE;
        }
        if (! Purchase::where('user_id', $heena->id)->where('slot_number', 1)->exists()) {
            $this->error('Heena no slot 1 active nathi.');
            return self::FAILURE;
        }

        $prices = config('commission.investment_slots');
        $slots  = max(1, min(15, (int) $this->option('slots')));

        $amountWei = function (int $slot) use ($prices): string {
            return gmp_strval(gmp_mul(
                gmp_init((string) (int) $prices[$slot - 1]),
                gmp_pow(10, config('chain.decimals'))
            ));
        };

        // Je slot DB ma pehla thi active hoy tena order nathi joita (null). Nahitar pending order vapro / banavo.
        $orderFor = function (User $user, int $slot) use ($amountWei): ?int {
            if (Purchase::where('user_id', $user->id)->where('slot_number', $slot)->exists()) {
                return null;
            }

            $existing = ChainOrder::where('user_id', $user->id)
                ->where('slot_number', $slot)
                ->where('status', 'pending')
                ->first();

            if ($existing) {
                $existing->update(['expires_at' => now()->addDays(30)]);
                return $existing->id;
            }

            return ChainOrder::create([
                'user_id'     => $user->id,
                'slot_number' => $slot,
                'amount_wei'  => $amountWei($slot),
                'expires_at'  => now()->addDays(30),
            ])->id;
        };

        $idMap   = [];
        $created = 0;
        $orders  = [
            'heena' => [
                'username'   => $heena->username,
                'sponsor_id' => $heena->sponsor_id,
                'address'    => strtolower($heena->wallet_address),
                'slots'      => [],
            ],
            'users' => [],
        ];

        try {
            DB::transaction(function () use ($wallets, $heena, $slots, $orderFor, &$idMap, &$created, &$orders) {
                foreach ($wallets as $i => $w) {
                    $n       = $i + 1;
                    $address = strtolower($w['address']);
                    $email   = "ranktest{$n}@example.com";

                    $user = User::where('email', $email)->first();

                    if (! $user) {
                        $parentId = $w['parent'] === 'heena' ? $heena->id : ($idMap[$w['parent']] ?? null);
                        if (! $parentId) {
                            throw new \RuntimeException("Parent {$w['parent']} nathi malyo ({$w['id']}).");
                        }

                        $user = User::create([
                            'name'           => "Rank Test {$n}",
                            'username'       => 'RANKTEST' . $n,
                            'email'          => $email,
                            'mobile'         => '91' . str_pad((string) $n, 8, '0', STR_PAD_LEFT),
                            'password'       => Hash::make('test@123'),
                            'dob'            => '1995-01-01',
                            'gender'         => 'Male',
                            'address'        => 'Test address',
                            'pincode'        => '380001',
                            'state'          => 'Gujarat',
                            'city'           => 'Ahmedabad',
                            'district'       => 'Ahmedabad',
                            'referred_by'    => $parentId,
                            'wallet_address' => $address,
                        ]);
                        $created++;
                    } elseif (strtolower((string) $user->wallet_address) !== $address) {
                        throw new \RuntimeException("{$email}'s wallet  is different. Delete old ranktest users then run again.");
                    }

                    $idMap[$w['id']]          = $user->id;
                    $orders['users'][$w['id']] = $orderFor($user, 1);
                }

                for ($s = 2; $s <= $slots; $s++) {
                    $id = $orderFor($heena, $s);
                    if ($id) {
                        $orders['heena']['slots'][(string) $s] = $id;
                    }
                }
            });
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        file_put_contents($outFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $this->info("Heena: {$heena->username} ({$heena->sponsor_id})");
        $this->info("New users: {$created} (kul " . count($wallets) . " wallets)");
        $this->info('Heena"s slot orders: ' . count($orders['heena']['slots']));
        $this->info("Orders file: {$outFile}");
        $this->line('Now in hardhat : npx hardhat run scripts/rank-test-activate.js --network bscTestnet');

        return self::SUCCESS;
    }
}