<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class RootUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // if Alrady root -safety check
       
          User::create([
            'sponsor_id'   => 'CBJIGNA770',
            'username'     => 'ROOTADMIN',
            'name'         => 'Jigna Pankhniya',
            'email'        => 'root@example.com',
            'mobile'       => '9999999999',
            'dob'          => '1990-01-01',
            'gender'       => 'Female',
            'address'      => 'Head Office',
            'pincode'      => '392001',
            'state'        => 'Gujarat',
            'city'         => 'Bharuch',
            'district'     => 'Bharuch',
            'password'     => Hash::make('root@123'),
            'referred_by'  => null,   // no refere 
            'user_status'    => 'Inactive',
            
            // sponsor_id and user_id generate automatically with boot() method
        ]);

        $this->command->info('Root user created successfully.');
    }
}