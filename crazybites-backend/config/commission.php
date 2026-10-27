<?php

return [

    'activation_amount' => 50,
    'investment_slots'  => [
        50, 100, 200, 400, 800, 1600, 3200, 6400,
        12800, 25600, 51200, 102400, 204800, 409600, 819200,
    ],

    'ranks' => [
        [
            'name'          => 'Silver',
            'direct_needed' => 5,
            'team_needed'   => 25,
             'slot_needed'   => 5,      // 👈 NEW — sponsor achieved 5 slot first
            // 'days_limit'    => 30,    // 1 month
            'months_limit'   => 1,    
            'reward'        => 300,
            'royalty'       => 33,
        ],
        [
            'name'          => 'Gold',
            'direct_needed' => 10,
            'team_needed'   => 100,
            'slot_needed'   => 10,     // 👈 for Gold 10th slot achieved
            // 'days_limit'    => 90,    // 3 months
            'months_limit'   => 3,   
            'reward'        => 1500,
            'royalty'       => 33,
        ],
        [
            'name'          => 'Diamond',
            'direct_needed' => 15,
            'team_needed'   => 300,
             'slot_needed'   => 15,     // 👈 For Diamond 15th slot
            // 'days_limit'    => 180,   // 6 months
            'months_limit'   => 6,   
            'reward'        => 3000,
            'royalty'       => 33,
        ],
    ],

];