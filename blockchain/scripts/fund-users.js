//this script for give tBNB n USDT to new refer users
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const { ethers } = hre;
  const list = (process.env.ADDRS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.length) throw new Error("ADDRS is empty");

  const [deployer] = await ethers.getSigners(); // Company
  const usdt = await ethers.getContractAt("MockUSDT", process.env.USDT_ADDRESS);

  for (const to of list) {
    if (!ethers.isAddress(to)) throw new Error("Wrong address: " + to);

    let tx = await deployer.sendTransaction({ to, value: ethers.parseEther("0.002") });
    await tx.wait();

    tx = await usdt.mint(to, ethers.parseUnits("1000", 18));
    await tx.wait();

    console.log("OK:", to);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });