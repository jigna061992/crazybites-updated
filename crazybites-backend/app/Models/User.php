<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Earning;


class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
     protected $fillable = [
    'user_id',
    'name',
    'username',
    'email',
    'password',
    'sponsor_id',
    'referred_by',
    'dob',
    'gender',
    'mobile',
    'address',
    'pincode',
    'state',
    'city',
    'district',
    'user_status',
     'leg1_earning', 'leg2_earning', 'leg3_earning', 'leg4_earning','leg5_earning',
      'reward_wallet',
    'royalty_wallet',
     'given_to_sponsor',
     'current_rank',
      'wallet_address',
    
];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

       protected static function boot()
        {
            parent::boot();

            static::creating(function ($user) {
                $user->sponsor_id = self::generateUniqueSponsorId($user->name);   // 👈 fix: pass $user->name
            });
        }


    public static function generateUniqueSponsorId(string $name): string
    {
        // Take the first word (first name) from the full name
        $firstName = trim(explode(' ', trim($name))[0]);

        // Keep letters only, make uppercase, limit to 5 characters
        $namePart = strtoupper(preg_replace('/[^A-Za-z]/', '', $firstName));
        $namePart = substr($namePart, 0, 5);

        do {
            $randomPart = rand(100, 999); // 3-digit random number
            $sponsorId = 'CB' . $namePart . $randomPart;
        } while (self::where('sponsor_id', $sponsorId)->exists());

        return $sponsorId;
    }
    public function referredBy()
    {
        return $this->belongsTo(User::class, 'referred_by');
    }

    public function referrals()
    {
        return $this->hasMany(User::class, 'referred_by');
    }
    public function purchases()
{
    return $this->hasMany(Purchase::class);
}

public function earnings()
{
    return $this->hasMany(Earning::class);
}

public function sponsor()
{
    return $this->belongsTo(User::class, 'referred_by');
}


// users that this user has sponsored (referred_by = this user's id)
public function directReferrals(): HasMany
{
    return $this->hasMany(User::class, 'referred_by');
}


    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}