
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [jigna, heena] = await ethers.getSigners();

  const usdt = await ethers.getContractAt(
    "MockUSDT",
    process.env.USDT_ADDRESS
  );

  const decimals = await usdt.decimals();

  console.log("USDT address:", await usdt.getAddress());
  console.log("Decimals:", decimals);

  console.log("Jigna wallet:", jigna.address);
  console.log("Heena wallet:", heena.address);

  const jignaBalance = await usdt.balanceOf(jigna.address);
  const heenaBalance = await usdt.balanceOf(heena.address);

  console.log(
    "Jigna balance:",
    ethers.formatUnits(jignaBalance, decimals)
  );

  console.log(
    "Heena balance:",
    ethers.formatUnits(heenaBalance, decimals)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
