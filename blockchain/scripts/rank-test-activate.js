// STEP 3 - Activates all the users on the chain, matching the DB orders (Laravel ranktest:seed).
//   npx hardhat run scripts/rank-test-activate.js --network bscTestnet
// Required files (in the blockchain folder): rank-test-wallets.json, rank-test-orders.json
// .env: MAIN_ADDRESS, DEPLOYER_KEY (company), HEENA_KEY (Heena's key - for slots 6..10; if you don't have it, do it from the app)
// Safe to re-run: anything that is already activated is skipped.
const fs = require("fs");
const hre = require("hardhat");
require("dotenv").config();
const { report } = require("./check-rank.js");
const { sweepLeftover } = require("./rank-test-sweep.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, label, tries = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tries) throw e;
      console.log(`  (${label}) retry ${i}/${tries - 1}: ${String(e?.shortMessage || e?.message || e).slice(0, 90)}`);
      await sleep(3000 * i);
    }
  }
}

async function activatePlan(ctx) {
  const { ethers, main, rank, usdt, funder, heena, wallets, orders, rankIndex = 1, log = console.log } = ctx;
  const mainAddr = await main.getAddress();
  const E = (n) => ethers.parseUnits(String(n), 18);
  const heenaAddr = (heena ? heena.address : orders.heena.address);
  const cfg = await rank.ranks(rankIndex);
  const slotNeeded = Number(cfg.slotNeeded);
  log(`\n=== ${cfg.name}: ${cfg.directNeeded} direct, ${cfg.teamNeeded} team, slot ${slotNeeded} ===`);

  // The earlier ranks must already have been received (counting starts from a fresh window only after a rank is received)
  for (let i = 0; i < rankIndex; i++) {
    if (!(await rank.rewardDone(heenaAddr, i))) {
      throw new Error(`${(await rank.ranks(i)).name} must be received by Heena first. Run check-rank.js / trigger-rank.js.`);
    }
  }
  if (await rank.rewardDone(heenaAddr, rankIndex)) {
    log(`Heena has already received ${cfg.name}. Nothing to do.`);
    return Number(await rank.currentRank(heenaAddr));
  }

  // The gas amount is calculated each time from the CURRENT gas price (still works if the price rises in between), with 2x headroom
  async function ensureGas(addr, gasUnits) {
    await retry(async () => {
      const fee = await ethers.provider.getFeeData();
      const price = fee.maxFeePerGas ?? fee.gasPrice ?? 1_000_000_000n;
      const need = price * gasUnits * 2n;
      const have = await ethers.provider.getBalance(addr);
      if (have >= need) return;
      await (await funder.sendTransaction({ to: addr, value: need - have })).wait();
    }, "gas");
  }
  async function ensureSlot(signer, slot, sponsorAddr, orderId) {
    await retry(async () => {
      if (await main.slotActive(signer.address, slot)) return;
      const price = await main.slotPrice(slot - 1);
      if ((await usdt.balanceOf(signer.address)) < price) await (await usdt.connect(funder).mint(signer.address, price)).wait();
      if ((await usdt.allowance(signer.address, mainAddr)) < price) await (await usdt.connect(signer).approve(mainAddr, price)).wait();
      await (await main.connect(signer).activateSlot(slot, sponsorAddr, orderId)).wait();
    }, `slot ${slot}`);
  }

  // 1) Heena's slots (with the DB order id, so they also sync to the DB)
  if (heena) {
    await ensureGas(heena.address, 10_000_000n);
    for (let s = 1; s <= slotNeeded; s++) {
      if (await main.slotActive(heenaAddr, s)) continue;
      const orderId = orders.heena?.slots?.[String(s)];
      if (!orderId) throw new Error(`There is no DB order for Heena's slot ${s}. Run Laravel ranktest:seed again (--slots=${slotNeeded}).`);
      log(`Heena slot ${s} activate (order ${orderId}) ...`);
      await ensureSlot(heena, s, ethers.ZeroAddress, orderId);
    }
  } else if (!(await main.slotActive(heenaAddr, slotNeeded))) {
    log(`WARNING: Heena's slot ${slotNeeded} is not active and HEENA_KEY is not Heena's key. Activate up to slot ${slotNeeded} from the app's Investment page.`);
  }

  // 2) Rank pool
  const need = cfg.reward + (cfg.reward * cfg.royaltyPct) / 100n;
  const pool = await main.rankPool();
  if (pool < need) {
    const add = need - pool + E(100);
    log(`Rank pool is low, need to add ${ethers.formatUnits(add, 18)} USDT ...`);
    await retry(async () => {
      await (await usdt.connect(funder).mint(funder.address, add)).wait();
      await (await usdt.connect(funder).approve(mainAddr, add)).wait();
      await (await main.connect(funder).fundRankPool(add)).wait();
    }, "pool");
  }

  // 3) All users: directs first, then the ones below them (in the order of the file)
  const byId = Object.fromEntries(wallets.map((w) => [w.id, w]));
  let n = 0;
  for (const w of wallets) {
    n++;
    const signer = new ethers.Wallet(w.privateKey, ethers.provider);
    if (await main.slotActive(signer.address, 1)) continue;
    const orderId = orders.users?.[w.id];
    if (!orderId) throw new Error(`There is no DB order for ${w.id}. Run Laravel ranktest:seed.`);
    const sponsorAddr = w.parent === "heena" ? heenaAddr : byId[w.parent].address;
    await ensureGas(signer.address, 1_500_000n);
    await ensureSlot(signer, 1, sponsorAddr, orderId);
    log(`  ${w.id} activated (sponsor: ${w.parent}, order ${orderId})  [${n}/${wallets.length}]`);
  }

  // 4) checkRank
  for (let k = 0; k < 4; k++) {
    if (Number(await rank.currentRank(heenaAddr)) >= rankIndex + 1) break;
    log("Calling checkRank ...");
    await retry(async () => { await (await main.connect(funder).checkRank(heenaAddr)).wait(); }, "checkRank");
  }
  return Number(await rank.currentRank(heenaAddr));
}

module.exports = { activatePlan };

if (require.main === module) {
  (async () => {
    const { ethers } = hre;
    if (!process.env.MAIN_ADDRESS) throw new Error("Set MAIN_ADDRESS in .env");
    for (const f of ["rank-test-wallets.json", "rank-test-orders.json"]) {
      if (!fs.existsSync(f)) throw new Error(`${f} not found. Do step 1 and step 2 first.`);
    }
    const wallets = JSON.parse(fs.readFileSync("rank-test-wallets.json", "utf8"));
    const orders = JSON.parse(fs.readFileSync("rank-test-orders.json", "utf8"));
    const rankIndex = Number(process.env.RANK_INDEX ?? 1);

    const signers = await ethers.getSigners();
    const funder = signers[0];                                             // DEPLOYER_KEY = company
    const heena = signers.find((s) => s.address.toLowerCase() === String(orders.heena.address).toLowerCase()) || null;
    console.log(`Heena: ${orders.heena.username} (${orders.heena.address})`);
    if (!heena) console.log("Note: HEENA_KEY is not Heena's key => the script will not buy Heena's slots (do it from the app).");

    const main = await ethers.getContractAt("CrazyBitsMain", process.env.MAIN_ADDRESS);
    const rank = await ethers.getContractAt("RankModule", await main.rank());
    const usdt = await ethers.getContractAt("MockUSDT", await main.usdt());

    const fee = await ethers.provider.getFeeData();
    const gp = fee.maxFeePerGas ?? fee.gasPrice ?? 1_000_000_000n;
    const needWei = gp * 1_500_000n * BigInt(wallets.length) + gp * 10_000_000n * 2n;
    const bal = await ethers.provider.getBalance(funder.address);
    console.log(`Company tBNB: ${ethers.formatEther(bal)} | approx. needed: ${ethers.formatEther(needWei)}`);
    if (bal < needWei) console.log("WARNING: tBNB looks low. If it stops midway, run it again; it will continue from where it stopped.");

    const level = await activatePlan({ ethers, main, rank, usdt, funder, heena, wallets, orders, rankIndex });
    console.log(`\nHeena's current rank index: ${level}\n`);
    if (level >= rankIndex + 1) {
      try { await sweepLeftover({ ethers, main, funder, wallets }); } catch (e) { console.log("Sweep skip:", e?.shortMessage || e?.message); }
    }
    await report(ethers, process.env.MAIN_ADDRESS, orders.heena.address);
    console.log("\nNow in the backend: php artisan chain:sync  (repeatedly, until all deposits are processed)  then  php artisan ranks:check");
  })().catch((e) => { console.error(e); process.exitCode = 1; });
}