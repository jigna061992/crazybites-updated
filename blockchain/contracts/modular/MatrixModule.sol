// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ICrazyBits.sol";

/**
 * MODULE 1 - 5x5 MATRIX
 * Only does the matrix calculation (position, hold, upgrade, recycle). It does not hold any USDT.
 * Only the Main contract can call it. The result is returned to Main, and Main makes the payments.
 *
 *   Position 1, 4 -> sponsor (CREDIT)
 *   Position 2    -> if the next slot is still open then HELD, otherwise REWARD wallet
 *   Position 3    -> if the next slot is still open then UPGRADE (pos2 + pos3), otherwise ROYALTY wallet
 *                    (if pos2 was held and the sponsor later bought the next slot on their own => the held amount also goes to REWARD)
 *   Position 5    -> upline (RECYCLE), COMPANY if the upline has not taken the slot
 */
contract MatrixModule is IMatrixModule {
    address public immutable main;
    IRegistry public immutable registry;

    mapping(address => mapping(uint8 => uint32)) public legCount;         // sponsor => slot => number of referrals
    mapping(address => mapping(uint8 => uint256)) public heldForUpgrade;  // sponsor => slot => pos2 amount

    modifier onlyMain() {
        require(msg.sender == main, "Only main");
        _;
    }

    constructor(address main_) {
        main = main_;
        registry = IRegistry(main_);
    }

    function process(address buyer, address sponsor, uint8 slot, uint256 amount)
        external
        onlyMain
        returns (MatrixResult memory r)
    {
        buyer; // Main emits the event

        uint32 n = ++legCount[sponsor][slot];
        uint8 pos = uint8((n - 1) % 5) + 1;
        bool nextOpen = slot < CBKinds.MAX_SLOTS && !registry.slotActive(sponsor, slot + 1);

        if (pos == 1 || pos == 4) {
            _add(r, CBKinds.CREDIT, sponsor, amount, pos);

        } else if (pos == 2) {
            if (nextOpen) {
                heldForUpgrade[sponsor][slot] = amount;
                _add(r, CBKinds.HELD, sponsor, amount, pos);
            } else {
                _add(r, CBKinds.REWARD, sponsor, amount, pos);
            }

        } else if (pos == 3) {
            uint256 held = heldForUpgrade[sponsor][slot];
            if (nextOpen) {
                heldForUpgrade[sponsor][slot] = 0;
                _add(r, CBKinds.UPGRADE, sponsor, amount, pos);
                r.upgrade = true;
                r.pool = held + amount;
            } else {
                if (held > 0) {
                    heldForUpgrade[sponsor][slot] = 0;
                    _add(r, CBKinds.REWARD, sponsor, held, 2);
                }
                _add(r, CBKinds.ROYALTY, sponsor, amount, pos);
            }

        } else {
            address upline = registry.sponsorOf(sponsor);
            if (upline != address(0) && registry.slotActive(upline, slot)) {
                _add(r, CBKinds.RECYCLE, upline, amount, pos);
            } else {
                _add(r, CBKinds.COMPANY, address(0), amount, pos);
            }
        }
    }

    function _add(MatrixResult memory r, uint8 kind, address to, uint256 amount, uint8 pos) private pure {
        r.steps[r.count] = Step(kind, to, amount, pos);
        r.count++;
    }
}
