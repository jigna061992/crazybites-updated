// STEP 1 - create the wallets file (it only creates a file, it does not touch the chain / DB)
//   npx hardhat run scripts/rank-test-wallets.js
// Gold: 10 direct + 100 team => 10 users under Heena, and 9 under each of them (100 in total).
// If you need a different size:  $env:DIRECTS="10"; $env:TEAM="100"
// Output: rank-test-wallets.json  (private keys of the TESTNET wallets - do not put in git)
const fs = require("fs");
const { Wallet } = require("ethers");

function generateWallets({ directs = 10, team = 100 } = {}) {
  if (team < directs) throw new Error("TEAM must not be smaller than DIRECTS");
  const list = [];
  const add = (parent) => {
    const w = Wallet.createRandom();
    list.push({ id: `u${list.length + 1}`, address: w.address, privateKey: w.privateKey, parent });
  };
  for (let i = 0; i < directs; i++) add("heena");                          // 10 direct (under Heena)
  for (let j = 0; j < team - directs; j++) add(`u${1 + (j % directs)}`);   // the rest go under the directs
  return list;
}

module.exports = { generateWallets };

if (require.main === module) {
  const file = process.env.FILE || "rank-test-wallets.json";
  if (fs.existsSync(file) && !process.env.FORCE) {
    console.log(`${file} already exists. It will be used as is (no new wallets). Set FORCE=1 if you want a new file.`);
    process.exit(0);
  }
  const directs = Number(process.env.DIRECTS || 10);
  const team = Number(process.env.TEAM || 100);
  const list = generateWallets({ directs, team });
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
  console.log(`${list.length} wallets created (${directs} direct + ${team - directs} under them) => ${file}`);
}