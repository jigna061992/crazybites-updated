const hre = require("hardhat");

async function main() {
  const usdt = await hre.ethers.getContractAt("MockUSDT", process.env.USDT_ADDRESS);
  const amount = hre.ethers.parseUnits("1000", 18);

  const targets = [
    "0x9423df345d35E27f204a839C6038A9865C38D7Ef",
  ];

  for (const to of targets) {
    if (!hre.ethers.isAddress(to)) {
      throw new Error("Address સાચું નથી: " + to);
    }
    const tx = await usdt.mint(to, amount);
    await tx.wait();
    console.log("Minted 1000 USDT to:", to);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });