// Brings the leftover tBNB in the test wallets back to the company wallet.
//   npx hardhat run scripts/rank-test-sweep.js --network bscTestnet
// It only touches wallets that have already been activated (not the incomplete ones). The wallet pays its own gas, so it works even if the company has no tBNB.
const fs = require("fs");
const hre = require("hardhat");
require("dotenv").config();

async function sweepLeftover({ ethers, main, funder, wallets, log = console.log }) {
  const fee = await ethers.provider.getFeeData();
  const price = fee.gasPrice ?? fee.maxFeePerGas ?? 1_000_000_000n;
  const fees = price * 21000n * 2n;            // 2x headroom (in case the price rises in between)
  let total = 0n, count = 0;

  for (const w of wallets) {
    const signer = new ethers.Wallet(w.privateKey, ethers.provider);
    if (!(await main.slotActive(signer.address, 1))) continue;      // do not touch incomplete wallets
    const bal = await ethers.provider.getBalance(signer.address);
    if (bal <= fees * 2n) continue;                                 // dust, not worth taking back
    try {
      const tx = await signer.sendTransaction({ to: funder.address, value: bal - fees, gasLimit: 21000n, gasPrice: price });
      await tx.wait();
      total += bal - fees; count++;
    } catch (e) {
      log(`  (sweep ${w.id}) skip: ${String(e?.shortMessage || e?.message || e).slice(0, 80)}`);
    }
  }
  log(`Sweep: ${ethers.formatEther(total)} tBNB came back to the company from ${count} wallets.`);
  return total;
}

module.exports = { sweepLeftover };

if (require.main === module) {
  (async () => {
    const { ethers } = hre;
    if (!process.env.MAIN_ADDRESS) throw new Error("Set MAIN_ADDRESS in .env");
    if (!fs.existsSync("rank-test-wallets.json")) throw new Error("rank-test-wallets.json not found.");
    const wallets = JSON.parse(fs.readFileSync("rank-test-wallets.json", "utf8"));
    const [funder] = await ethers.getSigners();
    const main = await ethers.getContractAt("CrazyBitsMain", process.env.MAIN_ADDRESS);
    console.log("Company tBNB (before):", ethers.formatEther(await ethers.provider.getBalance(funder.address)));
    await sweepLeftover({ ethers, main, funder, wallets });
    console.log("Company tBNB (after) :", ethers.formatEther(await ethers.provider.getBalance(funder.address)));
  })().catch((e) => { console.error(e); process.exitCode = 1; });
}