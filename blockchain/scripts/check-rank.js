// Run (PowerShell):
//   $env:USER_ADDR="0x...Heena's MetaMask address"
//   npx hardhat run scripts/check-rank.js --network bscTestnet
// MAIN_ADDRESS is required in blockchain/.env.
const hre = require("hardhat");
require("dotenv").config();

async function report(ethers, mainAddress, user) {
  const main = await ethers.getContractAt("CrazyBitsMain", mainAddress);
  const rank = await ethers.getContractAt("RankModule", await main.rank());
  const usdt = (v) => Number(ethers.formatUnits(v, 18));
  const day = (t) => (t > 0n ? new Date(Number(t) * 1000).toISOString().slice(0, 10) : "-");

  const [direct, team, directAt, teamAt, joined, highest, current, pool, wal] = await Promise.all([
    rank.directCount(user), rank.teamCount(user), rank.directAtSince(user), rank.teamAtSince(user),
    rank.joinedAt(user), main.highestSlot(user), rank.currentRank(user), main.rankPool(), main.wallets(user),
  ]);
  const sinceDirect = direct - directAt;
  const sinceTeam = team - teamAt;
  const now = BigInt(Math.floor(Date.now() / 1000));

  console.log("User            :", user);
  console.log("Joining date    :", day(joined), "(slot 1 activation)");
  console.log("Direct / Team   :", String(direct), "/", String(team), "(current window: " + sinceDirect + " / " + sinceTeam + ")");
  console.log("Highest slot    :", String(highest));
  console.log("Current rank    :", Number(current) === 0 ? "None" : (await rank.ranks(Number(current) - 1)).name);
  console.log("Reward / Royalty wallet:", usdt(wal[0]), "/", usdt(wal[1]), "USDT");
  console.log("Rank pool (Main):", usdt(pool), "USDT\n");

  const n = Number(await rank.rankCount());
  for (let i = 0; i < n; i++) {
    const c = await rank.ranks(i);
    const rDone = await rank.rewardDone(user, i);
    const yDone = await rank.royaltyDone(user, i);
    const deadline = joined + BigInt(c.monthsLimit) * 30n * 86400n;
    const met = sinceDirect >= c.directNeeded && sinceTeam >= c.teamNeeded && highest >= c.slotNeeded;
    const need = usdt(c.reward) + (usdt(c.reward) * Number(c.royaltyPct)) / 100;

    console.log(`--- ${c.name} ---`);
    console.log(`  Direct ${sinceDirect}/${c.directNeeded} | Team ${sinceTeam}/${c.teamNeeded} | Slot ${highest}/${c.slotNeeded}`);
    console.log(`  Deadline: ${day(deadline)} ${now <= deadline ? "(active)" : "(passed - only royalty is received)"}`);
    console.log(`  Reward received: ${rDone ? "YES" : "NO"} | Royalty received: ${yDone ? "YES" : "NO"}`);
    if (!rDone && met) {
      console.log(
        usdt(pool) < need
          ? `  >>> Conditions are met but the POOL is too low (need ${need}, pool ${usdt(pool)}). Run fund-rank-pool.js, then checkRank.`
          : "  >>> Conditions are met and the pool is sufficient, but the rank has not been awarded yet. Call checkRank(user) on Main."
      );
    }
  }
}

module.exports = { report };

if (require.main === module) {
  const user = process.env.USER_ADDR;
  if (!hre.ethers.isAddress(user || "")) throw new Error("Set USER_ADDR (Heena's address)");
  if (!process.env.MAIN_ADDRESS) throw new Error("Set MAIN_ADDRESS in .env");
  report(hre.ethers, process.env.MAIN_ADDRESS, user).catch((e) => { console.error(e); process.exitCode = 1; });
}