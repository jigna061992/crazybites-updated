// Run (PowerShell):
//   $env:USER_ADDR="0x...Heena's address"
//   npx hardhat run scripts/trigger-rank.js --network bscTestnet
// Calls Main.checkRank(user) (anyone can do this) and then prints the rank report.
const hre = require("hardhat");
require("dotenv").config();
const { report } = require("./check-rank.js");

async function run(ethers, mainAddress, user) {
  const main = await ethers.getContractAt("CrazyBitsMain", mainAddress);
  console.log("Calling checkRank ...");
  const tx = await main.checkRank(user);
  await tx.wait();
  console.log("Tx:", tx.hash, "\n");
  await report(ethers, mainAddress, user);
}

module.exports = { run };

if (require.main === module) {
  const user = process.env.USER_ADDR;
  if (!hre.ethers.isAddress(user || "")) throw new Error("Set USER_ADDR");
  if (!process.env.MAIN_ADDRESS) throw new Error("Set MAIN_ADDRESS in .env");
  run(hre.ethers, process.env.MAIN_ADDRESS, user).catch((e) => { console.error(e); process.exitCode = 1; });
}