<?php
// app/Console/Commands/CheckAllRanks.php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\RankService;
use Illuminate\Console\Command;

class CheckAllRanks extends Command
{
    protected $signature = 'ranks:check';
    protected $description = 'Badha users na rank-eligibility check kari ne reward apo (jo eligible hoy).';

    public function handle(RankService $rankService)
    {
        $users = User::whereNotNull('referred_by')   // root sivay, kem ke root ne rank na male (koi upline nathi vat alag)
            ->orWhereNull('referred_by')              // jo root ne pan rank apvu hoy to aa rakho, nahi to kadhi nakho
            ->get();

        $checked = 0;
        $awarded = 0;

        foreach ($users as $user) {
            $beforeRank = $user->current_rank;

            $rankService->checkAndAward($user);

            $afterRank = $user->fresh()->current_rank;

            $checked++;
            if ($afterRank !== $beforeRank) {
                $awarded++;
                $this->info("✓ {$user->name} achieved rank: {$afterRank}");
            }
        }

        $this->info("Done. Checked: {$checked}, Newly awarded: {$awarded}");

        return self::SUCCESS;
    }
}