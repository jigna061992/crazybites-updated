// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ICrazyBits.sol";

/**
 * MODULE 3 - RANK (Silver / Gold / Diamond)
 * Same logic as the Laravel RankService:
 *  - REWARD: given (one-time) if the conditions are met within months_limit. Royalty is received together with it.
 *  - ROYALTY: same conditions, no deadline (reward x royalty %). It can be received even after the deadline.
 *  - Direct/team counts are only counted after the last reward achievement (fresh window).
 *  - Direct = users the user referred personally. Team = directs + everyone below the directs (directs are also counted in the team).
 *    Team is counted up the sponsor chain up to MAX_TEAM_DEPTH levels (to stay within the gas limit).
 * The rank USDT comes from the "rank pool" (Main.fundRankPool). If the pool is low, the award is held back,
 * and it is received via checkRank(user) once the pool is funded.
 */
contract RankModule is IRankModule {
    struct RankCfg {
        string  name;
        uint16  directNeeded;
        uint32  teamNeeded;
        uint8   slotNeeded;
        uint16  monthsLimit;   // 1 month = 30 days
        uint256 reward;        // USDT (18 decimals)
        uint16  royaltyPct;    // % of the reward
    }

    uint256 public constant MAX_TEAM_DEPTH = 20;

    address public immutable main;
    IRegistry public immutable registry;
    RankCfg[] public ranks;

    mapping(address => uint256) public joinedAt;
    mapping(address => uint256) public directCount;
    mapping(address => uint256) public teamCount;
    mapping(address => uint256) public directAtSince;   // count at the time of the last reward
    mapping(address => uint256) public teamAtSince;
    mapping(address => uint8)   public currentRank;     // 0 = none, 1 = Silver ...
    mapping(address => mapping(uint256 => bool)) public rewardDone;
    mapping(address => mapping(uint256 => bool)) public royaltyDone;

    event RankRewardAwarded(address indexed user, uint256 indexed rankIndex, uint256 rewardAmount, uint256 royaltyAmount);
    event RankRoyaltyAwarded(address indexed user, uint256 indexed rankIndex, uint256 royaltyAmount);

    modifier onlyMain() {
        require(msg.sender == main, "Only main");
        _;
    }

    constructor(address main_) {
        main = main_;
        registry = IRegistry(main_);

        // as per config/commission.php
        ranks.push(RankCfg("Silver",   5,  25,  5, 1, 300 ether,  33));
        ranks.push(RankCfg("Gold",     10, 100, 10, 3, 1500 ether, 33));
        ranks.push(RankCfg("Diamond",  15, 300, 15, 6, 3000 ether, 33));
    }

    function rankCount() external view returns (uint256) {
        return ranks.length;
    }

    function onRegister(address user, address sponsor) external onlyMain {
        joinedAt[user] = block.timestamp;
        if (sponsor == address(0)) return;

        // Direct = users referred personally by this user
        directCount[sponsor] += 1;

        // Team = directs + everyone below the directs. So, starting from the sponsor, the team count
        // of all the uplines above (the sponsor's sponsor, and so on...) goes up by 1.
        address cur = sponsor;
        for (uint256 d = 0; d < MAX_TEAM_DEPTH && cur != address(0); d++) {
            teamCount[cur] += 1;
            cur = registry.sponsorOf(cur);
        }
    }

    function check(address user, uint8 highestSlot, uint256 pool)
        external
        onlyMain
        returns (uint256 rewardOut, uint256 royaltyOut)
    {
        for (uint256 i = 0; i < ranks.length; i++) {
            RankCfg storage c = ranks[i];
            if (rewardDone[user][i] && royaltyDone[user][i]) continue;

            uint256 royaltyAmt = (c.reward * c.royaltyPct) / 100;

            // Reward already received, royalty pending
            if (rewardDone[user][i]) {
                if (pool < royaltyAmt) break;
                pool -= royaltyAmt;
                royaltyDone[user][i] = true;
                royaltyOut += royaltyAmt;
                emit RankRoyaltyAwarded(user, i, royaltyAmt);
                continue;
            }

            // Fresh conditions (counts since the last reward)
            if (!_conditionsMet(user, c, highestSlot)) continue;

            if (block.timestamp <= joinedAt[user] + uint256(c.monthsLimit) * 30 days) {
                // Within the deadline: Reward + Royalty together
                if (pool < c.reward + royaltyAmt) break;
                rewardDone[user][i]  = true;
                royaltyDone[user][i] = true;
                directAtSince[user]  = directCount[user];
                teamAtSince[user]    = teamCount[user];
                currentRank[user]    = uint8(i + 1);
                emit RankRewardAwarded(user, i, c.reward, royaltyAmt);
                return (rewardOut + c.reward, royaltyOut + royaltyAmt);   // stop here; the next rank starts with a fresh window
            }

            // Deadline passed: royalty only
            if (pool < royaltyAmt) break;
            pool -= royaltyAmt;
            royaltyDone[user][i] = true;
            royaltyOut += royaltyAmt;
            emit RankRoyaltyAwarded(user, i, royaltyAmt);
        }
    }

    function _conditionsMet(address user, RankCfg storage c, uint8 highestSlot) private view returns (bool) {
        return directCount[user] - directAtSince[user] >= c.directNeeded
            && teamCount[user] - teamAtSince[user] >= c.teamNeeded
            && highestSlot >= c.slotNeeded;
    }

    /// Change the rank config (via Main.setRank, owner only). If index == ranks.length, a new rank is added.
    function setRank(
        uint256 index, string calldata name, uint16 directNeeded, uint32 teamNeeded,
        uint8 slotNeeded, uint16 monthsLimit, uint256 reward, uint16 royaltyPct
    ) external onlyMain {
        RankCfg memory c = RankCfg(name, directNeeded, teamNeeded, slotNeeded, monthsLimit, reward, royaltyPct);
        if (index == ranks.length) {
            ranks.push(c);
        } else {
            require(index < ranks.length, "Bad index");
            ranks[index] = c;
        }
    }
}
