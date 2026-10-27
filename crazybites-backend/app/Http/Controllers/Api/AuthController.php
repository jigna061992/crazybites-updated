<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function verifySponsor(Request $request)
{
    $validator = Validator::make($request->all(), [
        'sponsor_id' => 'required|string',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'valid' => false,
            'message' => 'Sponsor ID is required',
        ], 422);
    }

    $sponsor = User::where('sponsor_id', $request->sponsor_id)
        ->where('user_status', 'Active')   // correct column name
        ->first();

    return response()->json([
        'valid' => (bool) $sponsor,
        'sponsor_name' => $sponsor?->name,
    ]);
}

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'sponsor_id'   => 'nullable|string|exists:users,sponsor_id',
            'name'         => 'required|string|max:255',
            'dob'          => 'required|date',
            'gender'       => 'required|in:Male,Female,Other',
            'email'        => 'required|email|unique:users,email',
            'mobile'       => 'required|digits:10|unique:users,mobile',
            'password'     => 'required|string|min:6',
            'address'      => 'required|string',
            'pincode'      => 'required|digits:6',
            'state'        => 'required|string',
            'city'         => 'required|string',
            'district'     => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation Error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $referredBy = null;
        if (!empty($validated['sponsor_id'])) {
            $sponsor = User::where('sponsor_id', $validated['sponsor_id'])->first();
            $referredBy = $sponsor?->id;
        }

        // Generated inline, without the generateUniqueUsername trait
        $username = strtoupper(Str::slug($validated['name'], '')) . rand(100, 999);
        while (User::where('username', $username)->exists()) {
            $username = strtoupper(Str::slug($validated['name'], '')) . rand(100, 999);
        }

        $user = User::create([
            'username'    => $username,
            'name'        => $validated['name'],
            'email'       => $validated['email'],
            'mobile'      => $validated['mobile'],
            'dob'         => $validated['dob'],
            'gender'      => $validated['gender'],
            'address'     => $validated['address'],
            'pincode'     => $validated['pincode'],
            'state'       => $validated['state'],
            'city'        => $validated['city'],
            'district'    => $validated['district'],
            'password'    => bcrypt($validated['password']),
            'referred_by' => $referredBy,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

          return response()->json([
        'success' => true,
        'message' => 'Registration successful',
        'data' => [
            'user'  => $this->userPayload($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ],
    ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation Error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('username', $request->username)->first();

        if (! $user || ! Auth::attempt([
            'username' => $request->username,
            'password' => $request->password,
        ])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid username or password',
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user'  => $this->userPayload($user),   // includes referral_link (so the link shows without a refresh)
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function getUser(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    /**
     * Login / Register / getUser: one common response shape (with referral_link + sponsor_name).
     */
    private function userPayload(User $user): array
    {
        return [
            ...$user->toArray(),
            'referral_link' => config('app.frontend_url') . '/signup?ref=' . $user->sponsor_id,
            'sponsor_name'  => $user->referredBy?->name,   // used for "Invited By" on the dashboard
        ];
    }
}