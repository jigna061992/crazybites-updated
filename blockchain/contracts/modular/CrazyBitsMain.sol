// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ICrazyBits.sol";
import "./MatrixModule.sol";
import "./RewardRoyaltyModule.sol";
import "./RankModule.sol";

/**
 * CrazyBits MAIN contract
 *
 * User / frontend / Laravel only use this single address. Inside, there are 3 separate module contracts:
 *   1) MatrixModule        - 5x5 matrix calculation
 *   2) RewardRoyaltyModule - reward + royalty wallet (USDT stays here)
 *   3) RankModule          - Silver / Gold / Diamond
 *
 * Main: registry (user, sponsor, slot), receiving/sending USDT, events, and calling the modules.
 * Events and function names are the same as V2 => nothing changes in Laravel (ChainSync) and React except the address.
 */
contract CrazyBitsMain is Ownable, ReentrancyGuard, IRegistry {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    address public immutable rootUser;      // Jigna
    address public treasury;                // company wallet

    MatrixModule        public immutable matrix;
    RewardRoyaltyModule public immutable rewards;
    RankModule          public immutable rank;

    uint256[15] public slotPrice;           // 50, 100, ... 819200 USDT
    uint256 public rankPool;                // USDT pool for rank reward/royalty

    // ---- Registry (modules read this) ----
    mapping(address => bool) public registered;
    mapping(address => address) public override sponsorOf;
    mapping(address => mapping(uint8 => bool)) public override slotActive;
    mapping(address => uint8) public highestSlot;

    // ---- Events (same as V2; Laravel reads these) ----
    event Deposited(address indexed user, address indexed recipient, uint256 amount, uint256 orderId, uint256 slotNumber);
    event SlotActivated(address indexed user, address indexed sponsor, uint8 indexed slot, uint256 amount, bool isAuto);
    event Payment(address indexed payer, address indexed to, uint8 indexed slot, uint8 position, uint256 amount, uint8 kind);
    event RewardWithdrawn(address indexed user, uint256 amount);
    event RoyaltyWithdrawn(address indexed user, uint256 amount);
    event TreasuryChanged(address indexed newTreasury);
    event RankPoolFunded(address indexed from, uint256 amount);
    event RankPoolWithdrawn(address indexed to, uint256 amount);

    constructor(address usdt_, address treasury_, address root_) Ownable(msg.sender) {
        require(usdt_ != address(0) && treasury_ != address(0) && root_ != address(0), "Zero address");
        usdt = IERC20(usdt_);
        treasury = treasury_;
        rootUser = root_;

        for (uint8 i = 0; i < CBKinds.MAX_SLOTS; i++) {
            slotPrice[i] = 50 ether * (uint256(1) << i);
        }

        matrix  = new MatrixModule(address(this));
        rewards = new RewardRoyaltyModule(address(this), usdt_);
        rank    = new RankModule(address(this));

        registered[root_] = true;
        rank.onRegister(root_, address(0));
    }

    // =====================================================================
    //  USER FUNCTIONS
    // =====================================================================

    /// Slot 1: a sponsor is required. After that, the user can activate slots 2..15 on their own (slot 1 must be active first).
    function activateSlot(uint8 slot, address sponsor, uint256 orderId) external nonReentrant {
        require(slot >= 1 && slot <= CBKinds.MAX_SLOTS, "Invalid slot");
        require(!slotActive[msg.sender][slot], "Slot already active");
        require(slot == 1 || slotActive[msg.sender][1], "Activate slot 1 first");

        if (!registered[msg.sender]) {
            require(slot == 1, "Activate slot 1 first");
            require(
                sponsor != address(0) && sponsor != msg.sender && registered[sponsor],
                "Invalid sponsor"
            );
            registered[msg.sender] = true;
            sponsorOf[msg.sender] = sponsor;
            rank.onRegister(msg.sender, sponsor);
        }

        uint256 price = slotPrice[slot - 1];
        usdt.safeTransferFrom(msg.sender, address(this), price);
        emit Deposited(msg.sender, address(this), price, orderId, slot);

        _activate(msg.sender, slot, price, false);

        // Rank check for the sponsor (same as Laravel)
        address sp = sponsorOf[msg.sender];
        if (sp != address(0)) _checkRank(sp);
    }

    function withdrawReward(uint256 amount) external nonReentrant {
        rewards.withdraw(msg.sender, true, amount);
        emit RewardWithdrawn(msg.sender, amount);
    }

    function withdrawRoyalty(uint256 amount) external nonReentrant {
        rewards.withdraw(msg.sender, false, amount);
        emit RoyaltyWithdrawn(msg.sender, amount);
    }

    /// Once the rank pool is funded, or once the conditions are met, anyone can trigger a rank check for any user
    function checkRank(address user) external nonReentrant {
        _checkRank(user);
    }

    /// Fund the USDT pool for rank reward/royalty (company / anyone)
    function fundRankPool(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        rankPool += amount;
        emit RankPoolFunded(msg.sender, amount);
    }

    // =====================================================================
    //  VIEWS (frontend / Laravel)
    // =====================================================================

    function status(address user)
        external
        view
        returns (bool[15] memory active, uint32[15] memory legs, uint256[15] memory held)
    {
        for (uint8 i = 0; i < CBKinds.MAX_SLOTS; i++) {
            active[i] = slotActive[user][i + 1];
            legs[i]   = matrix.legCount(user, i + 1);
            held[i]   = matrix.heldForUpgrade(user, i + 1);
        }
    }

    function wallets(address user) external view returns (uint256 reward, uint256 royalty) {
        return rewards.wallets(user);
    }

    function totalRewardEarned(address user) external view returns (uint256) {
        return rewards.totalRewardEarned(user);
    }

    function totalRoyaltyEarned(address user) external view returns (uint256) {
        return rewards.totalRoyaltyEarned(user);
    }

    // =====================================================================
    //  OWNER
    // =====================================================================

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Zero address");
        treasury = newTreasury;
        emit TreasuryChanged(newTreasury);
    }

    function setRank(
        uint256 index, string calldata name, uint16 directNeeded, uint32 teamNeeded,
        uint8 slotNeeded, uint16 monthsLimit, uint256 reward, uint16 royaltyPct
    ) external onlyOwner {
        rank.setRank(index, name, directNeeded, teamNeeded, slotNeeded, monthsLimit, reward, royaltyPct);
    }

    /// Take back the leftover USDT from the rank pool (pool only, not the users' reward/royalty)
    function withdrawRankPool(uint256 amount, address to) external onlyOwner nonReentrant {
        require(to != address(0) && amount > 0 && amount <= rankPool, "Bad amount");
        rankPool -= amount;
        usdt.safeTransfer(to, amount);
        emit RankPoolWithdrawn(to, amount);
    }

    // =====================================================================
    //  INTERNAL
    // =====================================================================

    function _activate(address buyer, uint8 slot, uint256 amount, bool isAuto) internal {
        while (true) {
            slotActive[buyer][slot] = true;
            if (slot > highestSlot[buyer]) highestSlot[buyer] = slot;

            address sponsor = sponsorOf[buyer];
            emit SlotActivated(buyer, sponsor, slot, amount, isAuto);

            // No sponsor (root) or the sponsor has not taken this slot => goes to company
            if (sponsor == address(0) || !slotActive[sponsor][slot]) {
                usdt.safeTransfer(treasury, amount);
                emit Payment(buyer, treasury, slot, 0, amount, CBKinds.COMPANY);
                return;
            }

            MatrixResult memory r = matrix.process(buyer, sponsor, slot, amount);
            for (uint8 i = 0; i < r.count; i++) {
                _execute(buyer, slot, r.steps[i]);
            }

            if (!r.upgrade) return;

            // Auto-activate the sponsor's next slot (pool = pos2 + pos3)
            buyer = sponsor;
            slot = slot + 1;
            amount = r.pool;
            isAuto = true;
        }
    }

    function _execute(address payer, uint8 slot, Step memory s) internal {
        uint8 k = s.kind;

        if (k == CBKinds.HELD || k == CBKinds.UPGRADE) {
            // USDT stays in this contract (for upgrade)
            emit Payment(payer, s.to, slot, s.position, s.amount, k);
            return;
        }

        if (k == CBKinds.REWARD || k == CBKinds.ROYALTY) {
            usdt.safeTransfer(address(rewards), s.amount);
            rewards.credit(s.to, k, s.amount);
            emit Payment(payer, s.to, slot, s.position, s.amount, k);
            return;
        }

        address to = (k == CBKinds.COMPANY) ? treasury : s.to;   // CREDIT / RECYCLE / COMPANY
        usdt.safeTransfer(to, s.amount);
        emit Payment(payer, to, slot, s.position, s.amount, k);
    }

    function _checkRank(address user) internal {
        if (rankPool == 0) return;

        (uint256 r, uint256 y) = rank.check(user, highestSlot[user], rankPool);
        uint256 total = r + y;
        if (total == 0) return;

        rankPool -= total;
        usdt.safeTransfer(address(rewards), total);

        if (r > 0) {
            rewards.credit(user, CBKinds.RANK_REWARD, r);
            emit Payment(address(this), user, 0, 0, r, CBKinds.RANK_REWARD);
        }
        if (y > 0) {
            rewards.credit(user, CBKinds.RANK_ROYALTY, y);
            emit Payment(address(this), user, 0, 0, y, CBKinds.RANK_ROYALTY);
        }
    }
}
