// run: npx hardhat run scripts/deploy-main.js --network bscTestnet
// signers order(according to hardhat.config.js ): [0]=DEPLOYER=Company, [1]=JIGNA (root)
//  3 module in Main Contract  (Matrix, RewardRoyalty, Rank) - deploy.
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  if (signers.length < 2) throw new Error(".env માં DEPLOYER_KEY અને JIGNA_KEY (બંને) જોઈએ");
  const [deployer, jigna] = signers;

  // use address form .env for USDT_ADDRESS  , otherwise new  MockUSDT
  let usdtAddr = process.env.USDT_ADDRESS;
  if (!usdtAddr || !ethers.isAddress(usdtAddr)) {
    const usdt = await ethers.deployContract("MockUSDT");
    await usdt.waitForDeployment();
    usdtAddr = await usdt.getAddress();
    console.log("નવો MockUSDT deploy થયો");
  }

  console.log("Company (deployer):", deployer.address);
  console.log("Jigna (root)       :", jigna.address);

  const main = await ethers.deployContract("CrazyBitsMain", [usdtAddr, deployer.address, jigna.address]);
  await main.waitForDeployment();
  const mainAddr = await main.getAddress();
  const block = (await main.deploymentTransaction().wait()).blockNumber;

  const [matrixAddr, rewardsAddr, rankAddr] = await Promise.all([main.matrix(), main.rewards(), main.rank()]);

  console.log("\n====keep or store this  values ====");
  console.log("MockUSDT              :", usdtAddr);
  console.log("CrazyBitsMain (MAIN)  :", mainAddr);
  console.log("  MatrixModule        :", matrixAddr);
  console.log("  RewardRoyaltyModule :", rewardsAddr);
  console.log("  RankModule          :", rankAddr);
  console.log("Deploy block          :", block);
  console.log("\nblockchain/.env  → USDT_ADDRESS=" + usdtAddr);
  console.log("Laravel .env     → CHAIN_VAULT_ADDRESS=" + mainAddr.toLowerCase());
  console.log("Laravel .env     → CHAIN_START_BLOCK=" + block);
  console.log("React .env       → VITE_USDT_ADDRESS=" + usdtAddr);
  console.log("React .env       → VITE_VAULT_ADDRESS=" + mainAddr);
  console.log("React .env       → VITE_MATRIX_ADDRESS=" + mainAddr);
  console.log("chain_state      → last_block = " + (block - 1));
  console.log("\nRank reward mate: Main.fundRankPool(amount) thi USDT pool bharo (pehla USDT approve).");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
