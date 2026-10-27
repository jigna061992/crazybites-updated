<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Create this default account for Admin login.
     
     * this not make duplicate if there is already admin account(firstOrCreate)
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@crazybites.com'],
            [
                'name'        => 'Admin',
                'username'    => 'admin',
                'sponsor_id'  => 'ADMIN0001',
                'mobile'      => '9999900000',
                'password'    => Hash::make('Admin@123'),   
                'referred_by' => null,
                'user_status' => 'Active',
                'is_admin'    => true,
            ]
        );

        $this->command->info('Admin user ready: admin@crazybites.com / Admin@123');
    }
}