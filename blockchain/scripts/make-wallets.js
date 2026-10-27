const { Wallet } = require("ethers");
const fs = require("fs");

const count = Number(process.argv[2] || 30);
const wallets = Array.from({ length: count }, () => {
  const w = Wallet.createRandom();
  return { address: w.address.toLowerCase(), privateKey: w.privateKey };
});

fs.writeFileSync("wallets.json", JSON.stringify(wallets, null, 2));
console.log(`${count} test wallets -> wallets.json`);