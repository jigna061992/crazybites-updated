// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ICrazyBits.sol";

/**
 * MODULE 2 - REWARD + ROYALTY WALLET
 * A per-user ledger, and the USDT for it stays in this contract.
 * Main first sends the USDT to this contract, then calls credit().
 * The user withdraws through the Main contract (Main -> withdraw()), and the USDT goes directly to the user's MetaMask.
 * Both Matrix and Rank reward/royalty are added to the same wallet (reward balance / royalty balance).
 */
contract RewardRoyaltyModule is IRewardRoyaltyModule {
    using SafeERC20 for IERC20;

    address public immutable main;
    IERC20 public immutable usdt;

    mapping(address => uint256) public rewardBalance;
    mapping(address => uint256) public royaltyBalance;
    mapping(address => uint256) public totalRewardEarned;    // matrix + rank
    mapping(address => uint256) public totalRoyaltyEarned;   // matrix + rank
    mapping(address => uint256) public rankRewardEarned;     // rank only
    mapping(address => uint256) public rankRoyaltyEarned;    // rank only

    modifier onlyMain() {
        require(msg.sender == main, "Only main");
        _;
    }

    constructor(address main_, address usdt_) {
        main = main_;
        usdt = IERC20(usdt_);
    }

    function credit(address user, uint8 kind, uint256 amount) external onlyMain {
        if (kind == CBKinds.REWARD || kind == CBKinds.RANK_REWARD) {
            rewardBalance[user] += amount;
            totalRewardEarned[user] += amount;
            if (kind == CBKinds.RANK_REWARD) rankRewardEarned[user] += amount;
        } else if (kind == CBKinds.ROYALTY || kind == CBKinds.RANK_ROYALTY) {
            royaltyBalance[user] += amount;
            totalRoyaltyEarned[user] += amount;
            if (kind == CBKinds.RANK_ROYALTY) rankRoyaltyEarned[user] += amount;
        } else {
            revert("Invalid kind");
        }
    }

    function withdraw(address user, bool isReward, uint256 amount) external onlyMain {
        if (isReward) {
            require(amount > 0 && amount <= rewardBalance[user], "Insufficient reward balance");
            rewardBalance[user] -= amount;
        } else {
            require(amount > 0 && amount <= royaltyBalance[user], "Insufficient royalty balance");
            royaltyBalance[user] -= amount;
        }
        usdt.safeTransfer(user, amount);
    }

    function wallets(address user) external view returns (uint256 reward, uint256 royalty) {
        return (rewardBalance[user], royaltyBalance[user]);
    }
}
