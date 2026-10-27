<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ChainController;
use App\Http\Middleware\BlockViewOnlyToken;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/sponsor/verify', [AuthController::class, 'verifySponsor']);
Route::post('/register', [AuthController::class, 'register']);

// BlockViewOnlyToken: admin "View as user" token (view-only) only GET request run 
Route::middleware(['auth:sanctum', BlockViewOnlyToken::class])->group(function () {
    Route::get('/user', [AuthController::class, 'getUser']);
    Route::post('/logout', [AuthController::class, 'logout']); // allowed in middleware

    Route::get('/investment/slots', [PurchaseController::class, 'slots']);
    Route::post('/purchase', [PurchaseController::class, 'purchase']);

    Route::get('/my-team', [TeamController::class, 'myTeam']);
    Route::get('/my-referrals', [TeamController::class, 'myReferrals']);
    Route::get('/team-tree', [TeamController::class, 'tree']);
    Route::get('/my-matrix', [TeamController::class, 'matrix']);
    Route::get('/my-earnings', [PurchaseController::class, 'earnings']);
    Route::get('/my-earnings/reward-royalty', [PurchaseController::class, 'myRewardRoyalty']);
    Route::get('/my-earnings/matrix', [PurchaseController::class, 'myMatrixEarnings']);
    Route::get('/my-earnings/referral',[PurchaseController::class, 'myReferralEarnings']);
    Route::get('/my-rank', [PurchaseController::class, 'myRank']);
    Route::post('/chain/wallet', [ChainController::class, 'saveWallet']);
    Route::post('/chain/orders', [ChainController::class, 'createOrder']);
    Route::get('/chain/orders/{order}', [ChainController::class, 'showOrder']);
    Route::post('/chain/orders/{order}/tx', [ChainController::class, 'submitTx']);
});

Route::middleware(['auth:sanctum', BlockViewOnlyToken::class])->group(function () {
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::post('/admin/users/{id}/impersonate', [AdminController::class, 'impersonate']); // NEW
    Route::get('/admin/earnings/reward-royalty', [AdminController::class, 'rewardRoyaltyEarnings']);
    Route::get('/admin/earnings/company', [AdminController::class, 'companyEarnings']);
    Route::get('/admin/earnings/matrix', [AdminController::class, 'matrixEarnings']);
    Route::get('/admin/earnings/referral', [AdminController::class, 'referralEarnings']);
    Route::get('/admin/dashboard-stats', [AdminController::class, 'dashboardStats']);
});