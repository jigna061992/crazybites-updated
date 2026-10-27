// Run: npx hardhat run scripts/fund-rank-pool.js --network bscTestnet
// Required in blockchain/.env: USDT_ADDRESS, MAIN_ADDRESS (address of CrazyBitsMain)
// signer [0] = DEPLOYER_KEY (company wallet)
const hre = require("hardhat");
require("dotenv").config();

const AMOUNT_USDT = "5000";   // how much USDT to put into the rank pool

async function main() {
  const { ethers } = hre;
  if (!process.env.MAIN_ADDRESS) throw new Error("Set MAIN_ADDRESS (CrazyBitsMain address) in .env");

  const [company] = await ethers.getSigners();
  const usdt = await ethers.getContractAt("MockUSDT", process.env.USDT_ADDRESS);
  const main = await ethers.getContractAt("CrazyBitsMain", process.env.MAIN_ADDRESS);
  const mainAddr = await main.getAddress();
  const amount = ethers.parseUnits(AMOUNT_USDT, 18);

  // TESTNET: anyone can mint for free on MockUSDT (this does not work with real USDT)
  if ((await usdt.balanceOf(company.address)) < amount) {
    await (await usdt.mint(company.address, amount)).wait();
    console.log("Minted:", AMOUNT_USDT, "USDT ->", company.address);
  }

  await (await usdt.approve(mainAddr, amount)).wait();
  await (await main.fundRankPool(amount)).wait();

  console.log("Added to rank pool :", AMOUNT_USDT, "USDT");
  console.log("Current rankPool   :", ethers.formatUnits(await main.rankPool(), 18), "USDT");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });