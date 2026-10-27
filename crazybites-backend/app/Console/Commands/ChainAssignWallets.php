<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ChainAssignWallets extends Command
{
    protected $signature = 'chain:assign-wallets {file : path of wallets.json } {--skip=ROOTADMIN,HEENAPATEL456 : jene skip karva}';
    protected $description = 'Wallet vagar na test users ne wallet address apo (fakt testing)';

    public function handle(): int
    {
        $wallets = json_decode(file_get_contents($this->argument('file')), true);

        if (! is_array($wallets)) {
            $this->error('Invalid wallets file.');
            return self::FAILURE;
        }

        $skip  = array_filter(explode(',', $this->option('skip')));
        $users = User::whereNull('wallet_address')->whereNotIn('username', $skip)->orderBy('id')->get();

        if (count($wallets) < $users->count()) {
            $this->error('Only ' . count($wallets) . " wallets for {$users->count()} users.");
            return self::FAILURE;
        }

        foreach ($users as $i => $user) {
            User::whereKey($user->id)->update(['wallet_address' => strtolower($wallets[$i]['address'])]);
            $this->line("{$user->id} {$user->username} => {$wallets[$i]['address']}");
        }

        $this->info("Done: {$users->count()} users.");
        return self::SUCCESS;
    }
}