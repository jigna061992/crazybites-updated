// Finds how far chain_state.last_block can SAFELY be skipped ahead.
//   $env:FROM_BLOCK="137331785"        (your chain_state.last_block + 1)
//   npx hardhat run scripts/find-safe-block.js --network bscTestnet
// It searches for Main's Deposited + RewardWithdrawn + RoyaltyWithdrawn events from FROM_BLOCK to the latest block.
// 1 block before the block of the first event found = the safe last_block (nothing is missed before it).
// If there are deposits of old DB orders (id < 50), it reports them separately.
const hre = require("hardhat");
require("dotenv").config();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, tries = 5) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) { if (i >= tries) throw e; await sleep(2000 * i); }
  }
}

async function findSafeBlock({ ethers, main, from, to, chunk = 5000, legacyMaxOrderId = 50, log = console.log }) {
  const events = [];
  for (let start = from; start <= to; start += chunk) {
    const end = Math.min(start + chunk - 1, to);
    const [dep, rw, ry] = await retry(() => Promise.all([
      main.queryFilter(main.filters.Deposited(), start, end),
      main.queryFilter(main.filters.RewardWithdrawn(), start, end),
      main.queryFilter(main.filters.RoyaltyWithdrawn(), start, end),
    ]));
    for (const e of dep) events.push({ type: "Deposited", block: e.blockNumber, orderId: Number(e.args.orderId), slot: Number(e.args.slotNumber), user: e.args.user });
    for (const e of rw) events.push({ type: "RewardWithdrawn", block: e.blockNumber, user: e.args.user, amount: e.args.amount });
    for (const e of ry) events.push({ type: "RoyaltyWithdrawn", block: e.blockNumber, user: e.args.user, amount: e.args.amount });
    if (((start - from) / chunk) % 20 === 0) log(`  ... ${start} / ${to}`);
  }
  events.sort((a, b) => a.block - b.block);
  const legacy = events.filter((e) => e.type === "Deposited" && e.orderId < legacyMaxOrderId);
  const withdrawals = events.filter((e) => e.type !== "Deposited");
  const first = events[0];
  return { events, legacy, withdrawals, first, safeLastBlock: first ? first.block - 1 : to };
}

module.exports = { findSafeBlock };

if (require.main === module) {
  (async () => {
    const { ethers } = hre;
    if (!process.env.MAIN_ADDRESS) throw new Error("Set MAIN_ADDRESS in .env");
    const from = Number(process.env.FROM_BLOCK);
    if (!from) throw new Error('Set FROM_BLOCK (chain_state.last_block + 1)');
    const main = await ethers.getContractAt("CrazyBitsMain", process.env.MAIN_ADDRESS);
    const to = await ethers.provider.getBlockNumber();
    console.log(`Scanning blocks ${from} to ${to} ...`);

    const r = await findSafeBlock({ ethers, main, from, to });
    console.log(`\nTotal events: ${r.events.length} (Deposited ${r.events.length - r.withdrawals.length}, Withdraw ${r.withdrawals.length})`);

    if (r.legacy.length) {
      console.log("\nWARNING: deposits of old DB orders (id < 50) are in this range (still pending in the DB):");
      for (const e of r.legacy) console.log(`  order ${e.orderId} | slot ${e.slot} | block ${e.block} | ${e.user}`);
    } else {
      console.log("No deposits of old DB orders (id < 50) are in this range => the pending orders had been skipped.");
    }
    if (r.withdrawals.length) {
      console.log("\nWithdraw events (still pending in the DB):");
      for (const e of r.withdrawals) console.log(`  ${e.type} | block ${e.block} | ${e.user} | ${ethers.formatUnits(e.amount, 18)}`);
    }

    if (r.first) console.log(`\nFirst event block: ${r.first.block} (${r.first.type})`);
    console.log(`\nSAFE last_block = ${r.safeLastBlock}`);
    console.log(`SQL: UPDATE chain_state SET last_block = ${r.safeLastBlock};`);
    if (r.legacy.length) console.log("Since there are deposits of old orders, do not run the SQL above; first sync from those blocks (the lowest one).");
  })().catch((e) => { console.error(e); process.exitCode = 1; });
}