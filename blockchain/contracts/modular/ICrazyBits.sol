// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Payment "kinds" and limits used across all modules
library CBKinds {
    uint8 internal constant CREDIT       = 0;  // paid directly to the sponsor
    uint8 internal constant HELD         = 1;  // pos 2: held back for the upgrade
    uint8 internal constant UPGRADE      = 2;  // pos 3: used to buy the sponsor's next slot
    uint8 internal constant RECYCLE      = 3;  // pos 5: goes to the upline
    uint8 internal constant COMPANY      = 4;  // goes to the treasury
    uint8 internal constant REWARD       = 5;  // matrix reward wallet
    uint8 internal constant ROYALTY      = 6;  // matrix royalty wallet
    uint8 internal constant RANK_REWARD  = 7;  // rank reward (into the reward wallet)
    uint8 internal constant RANK_ROYALTY = 8;  // rank royalty (into the royalty wallet)

    uint8 internal constant MAX_SLOTS = 15;    // 15 slots in config/commission.php
}

/// User registry of the Main contract (modules read from here)
interface IRegistry {
    function sponsorOf(address user) external view returns (address);
    function slotActive(address user, uint8 slot) external view returns (bool);
}

/// The Matrix module returns payment steps, and Main executes them
struct Step {
    uint8 kind;       // CBKinds.*
    address to;       // address(0) for COMPANY (Main uses the treasury)
    uint256 amount;
    uint8 position;   // 1..5
}

struct MatrixResult {
    Step[2] steps;
    uint8 count;      // how many steps are valid
    bool upgrade;     // true => auto-activate the sponsor's next slot
    uint256 pool;     // upgrade amount (pos2 + pos3)
}

interface IMatrixModule {
    function process(address buyer, address sponsor, uint8 slot, uint256 amount) external returns (MatrixResult memory);
    function legCount(address user, uint8 slot) external view returns (uint32);
    function heldForUpgrade(address user, uint8 slot) external view returns (uint256);
}

interface IRewardRoyaltyModule {
    function credit(address user, uint8 kind, uint256 amount) external;
    function withdraw(address user, bool isReward, uint256 amount) external;
    function wallets(address user) external view returns (uint256 reward, uint256 royalty);
    function totalRewardEarned(address user) external view returns (uint256);
    function totalRoyaltyEarned(address user) external view returns (uint256);
}

interface IRankModule {
    function onRegister(address user, address sponsor) external;
    function check(address user, uint8 highestSlot, uint256 pool) external returns (uint256 rewardOut, uint256 royaltyOut);
    function setRank(uint256 index, string calldata name, uint16 directNeeded, uint32 teamNeeded,
        uint8 slotNeeded, uint16 monthsLimit, uint256 reward, uint16 royaltyPct) external;
}
