<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;


Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');


// 👇 NEW — Rank check daily run 
// Schedule::command('ranks:check')->everyMinute(); 
Schedule::command('chain:sync')->everyFiveMinutes()->withoutOverlapping();