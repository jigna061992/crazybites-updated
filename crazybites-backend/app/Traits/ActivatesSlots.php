<?php

namespace App\Traits;

use App\Models\CompanyWallet;
use App\Models\CompanyWalletTransaction;
use App\Models\Earning;
use App\Models\Purchase;
use App\Models\User;
use App\Services\RankService;
use Illuminate\Support\Facades\DB;

trait ActivatesSlots
{
    private function slotAmounts(): array
    {
        return config('commission.investment_slots', [50, 100, 200, 400, 800, 1600, 3200, 6400]);
    }

    /**
     * Core logic for activating a slot (same for both manual /purchase and chain deposit).
     * Throws a DomainException if a rule is broken.
     */
    public function activateSlot(User $user, int $slotNumber, bool $processSponsorRewards = true): Purchase
    {
        $amounts = array_map('floatval', $this->slotAmounts());
        $amount  = $amounts[$slotNumber - 1] ?? null;

        if ($amount === null) {
            throw new \DomainException('Invalid slot.');
        }

        return DB::transaction(function () use ($user, $slotNumber, $amount, $processSponsorRewards) {
            $user = User::whereKey($user->id)->lockForUpdate()->first();

            if ($slotNumber !== 1 && ! Purchase::where('user_id', $user->id)->where('slot_number', 1)->exists()) {
                throw new \DomainException('First activate Slot 1 ($50), then all slots open.');
            }

            if (Purchase::where('user_id', $user->id)->where('slot_number', $slotNumber)->exists()) {
                throw new \DomainException('This slot is already activated.');
            }

            $user->user_status = 'Active';
            $user->save();

            $purchase = $this->createPurchase($user, $slotNumber, $amount);

            if ($processSponsorRewards) {
                $this->processSponsorUpgrade($user, $slotNumber);
            }

            if ($user->referred_by) {
                $sponsor = User::find($user->referred_by);
                if ($sponsor) {
                    app(RankService::class)->checkAndAward($sponsor);
                }
            }

            return $purchase;
        });
    }

    private function createPurchase(User $user, int $slotNumber, float $amount): Purchase
    {
        $purchase = Purchase::create([
            'user_id'      => $user->id,
            'slot_number'  => $slotNumber,
            'amount'       => $amount,
            'status'       => 'active',
            'purchased_at' => now(),
        ]);

        $user->total_debit    = (float) $user->total_debit + $amount;
        $user->wallet_balance = (float) $user->total_credit - (float) $user->total_debit;
        $user->save();

        return $purchase;
    }

    private function processSponsorUpgrade(User $user, int $slotNumber): void
    {
        // Root (user without a sponsor): the money for their own slot goes straight to the Company Wallet
        if (! $user->referred_by) {
            $rootAmounts = array_map('floatval', $this->slotAmounts());
            $this->sendToCompanyWallet(
                $user->id,
                $slotNumber,
                $rootAmounts[$slotNumber - 1],
                'root_activation'
            );
            return;
        }

        $sponsor = User::whereKey($user->referred_by)->lockForUpdate()->first();
        if (! $sponsor) {
            return;
        }

        $legPurchase = Purchase::where('user_id', $user->id)
            ->where('slot_number', $slotNumber)
            ->first();

        $amounts = array_map('floatval', $this->slotAmounts());
        $amount  = $amounts[$slotNumber - 1];

        // sponsor does not have this slot => money goes to the company wallet
        $sponsorHasSlot = Purchase::where('user_id', $sponsor->id)
            ->where('slot_number', $slotNumber)
            ->exists();

        if (! $sponsorHasSlot) {
            $this->sendToCompanyWallet($user->id, $slotNumber, $amount, 'sponsor_no_slot');
            return;
        }

        $legPurchases = Purchase::where('slot_number', $slotNumber)
            ->whereIn('user_id', User::where('referred_by', $sponsor->id)->select('id'))
            ->orderBy('id')
            ->get(['id', 'user_id']);

        $legCount = $legPurchases->count();
        $position = (($legCount - 1) % 5) + 1;   // 1,2,3,4,5,1,2,3,4,5...

        // POSITION 1 & 4: credited straight to the simple wallet
        if ($position === 1 || $position === 4) {
            $this->addCredit($sponsor, $amount, $position);

            Earning::create([
                'user_id'          => $sponsor->id,
                'from_user_id'     => $user->id,
                'from_purchase_id' => $legPurchase?->id,
                'slot_number'      => $slotNumber,
                'amount'           => $amount,
                'type'             => 'credit',
                'created_at'       => now(),
            ]);

            $this->recordGivenToSponsor($user, $amount);
            return;
        }

        // POSITION 5: recycle => goes to the sponsor's upline
        if ($position === 5) {
            $this->triggerRecycle($sponsor, $user, $slotNumber, $amount, $legPurchase);
            return;
        }

        // POSITION 2 (same as contract V2):
        //   - sponsor's next slot is still pending => hold, the upgrade happens at position 3
        //   - next slot already active (or slot 8) => credited straight to the REWARD wallet
        if ($position === 2) {
            [, , $canUpgradeNow] = $this->upgradeState($sponsor, $slotNumber, $amounts);
            if (! $canUpgradeNow) {
                $this->payRewardWallet($sponsor, $user, $legPurchase, $slotNumber, $amount);
            }
            return;
        }

        // POSITION 3: pair (position 2 + position 3)
        $position2Purchase = $legPurchases->get($legCount - 2);
        $position2User     = User::find($position2Purchase?->user_id);

        [$nextNumber, $nextAmount, $canUpgrade] = $this->upgradeState($sponsor, $slotNumber, $amounts);

        if ($canUpgrade) {
            $this->addCredit($sponsor, $amount, 2);
            $this->addCredit($sponsor, $amount, 3);

            Earning::create([
                'user_id'          => $sponsor->id,
                'from_user_id'     => $position2Purchase?->user_id,
                'from_purchase_id' => $position2Purchase?->id,
                'slot_number'      => $slotNumber,
                'amount'           => $amount,
                'type'             => 'upgrade_used',
                'upgraded_to_slot' => $nextNumber,
                'created_at'       => now(),
            ]);

            Earning::create([
                'user_id'          => $sponsor->id,
                'from_user_id'     => $user->id,
                'from_purchase_id' => $legPurchase?->id,
                'slot_number'      => $slotNumber,
                'amount'           => $amount,
                'type'             => 'upgrade_used',
                'upgraded_to_slot' => $nextNumber,
                'created_at'       => now(),
            ]);

            if ($position2User) {
                $this->recordGivenToSponsor($position2User, $amount);
            }
            $this->recordGivenToSponsor($user, $amount);

            $this->createPurchase($sponsor, $nextNumber, $nextAmount);
            $this->processSponsorUpgrade($sponsor, $nextNumber);
            return;
        }

        // Upgrade not needed: position 2 => reward wallet, position 3 => royalty wallet
        // If the position 2 reward was already paid immediately, do not pay it a second time.
        // (Position 2 was held back at that time and the sponsor later took the next slot themselves => now give the reward.)
        $pos2AlreadyPaid = $position2Purchase && Earning::where('user_id', $sponsor->id)
            ->where('from_purchase_id', $position2Purchase->id)
            ->where('slot_number', $slotNumber)
            ->where('type', 'reward')
            ->exists();

        if (! $pos2AlreadyPaid) {
            $this->payRewardWallet($sponsor, $position2User, $position2Purchase, $slotNumber, $amount);
        }

        $this->payRoyaltyWallet($sponsor, $user, $legPurchase, $slotNumber, $amount);
    }

    /**
     * Whether the sponsor should upgrade to the next slot or not.
     * Return: [nextNumber, nextAmount, canUpgrade]
     * canUpgrade = the next slot exists and the sponsor has not taken it yet.
     */
    private function upgradeState(User $sponsor, int $slotNumber, array $amounts): array
    {
        $nextNumber = $slotNumber + 1;
        $nextAmount = $amounts[$nextNumber - 1] ?? null;

        $alreadyUpgraded = $nextAmount !== null
            && Purchase::where('user_id', $sponsor->id)
                ->where('slot_number', $nextNumber)
                ->exists();

        return [$nextNumber, $nextAmount, $nextAmount !== null && ! $alreadyUpgraded];
    }

    private function payRewardWallet(User $sponsor, ?User $fromUser, ?Purchase $fromPurchase, int $slotNumber, float $amount): void
    {
        $this->addToRewardWallet($sponsor, $amount);

        Earning::create([
            'user_id'          => $sponsor->id,
            'from_user_id'     => $fromUser?->id,
            'from_purchase_id' => $fromPurchase?->id,
            'slot_number'      => $slotNumber,
            'amount'           => $amount,
            'type'             => 'reward',
            'created_at'       => now(),
        ]);

        if ($fromUser) {
            $this->recordGivenToSponsor($fromUser, $amount);
        }
    }

    private function payRoyaltyWallet(User $sponsor, User $fromUser, ?Purchase $fromPurchase, int $slotNumber, float $amount): void
    {
        $this->addToRoyaltyWallet($sponsor, $amount);

        Earning::create([
            'user_id'          => $sponsor->id,
            'from_user_id'     => $fromUser->id,
            'from_purchase_id' => $fromPurchase?->id,
            'slot_number'      => $slotNumber,
            'amount'           => $amount,
            'type'             => 'royalty',
            'created_at'       => now(),
        ]);

        $this->recordGivenToSponsor($fromUser, $amount);
    }

    private function triggerRecycle(User $sponsor, User $legUser, int $slotNumber, float $amount, ?Purchase $legPurchase): void
    {
        if (! $sponsor->referred_by) {
            $this->sendToCompanyWallet($legUser->id, $slotNumber, $amount, 'root_recycle');
            $this->recordGivenToSponsor($legUser, $amount);
            return;
        }

       $upline = User::whereKey($sponsor->referred_by)->lockForUpdate()->first();
        $uplineHasSlot = $upline && Purchase::where('user_id', $upline->id)
            ->where('slot_number', $slotNumber)->exists();

        if (! $upline || ! $uplineHasSlot) {
            $this->sendToCompanyWallet($legUser->id, $slotNumber, $amount, 'upline_no_slot');
            $this->recordGivenToSponsor($legUser, $amount);
            return;
        }
        $this->addCredit($upline, $amount, 5);

        Earning::create([
            'user_id'          => $upline->id,
            'from_user_id'     => $legUser->id,
            'from_purchase_id' => $legPurchase?->id,
            'slot_number'      => $slotNumber,
            'amount'           => $amount,
            'type'             => 'recycle',
            'created_at'       => now(),
        ]);

        $this->recordGivenToSponsor($legUser, $amount);
    }

    private function addCredit(User $user, float $amount, ?int $position = null): void
    {
        $user->total_credit   = (float) $user->total_credit + $amount;
        $user->wallet_balance = (float) $user->total_credit - (float) $user->total_debit;

        if ($position !== null && $position >= 1 && $position <= 5) {
            $column = "leg{$position}_earning";
            $user->{$column} = (float) $user->{$column} + $amount;
        }

        $user->save();
    }

    private function addToRewardWallet(User $user, float $amount): void
    {
        $user->reward_wallet = (float) $user->reward_wallet + $amount;
        $user->leg2_earning  = (float) $user->leg2_earning + $amount;
        $user->save();
    }

    private function addToRoyaltyWallet(User $user, float $amount): void
    {
        $user->royalty_wallet = (float) $user->royalty_wallet + $amount;
        $user->leg3_earning   = (float) $user->leg3_earning + $amount;
        $user->save();
    }

    private function recordGivenToSponsor(User $fromUser, float $amount): void
    {
        $fromUser->given_to_sponsor = (float) $fromUser->given_to_sponsor + $amount;
        $fromUser->save();
    }

    private function sendToCompanyWallet(?int $fromUserId, int $slotNumber, float $amount, string $reason): void
    {
        $wallet = CompanyWallet::first();
        if (! $wallet) {
            $wallet = CompanyWallet::create(['balance' => 0]);
        }
        $wallet->balance += $amount;
        $wallet->save();

        CompanyWalletTransaction::create([
            'from_user_id' => $fromUserId,
            'slot_number'  => $slotNumber,
            'amount'       => $amount,
            'reason'       => $reason,
            'created_at'   => now(),
        ]);
    }
}